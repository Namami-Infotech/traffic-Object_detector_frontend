export interface TrackedObject {
  id: number;
  label: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  prevBbox?: [number, number, number, number]; // Previous frame bbox for full body clearance tracking
  centroid: [number, number]; // [cx, cy]
  trajectory: Array<[number, number]>;
  disappeared: number;
  isStationary: boolean;
  isCrossing?: boolean; // True when bounding box intersects/straddles the virtual line
  fullBodyCrossed?: boolean; // True when entire body has cleared the line
  crossedIn: boolean;
  crossedOut: boolean;
  lastCrossedTimestamp?: number;
  labelVotes?: Record<string, number>;
  loggedToDb?: boolean;
}

export interface LineConfig {
  orientation: 'HORIZONTAL' | 'VERTICAL';
  positionPercent: number; // 10 to 90 %
}

export interface LineCrossingEvent {
  id: number;
  label: string;
  score: number;
  timestamp: number;
}

// Supported countable classes requested by user: CAR, BUS, MOTORCYCLE, PERSON, TRUCK (and bicycle)
export const COUNTABLE_CLASSES: string[] = ['car', 'bus', 'motorcycle', 'person', 'truck', 'bicycle'];

export class CentroidTracker {
  private nextObjectId: number = 1;
  public trackedObjects: Map<number, TrackedObject> = new Map();
  private maxDisappeared: number = 25; // max frames object can disappear before removal
  private maxDistance: number = 80; // max pixel distance between frames to match same object
  private lastLineConfigKey?: string;

  public update(
    predictions: Array<{ bbox: [number, number, number, number]; class: string; score: number }>,
    lineConfig: LineConfig,
    canvasWidth: number,
    canvasHeight: number
  ): {
    objects: TrackedObject[];
    inEvents: LineCrossingEvent[];
    outEvents: LineCrossingEvent[];
    detectionEvents: LineCrossingEvent[];
  } {
    const inEvents: LineCrossingEvent[] = [];
    const outEvents: LineCrossingEvent[] = [];
    const detectionEvents: LineCrossingEvent[] = [];

    // Reset crossed flags if user changed line orientation or position
    const currentLineKey = `${lineConfig.orientation}-${lineConfig.positionPercent}`;
    if (this.lastLineConfigKey && this.lastLineConfigKey !== currentLineKey) {
      this.trackedObjects.forEach((obj) => {
        obj.crossedIn = false;
        obj.crossedOut = false;
        obj.isCrossing = false;
        obj.fullBodyCrossed = false;
      });
    }
    this.lastLineConfigKey = currentLineKey;

    // Calculate line coordinate
    const lineCoord =
      lineConfig.orientation === 'HORIZONTAL'
        ? (canvasHeight * lineConfig.positionPercent) / 100
        : (canvasWidth * lineConfig.positionPercent) / 100;

    // 1. If no predictions in this frame, increment disappeared for all
    if (predictions.length === 0) {
      this.trackedObjects.forEach((obj, id) => {
        obj.disappeared += 1;
        if (obj.disappeared > this.maxDisappeared) {
          this.trackedObjects.delete(id);
        }
      });
      return { objects: Array.from(this.trackedObjects.values()), inEvents, outEvents, detectionEvents };
    }

    // 2. Prepare new frame centroids
    const inputCentroids: Array<{
      centroid: [number, number];
      bbox: [number, number, number, number];
      label: string;
      score: number;
    }> = predictions.map((pred) => {
      const [x, y, w, h] = pred.bbox;
      return {
        centroid: [x + w / 2, y + h / 2],
        bbox: pred.bbox,
        label: pred.class.toLowerCase(),
        score: pred.score,
      };
    });

    // 3. If no existing tracked objects, register all input centroids as new objects
    if (this.trackedObjects.size === 0) {
      inputCentroids.forEach((item) => {
        this.registerObject(item);
      });
      return { objects: Array.from(this.trackedObjects.values()), inEvents, outEvents, detectionEvents };
    }

    // 4. Match existing tracked objects with new input centroids using Euclidean distance
    const objectIds = Array.from(this.trackedObjects.keys());
    const existingObjects = objectIds.map((id) => this.trackedObjects.get(id)!);

    this.maxDistance = Math.max(180, Math.round(canvasWidth * 0.25));

    // Build distance matrix
    const distances: number[][] = [];
    for (let i = 0; i < existingObjects.length; i++) {
      const row: number[] = [];
      const [ex, ey] = existingObjects[i].centroid;
      for (let j = 0; j < inputCentroids.length; j++) {
        const [nx, ny] = inputCentroids[j].centroid;
        const dist = Math.hypot(nx - ex, ny - ey);
        row.push(dist);
      }
      distances.push(row);
    }

    // Pair up minimum distances greedy matching
    const usedExistingIndices = new Set<number>();
    const usedInputIndices = new Set<number>();

    // Sort distance pairs
    const pairs: Array<{ existingIdx: number; inputIdx: number; dist: number }> = [];
    for (let i = 0; i < existingObjects.length; i++) {
      for (let j = 0; j < inputCentroids.length; j++) {
        pairs.push({ existingIdx: i, inputIdx: j, dist: distances[i][j] });
      }
    }
    pairs.sort((a, b) => a.dist - b.dist);

    for (const pair of pairs) {
      if (usedExistingIndices.has(pair.existingIdx) || usedInputIndices.has(pair.inputIdx)) {
        continue;
      }
      if (pair.dist > this.maxDistance) {
        continue; // Distance too large, not the same object
      }

      usedExistingIndices.add(pair.existingIdx);
      usedInputIndices.add(pair.inputIdx);

      const objId = objectIds[pair.existingIdx];
      const obj = this.trackedObjects.get(objId)!;
      const newInput = inputCentroids[pair.inputIdx];

      // Store previous bounding box and centroid for full-body line crossing detection
      const prevBbox = obj.bbox;
      const currBbox = newInput.bbox;
      const [prevX, prevY] = obj.centroid;
      const [currX, currY] = newInput.centroid;

      // Update object state
      obj.prevBbox = prevBbox;
      obj.bbox = currBbox;
      obj.centroid = newInput.centroid;
      obj.score = Math.max(obj.score, newInput.score);
      obj.disappeared = 0;
      obj.trajectory.push([currX, currY]);
      if (obj.trajectory.length > 25) {
        obj.trajectory.shift();
      }

      // Record label vote & resolve true object class
      if (!obj.labelVotes) {
        obj.labelVotes = { [obj.label]: 1 };
      }
      obj.labelVotes[newInput.label] = (obj.labelVotes[newInput.label] || 0) + 1;

      // CLASS RESOLUTION:
      // High-accuracy resolution between vehicles and pedestrians:
      // If a pedestrian ('person') has strong votes, preserve 'person'.
      // If vehicle classes (car, truck, bus, motorcycle) appear, prioritize vehicle unless pedestrian has >= 2.5x votes,
      // avoiding driver/windshield misidentification while preserving walking pedestrians.
      const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
      const vehicleVotes = Object.entries(obj.labelVotes)
        .filter(([lbl]) => VEHICLE_CLASSES.includes(lbl))
        .sort((a, b) => b[1] - a[1]);
      const personVotes = obj.labelVotes['person'] || 0;

      if (personVotes > 0 && (!vehicleVotes.length || personVotes >= vehicleVotes[0][1] * 2.5)) {
        obj.label = 'person';
      } else if (vehicleVotes.length > 0) {
        obj.label = vehicleVotes[0][0];
      } else if (newInput.score >= obj.score || obj.label === 'person') {
        obj.label = newInput.label;
      }

      // Confirmed Vehicle/Pedestrian Detection Event:
      // When stably tracked for >= 2 frames, emit detection event once to save into DB
      if (!obj.loggedToDb && obj.trajectory.length >= 2) {
        obj.loggedToDb = true;
        detectionEvents.push({
          id: obj.id,
          label: obj.label,
          score: obj.score,
          timestamp: Date.now(),
        });
      }

      // Check if stationary / stable (movement less than 6px in recent 6 trajectory points)
      if (obj.trajectory.length >= 6) {
        const recent = obj.trajectory.slice(-6);
        const totalMovement = recent.reduce((sum, pt, idx) => {
          if (idx === 0) return 0;
          const prev = recent[idx - 1];
          return sum + Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
        }, 0);
        obj.isStationary = totalMovement < 6;
      }

      // =========================================================================
      // FULL-BODY VIRTUAL LINE CROSSING DETECTION (CAR, BUS, MOTORCYCLE, PERSON, TRUCK)
      // Only count IN/OUT when the ENTIRE BODY (trailing edge of bbox) has completely
      // crossed past the virtual line.
      // =========================================================================
      const now = Date.now();
      const isTargetClass = COUNTABLE_CLASSES.includes(obj.label.toLowerCase());

      if (lineConfig.orientation === 'HORIZONTAL') {
        // Horizontal Line (at Y = lineCoord)
        const prevTop = prevBbox[1];
        const prevBottom = prevBbox[1] + prevBbox[3];
        const currTop = currBbox[1];
        const currBottom = currBbox[1] + currBbox[3];

        // Straddling check: Any part of the body currently touching/crossing the line
        const isStraddling = currTop <= lineCoord && currBottom >= lineCoord;
        obj.isCrossing = isStraddling;

        // Trajectory start displacement & frame displacement
        const startY = obj.trajectory[0][1];
        const netDY = currY - startY;
        const dY = currY - prevY;

        // --- 1. TRAVELING DOWNWARDS (TOP TO BOTTOM -> IN) ---
        // Must originate from above line, actually be moving downwards (netDY >= 8),
        // and full body (top trailing edge) must have completely cleared past lineCoord!
        const originatedAbove = startY < lineCoord || obj.trajectory.slice(0, 3).some((pt) => pt[1] < lineCoord);
        const isTravelingDown = dY >= -1 && netDY >= 8;
        const fullBodyPassedDown = currTop >= lineCoord - 2; // Entire body is now below line
        const wasNotFullyPassedDown = prevTop < lineCoord; // Trailing edge was previously above line

        if (
          isTargetClass &&
          !obj.isStationary &&
          !obj.crossedIn &&
          originatedAbove &&
          isTravelingDown &&
          fullBodyPassedDown &&
          wasNotFullyPassedDown
        ) {
          obj.crossedIn = true;
          obj.crossedOut = false;
          obj.fullBodyCrossed = true;
          obj.isCrossing = false;
          obj.lastCrossedTimestamp = now;
          inEvents.push({ id: obj.id, label: obj.label, score: obj.score, timestamp: now });
        }
        // --- 2. TRAVELING UPWARDS (BOTTOM TO TOP -> OUT) ---
        // Must originate from below line, actually be moving upwards (netDY <= -8),
        // and full body (bottom trailing edge) must have completely cleared past lineCoord!
        else {
          const originatedBelow = startY > lineCoord || obj.trajectory.slice(0, 3).some((pt) => pt[1] > lineCoord);
          const isTravelingUp = dY <= 1 && netDY <= -8;
          const fullBodyPassedUp = currBottom <= lineCoord + 2; // Entire body is now above line
          const wasNotFullyPassedUp = prevBottom > lineCoord; // Trailing edge was previously below line

          if (
            isTargetClass &&
            !obj.isStationary &&
            !obj.crossedOut &&
            originatedBelow &&
            isTravelingUp &&
            fullBodyPassedUp &&
            wasNotFullyPassedUp
          ) {
            obj.crossedOut = true;
            obj.crossedIn = false;
            obj.fullBodyCrossed = true;
            obj.isCrossing = false;
            obj.lastCrossedTimestamp = now;
            outEvents.push({ id: obj.id, label: obj.label, score: obj.score, timestamp: now });
          }
        }
      } else {
        // Vertical Line (at X = lineCoord)
        const prevLeft = prevBbox[0];
        const prevRight = prevBbox[0] + prevBbox[2];
        const currLeft = currBbox[0];
        const currRight = currBbox[0] + currBbox[2];

        // Straddling check: Any part of the body currently touching/crossing the line
        const isStraddling = currLeft <= lineCoord && currRight >= lineCoord;
        obj.isCrossing = isStraddling;

        // Trajectory start displacement & frame displacement
        const startX = obj.trajectory[0][0];
        const netDX = currX - startX;
        const dX = currX - prevX;

        // --- 1. TRAVELING LEFT-TO-RIGHT (IN) ---
        // Must originate from left of line, actually be moving rightwards (netDX >= 8),
        // and full body (left trailing edge) must have completely cleared past lineCoord!
        const originatedLeft = startX < lineCoord || obj.trajectory.slice(0, 3).some((pt) => pt[0] < lineCoord);
        const isTravelingRight = dX >= -1 && netDX >= 8;
        const fullBodyPassedRight = currLeft >= lineCoord - 2; // Entire body is now to right of line
        const wasNotFullyPassedRight = prevLeft < lineCoord; // Trailing edge was previously to left of line

        if (
          isTargetClass &&
          !obj.isStationary &&
          !obj.crossedIn &&
          originatedLeft &&
          isTravelingRight &&
          fullBodyPassedRight &&
          wasNotFullyPassedRight
        ) {
          obj.crossedIn = true;
          obj.crossedOut = false;
          obj.fullBodyCrossed = true;
          obj.isCrossing = false;
          obj.lastCrossedTimestamp = now;
          inEvents.push({ id: obj.id, label: obj.label, score: obj.score, timestamp: now });
        }
        // --- 2. TRAVELING RIGHT-TO-LEFT (OUT) ---
        // Must originate from right of line, actually be moving leftwards (netDX <= -8),
        // and full body (right trailing edge) must have completely cleared past lineCoord!
        else {
          const originatedRight = startX > lineCoord || obj.trajectory.slice(0, 3).some((pt) => pt[0] > lineCoord);
          const isTravelingLeft = dX <= 1 && netDX <= -8;
          const fullBodyPassedLeft = currRight <= lineCoord + 2; // Entire body is now to left of line
          const wasNotFullyPassedLeft = prevRight > lineCoord; // Trailing edge was previously to right of line

          if (
            isTargetClass &&
            !obj.isStationary &&
            !obj.crossedOut &&
            originatedRight &&
            isTravelingLeft &&
            fullBodyPassedLeft &&
            wasNotFullyPassedLeft
          ) {
            obj.crossedOut = true;
            obj.crossedIn = false;
            obj.fullBodyCrossed = true;
            obj.isCrossing = false;
            obj.lastCrossedTimestamp = now;
            outEvents.push({ id: obj.id, label: obj.label, score: obj.score, timestamp: now });
          }
        }
      }
    }

    // 5. Handle unmatched existing objects (disappeared)
    for (let i = 0; i < existingObjects.length; i++) {
      if (!usedExistingIndices.has(i)) {
        const id = objectIds[i];
        const obj = this.trackedObjects.get(id)!;
        obj.disappeared += 1;
        if (obj.disappeared > this.maxDisappeared) {
          this.trackedObjects.delete(id);
        }
      }
    }

    // 6. Register unmatched new input centroids as new objects
    for (let j = 0; j < inputCentroids.length; j++) {
      if (!usedInputIndices.has(j)) {
        this.registerObject(inputCentroids[j]);
      }
    }

    return { objects: Array.from(this.trackedObjects.values()), inEvents, outEvents, detectionEvents };
  }

  private registerObject(
    item: { centroid: [number, number]; bbox: [number, number, number, number]; label: string; score: number }
  ) {
    const id = this.nextObjectId++;
    const [cx, cy] = item.centroid;

    const newObj: TrackedObject = {
      id,
      label: item.label,
      score: item.score,
      bbox: item.bbox,
      prevBbox: item.bbox,
      centroid: item.centroid,
      trajectory: [[cx, cy]],
      disappeared: 0,
      isStationary: false,
      isCrossing: false,
      fullBodyCrossed: false,
      crossedIn: false,
      crossedOut: false,
      labelVotes: { [item.label]: 1 },
    };

    this.trackedObjects.set(id, newObj);
  }

  public reset() {
    this.nextObjectId = 1;
    this.trackedObjects.clear();
  }
}

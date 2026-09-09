export interface TrackedObject {
  id: number;
  label: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  centroid: [number, number]; // [cx, cy]
  trajectory: Array<[number, number]>;
  disappeared: number;
  isStationary: boolean;
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

      // Store previous centroid for line crossing check
      const [prevX, prevY] = obj.centroid;
      const [currX, currY] = newInput.centroid;

      // Update object state
      obj.bbox = newInput.bbox;
      obj.centroid = newInput.centroid;
      obj.score = Math.max(obj.score, newInput.score);
      obj.disappeared = 0;
      obj.trajectory.push([currX, currY]);
      if (obj.trajectory.length > 20) {
        obj.trajectory.shift();
      }

      // Record label vote & resolve true object class
      if (!obj.labelVotes) {
        obj.labelVotes = { [obj.label]: 1 };
      }
      obj.labelVotes[newInput.label] = (obj.labelVotes[newInput.label] || 0) + 1;

      // VEHICLE CLASS RESOLUTION:
      // If any vehicle class is observed (car, truck, bus, motorcycle, bicycle),
      // prioritize the vehicle class over 'person' so vehicles are never misidentified as person in DB!
      const VEHICLE_CLASSES = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
      const vehicleVotes = Object.entries(obj.labelVotes)
        .filter(([lbl]) => VEHICLE_CLASSES.includes(lbl))
        .sort((a, b) => b[1] - a[1]);

      if (vehicleVotes.length > 0) {
        obj.label = vehicleVotes[0][0];
      } else if (newInput.score >= obj.score || obj.label === 'person') {
        obj.label = newInput.label;
      }

      // Confirmed Vehicle Detection Event:
      // When a vehicle is stably tracked for >= 2 frames, emit detection event once to save into DB!
      if (!obj.loggedToDb && obj.trajectory.length >= 2) {
        obj.loggedToDb = true;
        detectionEvents.push({
          id: obj.id,
          label: obj.label,
          score: obj.score,
          timestamp: Date.now(),
        });
      }

      // Check if stationary / stable (movement less than 6px in recent 8 trajectory points)
      if (obj.trajectory.length >= 8) {
        const recent = obj.trajectory.slice(-8);
        const totalMovement = recent.reduce((sum, pt, idx) => {
          if (idx === 0) return 0;
          const prev = recent[idx - 1];
          return sum + Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
        }, 0);
        obj.isStationary = totalMovement < 6;
      }

      // ACCURATE & ROBUST LINE CROSSING DETECTION (IN / OUT)
      const now = Date.now();

      if (lineConfig.orientation === 'HORIZONTAL') {
        // Vehicle traveling downwards (Top to Bottom):
        // 1) Direct crossing: prevY was above line and currY is at or below line
        // 2) Or historical trajectory started above line, now at/past lineCoord, and moving downwards
        // 3) Or bounding box intersects / passes line while moving down
        const isMovingDown = currY >= prevY - 2;
        const hadPointAbove = obj.trajectory.some((pt) => pt[1] < lineCoord);
        const bboxPassedDown = obj.bbox[1] <= lineCoord && (obj.bbox[1] + obj.bbox[3]) >= lineCoord;

        if (
          !obj.crossedIn &&
          ((prevY < lineCoord && currY >= lineCoord) ||
            (hadPointAbove && currY >= lineCoord && isMovingDown) ||
            (hadPointAbove && bboxPassedDown && isMovingDown))
        ) {
          obj.crossedIn = true;
          obj.crossedOut = false;
          obj.lastCrossedTimestamp = now;
          inEvents.push({ id: obj.id, label: obj.label, score: obj.score, timestamp: now });
        }
        // Vehicle traveling upwards (Bottom to Top):
        else {
          const isMovingUp = currY <= prevY + 2;
          const hadPointBelow = obj.trajectory.some((pt) => pt[1] > lineCoord);
          const bboxPassedUp = obj.bbox[1] <= lineCoord && (obj.bbox[1] + obj.bbox[3]) >= lineCoord;

          if (
            !obj.crossedOut &&
            ((prevY > lineCoord && currY <= lineCoord) ||
              (hadPointBelow && currY <= lineCoord && isMovingUp) ||
              (hadPointBelow && bboxPassedUp && isMovingUp))
          ) {
            obj.crossedOut = true;
            obj.crossedIn = false;
            obj.lastCrossedTimestamp = now;
            outEvents.push({ id: obj.id, label: obj.label, score: obj.score, timestamp: now });
          }
        }
      } else {
        // VERTICAL Line
        // Vehicle traveling left-to-right (IN):
        const isMovingRight = currX >= prevX - 2;
        const hadPointLeft = obj.trajectory.some((pt) => pt[0] < lineCoord);
        const bboxPassedRight = obj.bbox[0] <= lineCoord && (obj.bbox[0] + obj.bbox[2]) >= lineCoord;

        if (
          !obj.crossedIn &&
          ((prevX < lineCoord && currX >= lineCoord) ||
            (hadPointLeft && currX >= lineCoord && isMovingRight) ||
            (hadPointLeft && bboxPassedRight && isMovingRight))
        ) {
          obj.crossedIn = true;
          obj.crossedOut = false;
          obj.lastCrossedTimestamp = now;
          inEvents.push({ id: obj.id, label: obj.label, score: obj.score, timestamp: now });
        }
        // Vehicle traveling right-to-left (OUT):
        else {
          const isMovingLeft = currX <= prevX + 2;
          const hadPointRight = obj.trajectory.some((pt) => pt[0] > lineCoord);
          const bboxPassedLeft = obj.bbox[0] <= lineCoord && (obj.bbox[0] + obj.bbox[2]) >= lineCoord;

          if (
            !obj.crossedOut &&
            ((prevX > lineCoord && currX <= lineCoord) ||
              (hadPointRight && currX <= lineCoord && isMovingLeft) ||
              (hadPointRight && bboxPassedLeft && isMovingLeft))
          ) {
            obj.crossedOut = true;
            obj.crossedIn = false;
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
      centroid: item.centroid,
      trajectory: [[cx, cy]],
      disappeared: 0,
      isStationary: false,
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

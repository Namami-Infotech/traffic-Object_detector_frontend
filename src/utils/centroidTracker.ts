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
}

export interface LineConfig {
  orientation: 'HORIZONTAL' | 'VERTICAL';
  positionPercent: number; // 10 to 90 %
}

export class CentroidTracker {
  private nextObjectId: number = 1;
  public trackedObjects: Map<number, TrackedObject> = new Map();
  private maxDisappeared: number = 25; // max frames object can disappear before removal
  private maxDistance: number = 80; // max pixel distance between frames to match same object

  public update(
    predictions: Array<{ bbox: [number, number, number, number]; class: string; score: number }>,
    lineConfig: LineConfig,
    canvasWidth: number,
    canvasHeight: number
  ): {
    objects: TrackedObject[];
    inEvents: Array<{ id: number; label: string; timestamp: number }>;
    outEvents: Array<{ id: number; label: string; timestamp: number }>;
  } {
    const inEvents: Array<{ id: number; label: string; timestamp: number }> = [];
    const outEvents: Array<{ id: number; label: string; timestamp: number }> = [];

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
      return { objects: Array.from(this.trackedObjects.values()), inEvents, outEvents };
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
      return { objects: Array.from(this.trackedObjects.values()), inEvents, outEvents };
    }

    // 4. Match existing tracked objects with new input centroids using Euclidean distance
    const objectIds = Array.from(this.trackedObjects.keys());
    const existingObjects = objectIds.map((id) => this.trackedObjects.get(id)!);

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
      obj.score = newInput.score;
      obj.disappeared = 0;
      obj.trajectory.push([currX, currY]);
      if (obj.trajectory.length > 20) {
        obj.trajectory.shift();
      }

      // Check if stationary / stable (movement less than 8px in recent 8 trajectory points)
      if (obj.trajectory.length >= 8) {
        const recent = obj.trajectory.slice(-8);
        const totalMovement = recent.reduce((sum, pt, idx) => {
          if (idx === 0) return 0;
          const prev = recent[idx - 1];
          return sum + Math.hypot(pt[0] - prev[0], pt[1] - prev[1]);
        }, 0);
        obj.isStationary = totalMovement < 8;
      }

      // STRICT LINE CROSSING DETECTION (IN / OUT)
      // Only count IN/OUT if object is actively moving (NOT stationary) and physically crosses the Virtual Line
      if (!obj.isStationary) {
        const buffer = 3; // 3-pixel hysteresis buffer to eliminate jitter false positives

        if (lineConfig.orientation === 'HORIZONTAL') {
          // Line crossing Top-to-Bottom = IN
          if (prevY < (lineCoord - buffer) && currY >= (lineCoord + buffer) && !obj.crossedIn) {
            obj.crossedIn = true;
            obj.crossedOut = false; // Reset opposite state for future re-crossing
            obj.lastCrossedTimestamp = Date.now();
            inEvents.push({ id: obj.id, label: obj.label, timestamp: Date.now() });
          }
          // Line crossing Bottom-to-Top = OUT
          else if (prevY > (lineCoord + buffer) && currY <= (lineCoord - buffer) && !obj.crossedOut) {
            obj.crossedOut = true;
            obj.crossedIn = false; // Reset opposite state for future re-crossing
            obj.lastCrossedTimestamp = Date.now();
            outEvents.push({ id: obj.id, label: obj.label, timestamp: Date.now() });
          }
        } else {
          // VERTICAL Line
          // Left-to-Right = IN
          if (prevX < (lineCoord - buffer) && currX >= (lineCoord + buffer) && !obj.crossedIn) {
            obj.crossedIn = true;
            obj.crossedOut = false; // Reset opposite state for future re-crossing
            obj.lastCrossedTimestamp = Date.now();
            inEvents.push({ id: obj.id, label: obj.label, timestamp: Date.now() });
          }
          // Right-to-Left = OUT
          else if (prevX > (lineCoord + buffer) && currX <= (lineCoord - buffer) && !obj.crossedOut) {
            obj.crossedOut = true;
            obj.crossedIn = false; // Reset opposite state for future re-crossing
            obj.lastCrossedTimestamp = Date.now();
            outEvents.push({ id: obj.id, label: obj.label, timestamp: Date.now() });
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

    return { objects: Array.from(this.trackedObjects.values()), inEvents, outEvents };
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
    };

    this.trackedObjects.set(id, newObj);
  }

  public reset() {
    this.nextObjectId = 1;
    this.trackedObjects.clear();
  }
}

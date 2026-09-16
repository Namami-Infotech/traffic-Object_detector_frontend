import type {
  TrackedObject,
  LineConfig,
  LineCrossingEvent,
} from '../types/detection.types';

export const COUNTABLE_CLASSES: string[] = ['car', 'bus', 'motorcycle', 'person', 'truck', 'bicycle'];

export class CentroidTracker {
  private nextObjectId: number = 1;
  public trackedObjects: Map<number, TrackedObject> = new Map();
  private maxDisappeared: number = 25;
  private maxDistance: number = 80;
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
    const currentConfigKey = `${lineConfig.orientation}_${lineConfig.positionPercent}_${canvasWidth}_${canvasHeight}`;
    if (this.lastLineConfigKey && this.lastLineConfigKey !== currentConfigKey) {
      this.trackedObjects.forEach((obj) => {
        obj.crossedIn = false;
        obj.crossedOut = false;
        obj.isCrossing = false;
        obj.fullBodyCrossed = false;
      });
    }
    this.lastLineConfigKey = currentConfigKey;

    const inEvents: LineCrossingEvent[] = [];
    const outEvents: LineCrossingEvent[] = [];
    const detectionEvents: LineCrossingEvent[] = [];

    const lineCoord =
      lineConfig.orientation === 'HORIZONTAL'
        ? (canvasHeight * lineConfig.positionPercent) / 100
        : (canvasWidth * lineConfig.positionPercent) / 100;

    if (predictions.length === 0) {
      for (const [id, obj] of this.trackedObjects.entries()) {
        obj.disappeared += 1;
        if (obj.disappeared > this.maxDisappeared) {
          this.trackedObjects.delete(id);
        }
      }
      return {
        objects: Array.from(this.trackedObjects.values()),
        inEvents,
        outEvents,
        detectionEvents,
      };
    }

    const inputCentroids: Array<{
      centroid: [number, number];
      bbox: [number, number, number, number];
      label: string;
      score: number;
    }> = [];

    for (const pred of predictions) {
      const [x, y, w, h] = pred.bbox;
      const cx = Math.round(x + w / 2);
      const cy = Math.round(y + h / 2);
      inputCentroids.push({
        centroid: [cx, cy],
        bbox: [x, y, w, h],
        label: pred.class.toLowerCase(),
        score: pred.score,
      });
    }

    if (this.trackedObjects.size === 0) {
      for (const input of inputCentroids) {
        this.register(input.centroid, input.bbox, input.label, input.score);
      }
      return {
        objects: Array.from(this.trackedObjects.values()),
        inEvents,
        outEvents,
        detectionEvents,
      };
    }

    const objectIds = Array.from(this.trackedObjects.keys());
    const objectCentroids = objectIds.map((id) => this.trackedObjects.get(id)!.centroid);

    const distanceMatrix: number[][] = [];
    for (let i = 0; i < objectCentroids.length; i++) {
      distanceMatrix[i] = [];
      const [ox, oy] = objectCentroids[i];
      for (let j = 0; j < inputCentroids.length; j++) {
        const [ix, iy] = inputCentroids[j].centroid;
        const dist = Math.hypot(ox - ix, oy - iy);
        distanceMatrix[i][j] = dist;
      }
    }

    const usedRows = new Set<number>();
    const usedCols = new Set<number>();

    const pairs: Array<{ row: number; col: number; dist: number }> = [];
    for (let r = 0; r < objectCentroids.length; r++) {
      for (let c = 0; c < inputCentroids.length; c++) {
        pairs.push({ row: r, col: c, dist: distanceMatrix[r][c] });
      }
    }
    pairs.sort((a, b) => a.dist - b.dist);

    for (const pair of pairs) {
      if (usedRows.has(pair.row) || usedCols.has(pair.col)) continue;
      if (pair.dist > this.maxDistance) continue;

      const objId = objectIds[pair.row];
      const matchedInput = inputCentroids[pair.col];
      const trackedObj = this.trackedObjects.get(objId)!;

      trackedObj.prevBbox = trackedObj.bbox;
      trackedObj.centroid = matchedInput.centroid;
      trackedObj.bbox = matchedInput.bbox;
      trackedObj.score = matchedInput.score;
      trackedObj.disappeared = 0;

      if (!trackedObj.labelVotes) trackedObj.labelVotes = {};
      trackedObj.labelVotes[matchedInput.label] = (trackedObj.labelVotes[matchedInput.label] || 0) + 1;

      let topLabel = trackedObj.label;
      let topVotes = 0;
      for (const [lbl, votes] of Object.entries(trackedObj.labelVotes)) {
        if (votes > topVotes) {
          topVotes = votes;
          topLabel = lbl;
        }
      }
      trackedObj.label = topLabel;

      if (!trackedObj.loggedToDb && trackedObj.trajectory.length >= 2) {
        trackedObj.loggedToDb = true;
        detectionEvents.push({
          id: trackedObj.id,
          label: trackedObj.label,
          score: trackedObj.score,
          timestamp: Date.now(),
        });
      }

      trackedObj.trajectory.push(matchedInput.centroid);
      if (trackedObj.trajectory.length > 15) {
        trackedObj.trajectory.shift();
      }

      if (trackedObj.trajectory.length >= 3) {
        const recent = trackedObj.trajectory.slice(-3);
        const d1 = Math.hypot(recent[2][0] - recent[0][0], recent[2][1] - recent[0][1]);
        trackedObj.isStationary = d1 < 4;
      }

      this.checkLineCrossing(trackedObj, lineConfig, lineCoord, inEvents, outEvents);

      usedRows.add(pair.row);
      usedCols.add(pair.col);
    }

    for (let r = 0; r < objectCentroids.length; r++) {
      if (!usedRows.has(r)) {
        const objId = objectIds[r];
        const obj = this.trackedObjects.get(objId)!;
        obj.disappeared += 1;
        if (obj.disappeared > this.maxDisappeared) {
          this.trackedObjects.delete(objId);
        }
      }
    }

    for (let c = 0; c < inputCentroids.length; c++) {
      if (!usedCols.has(c)) {
        const input = inputCentroids[c];
        this.register(input.centroid, input.bbox, input.label, input.score);
      }
    }

    return {
      objects: Array.from(this.trackedObjects.values()),
      inEvents,
      outEvents,
      detectionEvents,
    };
  }

  private register(
    centroid: [number, number],
    bbox: [number, number, number, number],
    label: string,
    score: number
  ) {
    const id = this.nextObjectId++;
    this.trackedObjects.set(id, {
      id,
      label,
      score,
      bbox,
      centroid,
      trajectory: [centroid],
      disappeared: 0,
      isStationary: false,
      crossedIn: false,
      crossedOut: false,
      isCrossing: false,
      fullBodyCrossed: false,
      labelVotes: { [label]: 1 },
      loggedToDb: false,
    });
  }

  private checkLineCrossing(
    obj: TrackedObject,
    lineConfig: LineConfig,
    lineCoord: number,
    inEvents: LineCrossingEvent[],
    outEvents: LineCrossingEvent[]
  ) {
    const [x, y, w, h] = obj.bbox;
    const isHorizontal = lineConfig.orientation === 'HORIZONTAL';

    const objLeading = isHorizontal ? y + h : x + w;
    const objTrailing = isHorizontal ? y : x;

    const prevBbox = obj.prevBbox || obj.bbox;
    const prevLeading = isHorizontal ? prevBbox[1] + prevBbox[3] : prevBbox[0] + prevBbox[2];
    const prevTrailing = isHorizontal ? prevBbox[1] : prevBbox[0];

    const isIntersecting = objLeading >= lineCoord && objTrailing <= lineCoord;
    obj.isCrossing = isIntersecting;

    const buffer = 4;

    // Movement: TOP to BOTTOM / LEFT to RIGHT (IN direction)
    const crossedInNow =
      prevTrailing <= lineCoord + buffer &&
      objTrailing > lineCoord + buffer &&
      !obj.crossedIn &&
      !obj.crossedOut;

    // Movement: BOTTOM to TOP / RIGHT to LEFT (OUT direction)
    const crossedOutNow =
      prevLeading >= lineCoord - buffer &&
      objLeading < lineCoord - buffer &&
      !obj.crossedIn &&
      !obj.crossedOut;

    if (crossedInNow) {
      obj.crossedIn = true;
      obj.fullBodyCrossed = true;
      obj.isCrossing = false;
      obj.lastCrossedTimestamp = Date.now();
      inEvents.push({
        id: obj.id,
        label: obj.label,
        score: obj.score,
        timestamp: Date.now(),
      });
    } else if (crossedOutNow) {
      obj.crossedOut = true;
      obj.fullBodyCrossed = true;
      obj.isCrossing = false;
      obj.lastCrossedTimestamp = Date.now();
      outEvents.push({
        id: obj.id,
        label: obj.label,
        score: obj.score,
        timestamp: Date.now(),
      });
    }
  }

  public reset() {
    this.trackedObjects.clear();
    this.nextObjectId = 1;
  }
}

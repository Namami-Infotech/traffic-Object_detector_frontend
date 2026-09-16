import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

class AiModelService {
  private model: cocoSsd.ObjectDetection | null = null;
  private loadingPromise: Promise<cocoSsd.ObjectDetection> | null = null;

  /**
   * Load COCO-SSD model once and reuse single instance across all cameras
   */
  async getModel(): Promise<cocoSsd.ObjectDetection> {
    if (this.model) return this.model;

    if (!this.loadingPromise) {
      this.loadingPromise = (async () => {
        await tf.ready();
        const loadedModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        this.model = loadedModel;
        return loadedModel;
      })();
    }

    return this.loadingPromise;
  }

  isLoaded(): boolean {
    return this.model !== null;
  }
}

export const aiModelService = new AiModelService();

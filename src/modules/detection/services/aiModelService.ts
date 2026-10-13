import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { detectionApi } from '../../../services/api';

export interface DetectedPrediction {
  bbox: [number, number, number, number]; // [x, y, width, height]
  class: string;
  score: number;
}

export interface IObjectDetector {
  detect(
    element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    maxNumBoxes?: number,
    minScore?: number
  ): Promise<DetectedPrediction[]>;
}

class AiModelService {
  private localModel: cocoSsd.ObjectDetection | null = null;
  private localLoadingPromise: Promise<cocoSsd.ObjectDetection> | null = null;
  private yoloDetector: IObjectDetector | null = null;
  private inFlightDetection: boolean = false;
  private lastDetections: DetectedPrediction[] = [];
  private backendAvailable: boolean = true;

  public isBackendAvailable(): boolean {
    return this.backendAvailable;
  }

  constructor() {
    this.yoloDetector = this.initYoloDetector();
  }

  private initYoloDetector(): IObjectDetector {
    const offscreenCanvas = document.createElement('canvas');
    const ctx = offscreenCanvas.getContext('2d');

    return {
      detect: async (
        element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
        maxNumBoxes: number = 30,
        minScore: number = 0.35
      ): Promise<DetectedPrediction[]> => {
        const srcW = (element as any).videoWidth || (element as any).naturalWidth || (element as any).width || 640;
        const srcH = (element as any).videoHeight || (element as any).naturalHeight || (element as any).height || 480;

        if (srcW <= 0 || srcH <= 0) return [];

        // If a request is already running, return cached predictions to keep tracking smooth
        if (this.inFlightDetection) {
          return this.lastDetections;
        }

        try {
          this.inFlightDetection = true;

          // Target 480px resolution for ultra-fast network transfer & YOLOv8 inference
          const targetW = 480;
          const targetH = Math.round((srcH / srcW) * 480);
          offscreenCanvas.width = targetW;
          offscreenCanvas.height = targetH;

          if (ctx) {
            ctx.drawImage(element, 0, 0, targetW, targetH);
          }
          const base64 = offscreenCanvas.toDataURL('image/jpeg', 0.65);

          const res = await detectionApi.detectVehicles(base64);

          if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
            const scaleX = srcW / targetW;
            const scaleY = srcH / targetH;

            const yoloPredictions: DetectedPrediction[] = res.data
              .filter((v: any) => (v.confidence || 0) >= minScore)
              .map((v: any) => ({
                bbox: [
                  v.bbox[0] * scaleX,
                  v.bbox[1] * scaleY,
                  (v.bbox[2] - v.bbox[0]) * scaleX,
                  (v.bbox[3] - v.bbox[1]) * scaleY,
                ],
                class: v.class,
                score: v.confidence || 0.9,
              }));

            if (yoloPredictions.length > 0) {
              this.lastDetections = yoloPredictions;
              this.backendAvailable = true;
              return yoloPredictions;
            }
          }
        } catch (err) {
          this.backendAvailable = false;
        } finally {
          this.inFlightDetection = false;
        }

        // Seamless fallback to client-side MobileNet if backend YOLOv8 is unreachable
        try {
          const local = await this.getLocalModel();
          const preds = await local.detect(element, maxNumBoxes, minScore);
          return preds.map((p) => ({
            bbox: p.bbox,
            class: p.class,
            score: p.score,
          }));
        } catch {
          return this.lastDetections;
        }
      },
    };
  }

  /**
   * Primary detector: High-accuracy YOLOv8 Object & Vehicle Detector
   */
  async getModel(): Promise<IObjectDetector> {
    return this.yoloDetector!;
  }

  /**
   * Fallback model: Client-side MobileNet
   */
  async getLocalModel(): Promise<cocoSsd.ObjectDetection> {
    if (this.localModel) return this.localModel;

    if (!this.localLoadingPromise) {
      this.localLoadingPromise = (async () => {
        await tf.ready();
        const loaded = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        this.localModel = loaded;
        return loaded;
      })();
    }

    return this.localLoadingPromise;
  }

  isLoaded(): boolean {
    return true;
  }
}

export const aiModelService = new AiModelService();

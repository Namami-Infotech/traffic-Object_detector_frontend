import { createWorker } from 'tesseract.js';
import { sanitizeAndValidatePlate } from '../../../utils/plateValidator';
import type { PlateValidationResult } from '../../../utils/plateValidator';

export interface PlateRecognitionResult {
  plateNumber: string | null;
  formattedPlate: string | null;
  confidence: number;
  rawText: string;
  isValid: boolean;
  cropDataUrl?: string;
}

class PlateRecognitionService {
  private worker: any = null;
  private isProcessing: boolean = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize Tesseract OCR worker lazily
   */
  async init(): Promise<void> {
    if (this.worker) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const worker = await createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
          tessedit_pageseg_mode: '7' as any, // Treat the image as a single text line
        });
        this.worker = worker;
      } catch (err) {
        console.warn('⚠️ OCR Worker initialization error:', err);
      }
    })();

    return this.initPromise;
  }

  /**
   * Preprocess canvas to enhance number plate visibility:
   * Grayscale, contrast stretch & adaptive binarization
   */
  preprocessCanvas(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const processedCanvas = document.createElement('canvas');
    processedCanvas.width = sourceCanvas.width;
    processedCanvas.height = sourceCanvas.height;

    const ctx = processedCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    ctx.drawImage(sourceCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
    const data = imgData.data;

    // Convert to Grayscale & Contrast Stretched
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      // High contrast thresholding (binarization boost)
      const contrast = gray > 115 ? 255 : 0;
      data[i] = contrast;
      data[i + 1] = contrast;
      data[i + 2] = contrast;
    }

    ctx.putImageData(imgData, 0, 0);
    return processedCanvas;
  }

  /**
   * Crop vehicle region (focusing on the lower 50% where plates are attached)
   */
  cropPlateRegion(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    bbox: [number, number, number, number] // [x, y, width, height]
  ): HTMLCanvasElement | null {
    try {
      const [x, y, w, h] = bbox;
      if (w <= 0 || h <= 0) return null;

      const canvas = document.createElement('canvas');
      // Plates on cars/buses/trucks are typically in the bottom 45% of the vehicle
      const plateRoiY = y + h * 0.55;
      const plateRoiH = h * 0.45;

      const cropX = Math.max(0, x);
      const cropY = Math.max(0, plateRoiY);
      const cropW = Math.min(w, (source as any).videoWidth || (source as any).naturalWidth || (source as any).width || w);
      const cropH = Math.min(plateRoiH, (source as any).videoHeight || (source as any).naturalHeight || (source as any).height || h);

      canvas.width = Math.max(100, cropW);
      canvas.height = Math.max(40, cropH);

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      return canvas;
    } catch {
      return null;
    }
  }

  /**
   * Run OCR on an image/canvas and validate against Indian Vehicle Number Plate formats
   */
  async recognizePlate(
    canvasOrImage: HTMLCanvasElement | HTMLImageElement | string
  ): Promise<PlateRecognitionResult> {
    const emptyResult: PlateRecognitionResult = {
      plateNumber: null,
      formattedPlate: null,
      confidence: 0,
      rawText: '',
      isValid: false,
    };

    if (this.isProcessing) {
      return emptyResult;
    }

    try {
      this.isProcessing = true;
      await this.init();

      if (!this.worker) {
        return emptyResult;
      }

      let inputTarget: any = canvasOrImage;
      let cropDataUrl: string | undefined;

      if (canvasOrImage instanceof HTMLCanvasElement) {
        cropDataUrl = canvasOrImage.toDataURL('image/jpeg', 0.85);
        inputTarget = this.preprocessCanvas(canvasOrImage);
      }

      const { data } = await this.worker.recognize(inputTarget);
      const rawText = data?.text || '';
      const ocrConfidence = (data?.confidence || 0) / 100;

      // Filter and sanitize Indian Vehicle Plate format
      const validation: PlateValidationResult = sanitizeAndValidatePlate(rawText);

      return {
        plateNumber: validation.isValid || validation.cleanPlate.length >= 6 ? validation.cleanPlate : null,
        formattedPlate: validation.isValid || validation.cleanPlate.length >= 6 ? validation.formattedPlate : null,
        confidence: ocrConfidence * validation.confidenceAdjustment,
        rawText,
        isValid: validation.isValid,
        cropDataUrl,
      };
    } catch (err) {
      console.warn('⚠️ Plate recognition execution warning:', err);
      return emptyResult;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Terminate worker to free memory when unneeded
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
      } catch {
        // ignore
      }
      this.worker = null;
      this.initPromise = null;
    }
  }
}

export const plateRecognitionService = new PlateRecognitionService();

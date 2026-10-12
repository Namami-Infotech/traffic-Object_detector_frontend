import { createWorker } from 'tesseract.js';
import { sanitizeAndValidatePlate } from '../../../utils/plateValidator';
import type { PlateValidationResult } from '../../../utils/plateValidator';
import { aiModelService } from './aiModelService';
import { detectionApi } from '../../../services/api';

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
        });
        this.worker = worker;
      } catch (err) {
        console.warn('⚠️ OCR Worker initialization error:', err);
      }
    })();

    return this.initPromise;
  }

  /**
   * Detect yellow commercial license plate region using color clustering
   */
  detectYellowPlateRegion(canvas: HTMLCanvasElement): { x: number; y: number; w: number; h: number } | null {
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const W = canvas.width;
      const H = canvas.height;
      const imgData = ctx.getImageData(0, 0, W, H);
      const data = imgData.data;

      const step = 4;
      const gridW = Math.floor(W / step);
      const gridH = Math.floor(H / step);
      let minGx = gridW, maxGx = 0, minGy = gridH, maxGy = 0, count = 0;

      for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
          const px = ((gy * step * W) + (gx * step)) * 4;
          const r = data[px];
          const g = data[px + 1];
          const b = data[px + 2];

          // Yellow plate color: high red & green, low blue
          if (r > 130 && g > 105 && b < 100 && (r + g) > 2.2 * b) {
            count++;
            if (gx < minGx) minGx = gx;
            if (gx > maxGx) maxGx = gx;
            if (gy < minGy) minGy = gy;
            if (gy > maxGy) maxGy = gy;
          }
        }
      }

      if (count >= 20 && maxGx >= minGx && maxGy >= minGy) {
        const spanW = (maxGx - minGx + 1) * step;
        const spanH = (maxGy - minGy + 1) * step;
        const aspect = spanW / spanH;

        if (aspect >= 0.9 && aspect <= 6.5 && spanW >= 30 && spanH >= 15) {
          const padX = Math.round(spanW * 0.25);
          const padY = Math.round(spanH * 0.30);
          const x = Math.max(0, (minGx * step) - padX);
          const y = Math.max(0, (minGy * step) - padY);
          const w = Math.min(W - x, spanW + padX * 2);
          const h = Math.min(H - y, spanH + padY * 2);
          return { x, y, w, h };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Rotate a canvas by specified degrees to straighten angled or skewed plates
   */
  rotateCanvas(source: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
    if (degrees === 0) return source;

    const rad = (degrees * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const newW = Math.round(source.width * cos + source.height * sin);
    const newH = Math.round(source.height * cos + source.width * sin);

    const canvas = document.createElement('canvas');
    canvas.width = newW;
    canvas.height = newH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, newW, newH);
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.drawImage(source, -source.width / 2, -source.height / 2);
    return canvas;
  }

  /**
   * Preprocess canvas to enhance number plate visibility:
   * Dynamic auto-contrast stretching
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

    let minGray = 255;
    let maxGray = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
      if (gray < minGray) minGray = gray;
      if (gray > maxGray) maxGray = gray;
    }

    const range = Math.max(1, maxGray - minGray);
    for (let i = 0; i < data.length; i += 4) {
      const stretched = Math.round(((data[i] - minGray) / range) * 255);
      data[i] = stretched;
      data[i + 1] = stretched;
      data[i + 2] = stretched;
    }

    ctx.putImageData(imgData, 0, 0);
    return processedCanvas;
  }

  /**
   * Crop vehicle region with boundary safety and upscale for OCR
   */
  cropPlateRegion(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    bbox: [number, number, number, number] // [x, y, width, height]
  ): HTMLCanvasElement | null {
    try {
      const [x, y, w, h] = bbox;
      if (w <= 0 || h <= 0) return null;

      const srcW = (source as any).videoWidth || (source as any).naturalWidth || (source as any).width || 640;
      const srcH = (source as any).videoHeight || (source as any).naturalHeight || (source as any).height || 480;

      // Cover trunk lid + bumper (from 25% to 85% of vehicle height)
      const plateRoiY = y + h * 0.25;
      const plateRoiH = h * 0.65;

      const cropX = Math.max(0, Math.min(x, srcW - 10));
      const cropY = Math.max(0, Math.min(plateRoiY, srcH - 10));
      const cropW = Math.max(10, Math.min(w, srcW - cropX));
      const cropH = Math.max(10, Math.min(plateRoiH, srcH - cropY));

      const scale = cropH < 70 ? 2.5 : cropH < 120 ? 1.8 : 1.3;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cropW * scale);
      canvas.height = Math.round(cropH * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      return canvas;
    } catch {
      return null;
    }
  }

  private sourceToCanvas(source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): HTMLCanvasElement {
    if (source instanceof HTMLCanvasElement) return source;

    const canvas = document.createElement('canvas');
    const width = (source as any).naturalWidth || (source as any).videoWidth || (source as any).width || 640;
    const height = (source as any).naturalHeight || (source as any).videoHeight || (source as any).height || 480;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(source, 0, 0, width, height);
    }
    return canvas;
  }

  private cropPixelRegion(
    source: HTMLCanvasElement,
    x: number,
    y: number,
    w: number,
    h: number
  ): HTMLCanvasElement {
    const W = source.width;
    const H = source.height;

    const safeX = Math.max(0, Math.min(x, W - 10));
    const safeY = Math.max(0, Math.min(y, H - 10));
    const safeW = Math.max(10, Math.min(w, W - safeX));
    const safeH = Math.max(10, Math.min(h, H - safeY));

    const scale = safeH < 80 ? 2.5 : safeH < 140 ? 1.8 : 1.2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(safeW * scale);
    canvas.height = Math.round(safeH * scale);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, safeX, safeY, safeW, safeH, 0, 0, canvas.width, canvas.height);
    }
    return canvas;
  }

  /**
   * Run OCR on an image/canvas and validate against Indian Vehicle Number Plate formats.
   * Full multi-vehicle coverage:
   * 1. Commercial Yellow Plates (Trucks, Buses, Autos, Taxis)
   * 2. Truck Lower Bumper (Bottom of tall truck cab)
   * 3. Sedan Trunk Lid (Between tail lights on trunk)
   * 4. SUV / Hatchback Bumper
   * 5. Multi-Angle Deskewing Rotation (-14° to +14°)
   */
  async recognizePlate(
    canvasOrImage: HTMLCanvasElement | HTMLImageElement | string,
    isDirectCrop: boolean = false
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

      let baseCanvas: HTMLCanvasElement;
      if (typeof canvasOrImage === 'string') {
        const img = new Image();
        img.src = canvasOrImage;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        baseCanvas = this.sourceToCanvas(img);
      } else if (canvasOrImage instanceof HTMLCanvasElement) {
        baseCanvas = canvasOrImage;
      } else {
        baseCanvas = this.sourceToCanvas(canvasOrImage);
      }

      const W = baseCanvas.width;
      const H = baseCanvas.height;

      // 1. PRIMARY ENGINE: High-Accuracy Deep Learning (EasyOCR Backend Bridge)
      try {
        const base64Data = baseCanvas.toDataURL('image/jpeg', 0.88);
        const backendRes: any = await detectionApi.recognizePlate(base64Data, isDirectCrop);

        if (backendRes?.data?.isValid && backendRes?.data?.plateNumber) {
          const validated = sanitizeAndValidatePlate(backendRes.data.plateNumber);
          const finalPlate = validated.cleanPlate || backendRes.data.plateNumber;
          const finalFormatted = validated.formattedPlate || backendRes.data.formattedPlate || finalPlate;
          return {
            plateNumber: finalPlate,
            formattedPlate: finalFormatted,
            confidence: backendRes.data.confidence !== undefined ? backendRes.data.confidence : 0.85,
            rawText: backendRes.data.rawText || finalPlate,
            isValid: true,
            cropDataUrl: backendRes.data.cropDataUrl || base64Data,
          };
        }
      } catch (backendErr) {
        console.warn('Backend EasyOCR ANPR unavailable, using in-browser fallback:', backendErr);
      }

      // 2. FALLBACK ENGINE: In-Browser Tesseract.js Worker
      await this.init();

      if (!this.worker) {
        return emptyResult;
      }

      // Pre-cropped plate check
      const isAlreadyCropped = isDirectCrop || (W <= 700 && H <= 300 && W / H >= 1.4);

      const candidates: { canvas: HTMLCanvasElement; psm: string; name: string }[] = [];

      if (isAlreadyCropped) {
        const contrastCanvas = this.preprocessCanvas(baseCanvas);
        candidates.push({ canvas: contrastCanvas, psm: '6', name: 'Direct-0deg' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, -10), psm: '6', name: 'Direct-Minus10' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, 10), psm: '6', name: 'Direct-Plus10' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, -20), psm: '6', name: 'Direct-Minus20' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, 20), psm: '6', name: 'Direct-Plus20' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, -35), psm: '6', name: 'Direct-Minus35' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, 35), psm: '6', name: 'Direct-Plus35' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, -60), psm: '6', name: 'Direct-Minus60' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, 60), psm: '6', name: 'Direct-Plus60' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, -90), psm: '6', name: 'Direct-Minus90' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, 90), psm: '6', name: 'Direct-Plus90' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, -135), psm: '6', name: 'Direct-Minus135' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, 135), psm: '6', name: 'Direct-Plus135' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, -170), psm: '6', name: 'Direct-Minus170' });
        candidates.push({ canvas: this.rotateCanvas(contrastCanvas, 170), psm: '6', name: 'Direct-Plus170' });
      } else {
        // 1. Check for Yellow Commercial Plate (Trucks, Commercial Buses, Taxis)
        const yellowBox = this.detectYellowPlateRegion(baseCanvas);
        if (yellowBox) {
          const yellowCrop = this.cropPixelRegion(baseCanvas, yellowBox.x, yellowBox.y, yellowBox.w, yellowBox.h);
          const processedYellow = this.preprocessCanvas(yellowCrop);
          candidates.push({ canvas: processedYellow, psm: '6', name: 'YellowPlate-0deg' });
          candidates.push({ canvas: this.rotateCanvas(processedYellow, -12), psm: '6', name: 'YellowPlate-Minus12' });
          candidates.push({ canvas: this.rotateCanvas(processedYellow, 12), psm: '6', name: 'YellowPlate-Plus12' });
          candidates.push({ canvas: this.rotateCanvas(processedYellow, -25), psm: '6', name: 'YellowPlate-Minus25' });
          candidates.push({ canvas: this.rotateCanvas(processedYellow, 25), psm: '6', name: 'YellowPlate-Plus25' });
        }

        // 2. Use AI Object Detection to isolate the vehicle
        let vehicleBbox: [number, number, number, number] | null = null;
        try {
          const model = await aiModelService.getModel();
          const predictions = await model.detect(baseCanvas);
          const vehicle = predictions.find((p) =>
            ['car', 'truck', 'bus', 'motorcycle'].includes(p.class.toLowerCase())
          );
          if (vehicle && vehicle.bbox && vehicle.bbox[2] > 60 && vehicle.bbox[3] > 40) {
            vehicleBbox = vehicle.bbox as [number, number, number, number];
          }
        } catch (detectErr) {
          console.warn('AI vehicle detection skip:', detectErr);
        }

        if (vehicleBbox) {
          const [vx, vy, vw, vh] = vehicleBbox;

          // ZONE A: Truck / Bus Lower Bumper (At the bottom of the truck cabin: 58% to 98% height)
          const truckBumperCrop = this.cropPixelRegion(
            baseCanvas,
            vx + vw * 0.05,
            vy + vh * 0.58,
            vw * 0.90,
            vh * 0.40
          );
          const processedTruck = this.preprocessCanvas(truckBumperCrop);
          candidates.push({ canvas: processedTruck, psm: '6', name: 'AI-TruckBumper-0deg' });
          candidates.push({ canvas: this.rotateCanvas(processedTruck, -8), psm: '6', name: 'AI-TruckBumper-Minus8' });
          candidates.push({ canvas: this.rotateCanvas(processedTruck, 8), psm: '6', name: 'AI-TruckBumper-Plus8' });

          // ZONE B: Sedan Trunk Lid (Between tail lights on trunk: 25% to 65% height)
          const sedanTrunkCrop = this.cropPixelRegion(
            baseCanvas,
            vx + vw * 0.05,
            vy + vh * 0.25,
            vw * 0.90,
            vh * 0.45
          );
          const processedSedan = this.preprocessCanvas(sedanTrunkCrop);
          candidates.push({ canvas: processedSedan, psm: '6', name: 'AI-SedanTrunk-0deg' });
          candidates.push({ canvas: this.rotateCanvas(processedSedan, -8), psm: '6', name: 'AI-SedanTrunk-Minus8' });
          candidates.push({ canvas: this.rotateCanvas(processedSedan, 8), psm: '6', name: 'AI-SedanTrunk-Plus8' });
          candidates.push({ canvas: this.rotateCanvas(processedSedan, -14), psm: '6', name: 'AI-SedanTrunk-Minus14' });
          candidates.push({ canvas: this.rotateCanvas(processedSedan, 14), psm: '6', name: 'AI-SedanTrunk-Plus14' });

          // ZONE C: SUV / Hatchback Bumper (Lower-middle: 42% to 85% height)
          const suvCrop = this.cropPixelRegion(
            baseCanvas,
            vx + vw * 0.05,
            vy + vh * 0.42,
            vw * 0.90,
            vh * 0.45
          );
          const processedSuv = this.preprocessCanvas(suvCrop);
          candidates.push({ canvas: processedSuv, psm: '6', name: 'AI-SuvBumper-0deg' });
          candidates.push({ canvas: this.rotateCanvas(processedSuv, -10), psm: '6', name: 'AI-SuvBumper-Minus10' });
          candidates.push({ canvas: this.rotateCanvas(processedSuv, 10), psm: '6', name: 'AI-SuvBumper-Plus10' });

          // ZONE D: Full isolated car box with PSM 11 (Sparse text)
          const carBox = this.cropPixelRegion(baseCanvas, vx, vy, vw, vh);
          candidates.push({ canvas: this.preprocessCanvas(carBox), psm: '11', name: 'AI-FullCar-Sparse' });
        }

        // Generic slices (in case AI detection missed or car is at unusual angle)
        // Center-Lower (Truck / SUV bumper)
        const lowerSlice = this.cropPixelRegion(baseCanvas, W * 0.10, H * 0.45, W * 0.80, H * 0.50);
        const processedLower = this.preprocessCanvas(lowerSlice);
        candidates.push({ canvas: processedLower, psm: '6', name: 'LowerSlice-0deg' });

        // Center-Upper (Sedan trunk)
        const upperSlice = this.cropPixelRegion(baseCanvas, W * 0.05, H * 0.18, W * 0.90, H * 0.45);
        const processedUpper = this.preprocessCanvas(upperSlice);
        candidates.push({ canvas: processedUpper, psm: '6', name: 'UpperSlice-0deg' });

        // Full Image (PSM 11)
        candidates.push({ canvas: baseCanvas, psm: '11', name: 'FullImage-Sparse' });
      }

      let bestRawText = '';
      let bestCropUrl: string | undefined;

      for (const cand of candidates) {
        try {
          await this.worker.setParameters({
            tessedit_pageseg_mode: cand.psm as any,
          });

          const { data } = await this.worker.recognize(cand.canvas);
          const text = (data?.text || '').trim();
          const ocrConf = (data?.confidence || 0) / 100;

          if (text) {
            if (!bestRawText) {
              bestRawText = text;
              bestCropUrl = cand.canvas.toDataURL('image/jpeg', 0.85);
            }

            const validation: PlateValidationResult = sanitizeAndValidatePlate(text);

            // STRICT: Match genuine Indian license plate format (e.g. DL1MB1331, DL9CAT2790, HP07D3066)
            if (validation.isValid && validation.cleanPlate) {
              const baseConf = ocrConf > 0.6 ? ocrConf : 0.90;
              return {
                plateNumber: validation.cleanPlate,
                formattedPlate: validation.formattedPlate,
                confidence: Math.round(Math.min(0.99, Math.max(0.80, baseConf * (validation.confidenceAdjustment || 1.0))) * 100) / 100,
                rawText: text,
                isValid: true,
                cropDataUrl: cand.canvas.toDataURL('image/jpeg', 0.9),
              };
            }
          }
        } catch (candErr) {
          console.warn(`Candidate ${cand.name} scan notice:`, candErr);
        }
      }

      return {
        ...emptyResult,
        rawText: bestRawText,
        cropDataUrl: bestCropUrl,
      };
    } catch (err) {
      console.warn('⚠️ Plate recognition execution warning:', err);
      return emptyResult;
    } finally {
      this.isProcessing = false;
    }
  }

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

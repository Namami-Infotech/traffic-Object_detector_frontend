/**
 * Indian Vehicle Number Plate Validator & Sanitizer (Frontend)
 * Removes unwanted stickers, dealership names, 'IND' tags, and extracts valid plate numbers.
 */

const UNWANTED_WORDS = [
  'IND',
  'INDIA',
  'POLICE',
  'GOVT',
  'GOVERNMENT',
  'ARMY',
  'DEFENCE',
  'DOCTOR',
  'PRESS',
  'VIP',
  'ADMIN',
  'MARUTI',
  'SUZUKI',
  'HONDA',
  'HYUNDAI',
  'TATA',
  'TOYOTA',
  'MAHINDRA',
  'BAJAJ',
  'HERO',
  'YAMAHA',
  'MOTORS',
  'AUTO',
];

export const INDIAN_STATE_CODES = new Set([
  'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN',
  'GA', 'GJ', 'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD',
  'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OD', 'PB', 'PY', 'RJ',
  'SK', 'TN', 'TR', 'TS', 'UK', 'UP', 'WB',
]);

export interface PlateValidationResult {
  isValid: boolean;
  cleanPlate: string; // e.g. "UP14ET1234"
  formattedPlate: string; // e.g. "UP 14 ET 1234"
  stateCode?: string;
  confidenceAdjustment: number;
}

export function sanitizeAndValidatePlate(rawText: string): PlateValidationResult {
  if (!rawText || typeof rawText !== 'string') {
    return { isValid: false, cleanPlate: '', formattedPlate: '', confidenceAdjustment: 0 };
  }

  let text = rawText.toUpperCase();

  // 1. Remove unwanted known stickers / dealer names / IND tags
  for (const word of UNWANTED_WORDS) {
    const wordRegex = new RegExp(`\\b${word}\\b`, 'gi');
    text = text.replace(wordRegex, '');
  }

  // 2. Strip non-alphanumeric characters
  const alphanumeric = text.replace(/[^A-Z0-9]/g, '');

  // 3. Search for Standard Indian Plate Pattern: 2 Letters + 1-2 Digits + 1-3 Letters + 4 Digits
  // Examples: DL01AB1234, UP14ET9999, MH12CD5678, HR26DQ5555
  const standardPattern = /([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})/g;
  const standardMatch = standardPattern.exec(alphanumeric);

  if (standardMatch) {
    const stateCode = standardMatch[1];
    const rtoCode = standardMatch[2].padStart(2, '0');
    const series = standardMatch[3];
    const digits = standardMatch[4];

    const cleanPlate = `${stateCode}${rtoCode}${series}${digits}`;
    const formattedPlate = `${stateCode} ${rtoCode} ${series} ${digits}`;
    const isStateValid = INDIAN_STATE_CODES.has(stateCode);

    return {
      isValid: true,
      cleanPlate,
      formattedPlate,
      stateCode,
      confidenceAdjustment: isStateValid ? 1.0 : 0.85,
    };
  }

  // 4. Check for Bharat Series (BH) Pattern: 2 Digits + BH + 4 Digits + 1-2 Letters
  // Example: 22BH1234AA
  const bhPattern = /([0-9]{2})BH([0-9]{4})([A-Z]{1,2})/g;
  const bhMatch = bhPattern.exec(alphanumeric);

  if (bhMatch) {
    const year = bhMatch[1];
    const digits = bhMatch[2];
    const series = bhMatch[3];

    const cleanPlate = `${year}BH${digits}${series}`;
    const formattedPlate = `${year} BH ${digits} ${series}`;

    return {
      isValid: true,
      cleanPlate,
      formattedPlate,
      stateCode: 'BH',
      confidenceAdjustment: 0.95,
    };
  }

  // 5. Fallback heuristic: If string length is between 8 and 11 and starts with 2 letters and ends with 4 digits
  if (alphanumeric.length >= 8 && alphanumeric.length <= 11) {
    const looseMatch = /^([A-Z]{2})([0-9A-Z]+)([0-9]{4})$/.exec(alphanumeric);
    if (looseMatch) {
      const stateCode = looseMatch[1];
      if (INDIAN_STATE_CODES.has(stateCode)) {
        return {
          isValid: true,
          cleanPlate: alphanumeric,
          formattedPlate: `${stateCode} ${looseMatch[2]} ${looseMatch[3]}`,
          stateCode,
          confidenceAdjustment: 0.75,
        };
      }
    }
  }

  return {
    isValid: false,
    cleanPlate: alphanumeric,
    formattedPlate: alphanumeric,
    confidenceAdjustment: 0.4,
  };
}

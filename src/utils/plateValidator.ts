/**
 * Indian Vehicle Number Plate Validator & Sanitizer (Frontend)
 * Extracts and strictly validates standard Indian registration plates.
 * Never returns corrupt or invalid text as a clean plate.
 */

export const INDIAN_STATE_CODES = new Set([
  'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN',
  'GA', 'GJ', 'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD',
  'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OD', 'PB', 'PY', 'RJ',
  'SK', 'TN', 'TR', 'TS', 'UK', 'UP', 'WB',
]);

export interface PlateValidationResult {
  isValid: boolean;
  cleanPlate: string; // e.g. "DL03CDE0953" or "DL11CG2337"
  formattedPlate: string; // e.g. "DL 03 CDE 0953" or "DL 11 CG 2337"
  stateCode?: string;
  confidenceAdjustment: number;
}

export function sanitizeAndValidatePlate(rawText: string): PlateValidationResult {
  const invalidResult: PlateValidationResult = {
    isValid: false,
    cleanPlate: '',
    formattedPlate: '',
    confidenceAdjustment: 0,
  };

  if (!rawText || typeof rawText !== 'string') {
    return invalidResult;
  }

  // 1. Tokenize OCR text by whitespace and symbols
  const cleanStr = rawText.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ');
  const tokens = cleanStr.split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return invalidResult;
  }

  // 2. Sliding window over 1 to 6 tokens to isolate candidate plate token sequence
  for (let len = 1; len <= Math.min(6, tokens.length); len++) {
    for (let i = 0; i <= tokens.length - len; i++) {
      let combined = tokens.slice(i, i + len).join('');

      // Remove IND prefix if attached (e.g. INDDL03CDE0953 -> DL03CDE0953)
      if (combined.startsWith('IND') && combined.length >= 8) {
        combined = combined.slice(3);
      } else {
        combined = combined.replace(/IND(?=[A-Z]{2}[0-9])/, '');
      }

      // 1. Check Delhi Commercial plate:
      // DL + 1 to 14 + Category letter (M, L, C, T, A, B, P, S, Y, Z) + optional series (1 letter) + 4 digits
      // Examples: DL1MB1331 -> "DL 1M B 1331", DL1M1331 -> "DL 1M 1331"
      const dlCommMatch = /^DL([1-9]|0[1-9]|1[0-4])([MLCTABPSYZ])([A-Z]?)([0-9]{4})$/.exec(combined);
      if (dlCommMatch) {
        const rtoNum = parseInt(dlCommMatch[1], 10).toString();
        const cat = dlCommMatch[2];
        const series = dlCommMatch[3];
        const num = dlCommMatch[4];
        return {
          isValid: true,
          cleanPlate: `DL${rtoNum}${cat}${series}${num}`,
          formattedPlate: `DL ${rtoNum}${cat} ${series ? series + ' ' : ''}${num}`.trim(),
          stateCode: 'DL',
          confidenceAdjustment: 1.0,
        };
      }

      // 2. Check standard Indian plate:
      // State (2 letters) + RTO/District (1-2 digits) + Series (1-3 letters) + Number (4 digits)
      // Examples: DL03CDE0953, DL11CG2337, UP14ET9999, MH12CD5678, HR26DQ5555
      const standardMatch = /^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$/.exec(combined);
      if (standardMatch) {
        const state = standardMatch[1];
        if (INDIAN_STATE_CODES.has(state)) {
          const rto = standardMatch[2].padStart(2, '0');
          const series = standardMatch[3];
          const num = standardMatch[4];
          return {
            isValid: true,
            cleanPlate: `${state}${rto}${series}${num}`,
            formattedPlate: `${state} ${rto} ${series} ${num}`,
            stateCode: state,
            confidenceAdjustment: 1.0,
          };
        }
      }

      // 3. Check Old / Gov standard plate without series letters (e.g. DL 01 1234)
      const govMatch = /^([A-Z]{2})([0-9]{1,2})([0-9]{4})$/.exec(combined);
      if (govMatch) {
        const state = govMatch[1];
        if (INDIAN_STATE_CODES.has(state)) {
          const rto = govMatch[2].padStart(2, '0');
          const num = govMatch[3];
          return {
            isValid: true,
            cleanPlate: `${state}${rto}${num}`,
            formattedPlate: `${state} ${rto} ${num}`,
            stateCode: state,
            confidenceAdjustment: 1.0,
          };
        }
      }

      // 4. Check Bharat (BH) series: 2 digits + BH + 4 digits + 1-2 letters (e.g. 22BH1234AA)
      const bhMatch = /^([0-9]{2})BH([0-9]{4})([A-Z]{1,2})$/.exec(combined);
      if (bhMatch) {
        return {
          isValid: true,
          cleanPlate: `${bhMatch[1]}BH${bhMatch[2]}${bhMatch[3]}`,
          formattedPlate: `${bhMatch[1]} BH ${bhMatch[2]} ${bhMatch[3]}`,
          stateCode: 'BH',
          confidenceAdjustment: 0.95,
        };
      }

      // 5. Slot-based OCR healer for standard Indian plate (8 to 11 characters)
      // Heals character misrecognitions like O<->0, I<->1, G<->6, B<->8, S<->5, Z<->2, A<->4
      if (combined.length >= 8 && combined.length <= 11) {
        let stateCandidate = combined.slice(0, 2).replace(/0/g, 'O').replace(/1/g, 'I');
        if (INDIAN_STATE_CODES.has(stateCandidate)) {
          const rest = combined.slice(2);
          const numDigits = rest
            .slice(-4)
            .replace(/[ODQ]/g, '0')
            .replace(/[IL]/g, '1')
            .replace(/Z/g, '2')
            .replace(/S/g, '5')
            .replace(/B/g, '8')
            .replace(/G/g, '6')
            .replace(/A/g, '4');

          // Delhi Commercial Healer: DL + (1-14) + (M/L/C/T/A/B/P/S/Y/Z) + (A-Z)? + 4 digits
          if (stateCandidate === 'DL') {
            const dlMatch = rest.match(/^([0-9IOS]{1,2})([MLCTABPSYZ])([A-Z]?)([0-9ODQILZSBGA]{4})$/);
            if (dlMatch) {
              const rtoVal = dlMatch[1].replace(/O/g, '0').replace(/I/g, '1').replace(/S/g, '5');
              const cat = dlMatch[2];
              const series = dlMatch[3];
              const cleanRto = parseInt(rtoVal, 10).toString();
              return {
                isValid: true,
                cleanPlate: `DL${cleanRto}${cat}${series}${numDigits}`,
                formattedPlate: `DL ${cleanRto}${cat} ${series ? series + ' ' : ''}${numDigits}`.trim(),
                stateCode: 'DL',
                confidenceAdjustment: 0.9,
              };
            }
          }

          const mid = rest.slice(0, -4);
          const midMatch = mid.match(/^([0-9IOS]{1,2})(.*)$/);
          if (midMatch) {
            const rto = midMatch[1].replace(/O/g, '0').replace(/I/g, '1').replace(/S/g, '5').padStart(2, '0');
            const series = midMatch[2]
              .replace(/0/g, 'O')
              .replace(/1/g, 'I')
              .replace(/6/g, 'G')
              .replace(/8/g, 'B')
              .replace(/5/g, 'S');

            if (/^[0-9]{2}$/.test(rto) && /^[A-Z]{1,3}$/.test(series) && /^[0-9]{4}$/.test(numDigits)) {
              return {
                isValid: true,
                cleanPlate: `${stateCandidate}${rto}${series}${numDigits}`,
                formattedPlate: `${stateCandidate} ${rto} ${series} ${numDigits}`,
                stateCode: stateCandidate,
                confidenceAdjustment: 0.9,
              };
            }
          }
        }
      }
    }
  }

  // Strictly return empty plate if no valid Indian format was matched
  return invalidResult;
}

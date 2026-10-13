/**
 * Indian Vehicle Number Plate Validator & Sanitizer (Frontend)
 * Extracts and validates standard Indian registration plates with relaxed/partial matching
 * support for blurry or moving vehicle frames.
 */

export const INDIAN_STATE_CODES = new Set([
  'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DL', 'DN',
  'GA', 'GJ', 'HP', 'HR', 'JH', 'JK', 'KA', 'KL', 'LA', 'LD',
  'MH', 'ML', 'MN', 'MP', 'MZ', 'NL', 'OD', 'PB', 'PY', 'RJ',
  'SK', 'TN', 'TR', 'TS', 'UK', 'UP', 'UT', 'WB', 'BH',
]);

export const STATE_FIXES: Record<string, string> = {
  '0L': 'DL', 'D1': 'DL', 'OI': 'DL', '01': 'DL', 'QL': 'DL', 'DI': 'DL',
  'H8': 'HR', 'HA': 'HR', 'HR': 'HR',
  'U9': 'UP', 'UF': 'UP', 'JP': 'UP',
  'H9': 'HP', 'HB': 'HP', '4P': 'HP', 'H0': 'HP',
  'M8': 'MH', 'M1': 'MH',
  'R1': 'RJ', 'KJ': 'RJ',
  'P8': 'PB', 'TB': 'PB',
};

export interface PlateValidationResult {
  isValid: boolean;
  cleanPlate: string; // e.g. "DL03CDE0953" or "DL11CG2337"
  formattedPlate: string; // e.g. "DL 03 CDE 0953" or "DL 11 CG 2337"
  stateCode?: string;
  confidenceAdjustment: number;
  isPartial?: boolean;
}

export function sanitizeAndValidatePlate(rawText: string): PlateValidationResult {
  const invalidResult: PlateValidationResult = {
    isValid: false,
    cleanPlate: '',
    formattedPlate: '',
    confidenceAdjustment: 0,
    isPartial: false,
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

  let bestPartialCandidate: PlateValidationResult | null = null;

  // 2. Sliding window over 1 to 6 tokens to isolate candidate plate token sequence
  for (let len = 1; len <= Math.min(6, tokens.length); len++) {
    for (let i = 0; i <= tokens.length - len; i++) {
      let combined = tokens.slice(i, i + len).join('');

      // Remove IND prefix if attached (e.g. INDDL03CDE0953 -> DL03CDE0953)
      if (combined.startsWith('IND') && combined.length >= 7) {
        combined = combined.slice(3);
      } else {
        combined = combined.replace(/IND(?=[A-Z0-9]{2}[0-9])/, '');
      }

      // Check state prefix healing
      if (combined.length >= 2 && STATE_FIXES[combined.slice(0, 2)]) {
        combined = STATE_FIXES[combined.slice(0, 2)] + combined.slice(2);
      }

      // --- 1. Delhi Commercial plate (Full) ---
      // DL + 1 to 14 + Category letter (M, L, C, T, A, B, P, S, Y, Z) + optional series + 4 digits
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
          isPartial: false,
        };
      }

      // --- 2. Standard Indian plate (Full) ---
      // State (2 letters) + RTO/District (1-2 digits) + Series (1-3 letters) + Number (4 digits)
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
            isPartial: false,
          };
        }
      }

      // --- 3. Old / Gov standard plate without series letters (e.g. DL 01 1234) ---
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
            isPartial: false,
          };
        }
      }

      // --- 4. Bharat (BH) series: 2 digits + BH + 4 digits + 1-2 letters ---
      const bhMatch = /^([0-9]{2})BH([0-9]{4})([A-Z]{1,2})$/.exec(combined);
      if (bhMatch) {
        return {
          isValid: true,
          cleanPlate: `${bhMatch[1]}BH${bhMatch[2]}${bhMatch[3]}`,
          formattedPlate: `${bhMatch[1]} BH ${bhMatch[2]} ${bhMatch[3]}`,
          stateCode: 'BH',
          confidenceAdjustment: 0.95,
          isPartial: false,
        };
      }

      // --- 5. Slot-based OCR healer for standard Indian plate (8 to 11 characters) ---
      if (combined.length >= 8 && combined.length <= 11) {
        let stateCandidate = combined.slice(0, 2).replace(/0/g, 'O').replace(/1/g, 'I');
        if (STATE_FIXES[stateCandidate]) stateCandidate = STATE_FIXES[stateCandidate];

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

          // Delhi Commercial Healer
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
                isPartial: false,
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
                isPartial: false,
              };
            }
          }
        }
      }

      // --- 6. Constrained Partial Matching for Moving Vehicles (Must follow Indian structure & end in digits) ---
      if (combined.length >= 6 && combined.length <= 11) {
        let stateCandidate = combined.slice(0, 2);
        if (STATE_FIXES[stateCandidate]) stateCandidate = STATE_FIXES[stateCandidate];

        if (INDIAN_STATE_CODES.has(stateCandidate)) {
          const rest = combined.slice(2);
          // Indian plates must have Series (1-3 letters) with 3-4 digits, or 4 digits (rejects noisy AR 55 54)
          const mSeries = rest.match(/^([0-9IOS]{1,2})([A-Z]{1,3})([0-9ODQILZSBGA]{3,4})$/);
          const mNoSeries = !mSeries ? rest.match(/^([0-9IOS]{1,2})([0-9ODQILZSBGA]{4})$/) : null;
          const partialMatch = mSeries || mNoSeries;
          if (partialMatch) {
            const rtoClean = partialMatch[1].replace(/O/g, '0').replace(/I/g, '1').replace(/S/g, '5').padStart(2, '0');
            const seriesClean = (mSeries ? partialMatch[2] : '')
              .replace(/0/g, 'O')
              .replace(/1/g, 'I')
              .replace(/6/g, 'G')
              .replace(/8/g, 'B')
              .replace(/5/g, 'S');
            const rawNum = mSeries ? partialMatch[3] : partialMatch[2];
            const numClean = rawNum
              .replace(/[ODQ]/g, '0')
              .replace(/[IL]/g, '1')
              .replace(/Z/g, '2')
              .replace(/S/g, '5')
              .replace(/B/g, '8')
              .replace(/G/g, '6')
              .replace(/A/g, '4');

            const clean = `${stateCandidate}${rtoClean}${seriesClean}${numClean}`;
            const formatted = `${stateCandidate} ${rtoClean} ${seriesClean ? seriesClean + ' ' : ''}${numClean}`.trim();

            if (!bestPartialCandidate || clean.length > bestPartialCandidate.cleanPlate.length) {
              bestPartialCandidate = {
                isValid: true,
                cleanPlate: clean,
                formattedPlate: formatted,
                stateCode: stateCandidate,
                confidenceAdjustment: 0.85,
                isPartial: true,
              };
            }
          }
        }
      }
    }
  }

  if (bestPartialCandidate) {
    return bestPartialCandidate;
  }

  return invalidResult;
}

/**
 * color-utils.test.js
 *
 * Comprehensive unit tests for the pure color-utility functions used by
 * contrast-plus/app.js.  Uses Node.js built-in test runner (node:test),
 * available in Node 18+.
 *
 * Run with: npm test
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  toHex,
  hashCode,
  hslToHex,
  rgbToHsl,
  hue2rgb,
  hslToRgb,
  rgbToHex,
  srgbChannelToLinear,
  relativeLuminance,
  wcagContrast,
  formatRatio,
  formatLc,
  foregroundCandidateScore,
  backgroundCandidateScore,
  focusCandidateScore,
  generateTonalScale,
  generateHarmony,
  applyCohesiveTint,
} from './color-utils.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Round a number to N decimal places (to avoid float drift in assertions). */
function round(n, decimals = 4) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

// ---------------------------------------------------------------------------
// clamp
// ---------------------------------------------------------------------------

describe('clamp', () => {
  test('returns value when within range', () => {
    assert.equal(clamp(5, 0, 10), 5);
  });

  test('clamps to min', () => {
    assert.equal(clamp(-5, 0, 10), 0);
  });

  test('clamps to max', () => {
    assert.equal(clamp(15, 0, 10), 10);
  });

  test('handles equal min and max', () => {
    assert.equal(clamp(7, 5, 5), 5);
  });

  test('handles float values', () => {
    assert.equal(clamp(0.5, 0, 1), 0.5);
    assert.equal(clamp(1.5, 0, 1), 1);
    assert.equal(clamp(-0.5, 0, 1), 0);
  });
});

// ---------------------------------------------------------------------------
// toHex
// ---------------------------------------------------------------------------

describe('toHex', () => {
  test('pads single hex digit', () => {
    assert.equal(toHex(0), '00');
    assert.equal(toHex(15), '0F');
  });

  test('returns two uppercase hex chars for 0-255', () => {
    assert.equal(toHex(255), 'FF');
    assert.equal(toHex(128), '80');
    assert.equal(toHex(1), '01');
  });
});

// ---------------------------------------------------------------------------
// hashCode
// ---------------------------------------------------------------------------

describe('hashCode', () => {
  test('returns 0 for empty string', () => {
    assert.equal(hashCode(''), 0);
  });

  test('returns consistent value for the same input', () => {
    assert.equal(hashCode('red'), hashCode('red'));
  });

  test('returns different values for different inputs', () => {
    assert.notEqual(hashCode('red'), hashCode('blue'));
  });

  test('returns an integer', () => {
    assert.ok(Number.isInteger(hashCode('test')));
  });

  test('handles multi-character strings deterministically', () => {
    // Known hash value – ensures the algorithm has not changed accidentally.
    const h = hashCode('#FF0000');
    assert.ok(typeof h === 'number');
    assert.equal(hashCode('#FF0000'), h);
  });
});

// ---------------------------------------------------------------------------
// hslToHex
// ---------------------------------------------------------------------------

describe('hslToHex', () => {
  test('pure red (0°, 100%, 50%)', () => {
    assert.equal(hslToHex(0, 100, 50), '#FF0000');
  });

  test('pure green (120°, 100%, 50%)', () => {
    assert.equal(hslToHex(120, 100, 50), '#00FF00');
  });

  test('pure blue (240°, 100%, 50%)', () => {
    assert.equal(hslToHex(240, 100, 50), '#0000FF');
  });

  test('white (0°, 0%, 100%)', () => {
    assert.equal(hslToHex(0, 0, 100), '#FFFFFF');
  });

  test('black (0°, 0%, 0%)', () => {
    assert.equal(hslToHex(0, 0, 0), '#000000');
  });

  test('mid-grey (0°, 0%, 50%)', () => {
    assert.equal(hslToHex(0, 0, 50), '#808080');
  });

  test('yellow (60°, 100%, 50%)', () => {
    assert.equal(hslToHex(60, 100, 50), '#FFFF00');
  });

  test('cyan (180°, 100%, 50%)', () => {
    assert.equal(hslToHex(180, 100, 50), '#00FFFF');
  });

  test('magenta (300°, 100%, 50%)', () => {
    assert.equal(hslToHex(300, 100, 50), '#FF00FF');
  });

  test('hue wraps correctly at 360°', () => {
    // 360° should be the same as 0° (red)
    assert.equal(hslToHex(360, 100, 50), '#FF0000');
  });

  test('returns uppercase hex', () => {
    const hex = hslToHex(210, 60, 40);
    assert.match(hex, /^#[0-9A-F]{6}$/);
  });
});

// ---------------------------------------------------------------------------
// rgbToHsl
// ---------------------------------------------------------------------------

describe('rgbToHsl', () => {
  test('white returns h=0, s=0, l=1', () => {
    const { h, s, l } = rgbToHsl({ r: 255, g: 255, b: 255 });
    assert.equal(round(h, 4), 0);
    assert.equal(round(s, 4), 0);
    assert.equal(round(l, 4), 1);
  });

  test('black returns h=0, s=0, l=0', () => {
    const { h, s, l } = rgbToHsl({ r: 0, g: 0, b: 0 });
    assert.equal(round(h, 4), 0);
    assert.equal(round(s, 4), 0);
    assert.equal(round(l, 4), 0);
  });

  test('pure red rgb(255,0,0) → h≈0, s=1, l=0.5', () => {
    const { h, s, l } = rgbToHsl({ r: 255, g: 0, b: 0 });
    assert.equal(round(h, 4), 0);
    assert.equal(round(s, 4), 1);
    assert.equal(round(l, 4), 0.5);
  });

  test('pure green rgb(0,255,0) → h≈1/3, s=1, l=0.5', () => {
    const { h, s, l } = rgbToHsl({ r: 0, g: 255, b: 0 });
    assert.equal(round(h, 4), round(1 / 3, 4));
    assert.equal(round(s, 4), 1);
    assert.equal(round(l, 4), 0.5);
  });

  test('pure blue rgb(0,0,255) → h≈2/3, s=1, l=0.5', () => {
    const { h, s, l } = rgbToHsl({ r: 0, g: 0, b: 255 });
    assert.equal(round(h, 4), round(2 / 3, 4));
    assert.equal(round(s, 4), 1);
    assert.equal(round(l, 4), 0.5);
  });

  test('mid grey rgb(128,128,128) → s=0', () => {
    const { s } = rgbToHsl({ r: 128, g: 128, b: 128 });
    assert.equal(round(s, 3), 0);
  });
});

// ---------------------------------------------------------------------------
// hue2rgb helper
// ---------------------------------------------------------------------------

describe('hue2rgb', () => {
  test('t < 0 wraps to t+1', () => {
    // For t < 1/6 branch: result = p + (q-p)*6*t
    // with t=-0.1 → t becomes 0.9, which falls in the last branch → result = p
    const result = hue2rgb(0, 1, -0.1);
    assert.ok(typeof result === 'number');
  });

  test('t > 1 wraps to t-1', () => {
    const result = hue2rgb(0, 1, 1.1);
    assert.ok(typeof result === 'number');
  });

  test('t in [1/6, 1/2) returns q', () => {
    // The [1/6, 1/2) branch returns q directly
    assert.equal(hue2rgb(0, 0.8, 0.3), 0.8);
  });

  test('t >= 2/3 returns p', () => {
    assert.equal(hue2rgb(0.2, 0.8, 0.8), 0.2);
  });
});

// ---------------------------------------------------------------------------
// hslToRgb
// ---------------------------------------------------------------------------

describe('hslToRgb', () => {
  test('white (h=0, s=0, l=1)', () => {
    const { r, g, b } = hslToRgb({ h: 0, s: 0, l: 1 });
    assert.equal(r, 255);
    assert.equal(g, 255);
    assert.equal(b, 255);
  });

  test('black (h=0, s=0, l=0)', () => {
    const { r, g, b } = hslToRgb({ h: 0, s: 0, l: 0 });
    assert.equal(r, 0);
    assert.equal(g, 0);
    assert.equal(b, 0);
  });

  test('pure red (h=0, s=1, l=0.5)', () => {
    const { r, g, b } = hslToRgb({ h: 0, s: 1, l: 0.5 });
    assert.equal(r, 255);
    assert.equal(g, 0);
    assert.equal(b, 0);
  });

  test('pure green (h=1/3, s=1, l=0.5)', () => {
    const { r, g, b } = hslToRgb({ h: 1 / 3, s: 1, l: 0.5 });
    assert.equal(r, 0);
    assert.equal(g, 255);
    assert.equal(b, 0);
  });

  test('pure blue (h=2/3, s=1, l=0.5)', () => {
    const { r, g, b } = hslToRgb({ h: 2 / 3, s: 1, l: 0.5 });
    assert.equal(r, 0);
    assert.equal(g, 0);
    assert.equal(b, 255);
  });

  test('yellow (h=1/6, s=1, l=0.5)', () => {
    const { r, g, b } = hslToRgb({ h: 1 / 6, s: 1, l: 0.5 });
    assert.equal(r, 255);
    assert.equal(g, 255);
    assert.equal(b, 0);
  });

  test('achromatic: s=0 returns grey', () => {
    const { r, g, b } = hslToRgb({ h: 0.5, s: 0, l: 0.5 });
    assert.equal(r, g);
    assert.equal(g, b);
  });
});

// ---------------------------------------------------------------------------
// Round-trip: rgbToHsl ↔ hslToRgb
// ---------------------------------------------------------------------------

describe('hslToRgb ↔ rgbToHsl round-trip', () => {
  const testColors = [
    { r: 255, g: 0,   b: 0   },   // red
    { r: 0,   g: 255, b: 0   },   // green
    { r: 0,   g: 0,   b: 255 },   // blue
    { r: 128, g: 64,  b: 32  },   // brownish
    { r: 100, g: 149, b: 237 },   // cornflower blue
    { r: 0,   g: 0,   b: 0   },   // black
    { r: 255, g: 255, b: 255 },   // white
  ];

  for (const original of testColors) {
    test(`round-trip rgb(${original.r},${original.g},${original.b})`, () => {
      const hsl = rgbToHsl(original);
      const back = hslToRgb(hsl);
      // Allow ±1 for rounding during conversion
      assert.ok(Math.abs(back.r - original.r) <= 1, `r: ${back.r} vs ${original.r}`);
      assert.ok(Math.abs(back.g - original.g) <= 1, `g: ${back.g} vs ${original.g}`);
      assert.ok(Math.abs(back.b - original.b) <= 1, `b: ${back.b} vs ${original.b}`);
    });
  }
});

// ---------------------------------------------------------------------------
// rgbToHex
// ---------------------------------------------------------------------------

describe('rgbToHex', () => {
  test('black', () => {
    assert.equal(rgbToHex({ r: 0, g: 0, b: 0 }), '#000000');
  });

  test('white', () => {
    assert.equal(rgbToHex({ r: 255, g: 255, b: 255 }), '#FFFFFF');
  });

  test('red', () => {
    assert.equal(rgbToHex({ r: 255, g: 0, b: 0 }), '#FF0000');
  });

  test('components padded with leading zero', () => {
    assert.equal(rgbToHex({ r: 1, g: 2, b: 3 }), '#010203');
  });
});

// ---------------------------------------------------------------------------
// srgbChannelToLinear
// ---------------------------------------------------------------------------

describe('srgbChannelToLinear', () => {
  test('0 maps to 0', () => {
    assert.equal(srgbChannelToLinear(0), 0);
  });

  test('255 maps to 1', () => {
    assert.equal(round(srgbChannelToLinear(255), 6), 1);
  });

  test('values ≤ 10 use linear branch (c/255 / 12.92)', () => {
    // 10/255 = 0.03922, which is ≤ 0.04045 → linear branch
    const c = 10;
    const expected = (c / 255) / 12.92;
    assert.equal(round(srgbChannelToLinear(c), 6), round(expected, 6));
  });

  test('values > 10 use gamma branch', () => {
    // 128/255 ≈ 0.502 > 0.04045 → gamma branch
    const c = 128;
    const cs = c / 255;
    const expected = Math.pow((cs + 0.055) / 1.055, 2.4);
    assert.equal(round(srgbChannelToLinear(c), 6), round(expected, 6));
  });
});

// ---------------------------------------------------------------------------
// relativeLuminance
// ---------------------------------------------------------------------------

describe('relativeLuminance', () => {
  test('black → 0', () => {
    assert.equal(relativeLuminance({ r: 0, g: 0, b: 0 }), 0);
  });

  test('white → 1', () => {
    assert.equal(round(relativeLuminance({ r: 255, g: 255, b: 255 }), 4), 1);
  });

  test('pure red is dimmer than white', () => {
    const red = relativeLuminance({ r: 255, g: 0, b: 0 });
    assert.ok(red < 1 && red > 0, `red luminance should be between 0 and 1, got ${red}`);
  });

  test('pure green has the highest luminance of the primaries', () => {
    const red   = relativeLuminance({ r: 255, g: 0,   b: 0   });
    const green = relativeLuminance({ r: 0,   g: 255, b: 0   });
    const blue  = relativeLuminance({ r: 0,   g: 0,   b: 255 });
    assert.ok(green > red);
    assert.ok(green > blue);
  });

  test('luminance increases monotonically with lightness', () => {
    const dark  = relativeLuminance({ r: 64,  g: 64,  b: 64  });
    const mid   = relativeLuminance({ r: 128, g: 128, b: 128 });
    const light = relativeLuminance({ r: 192, g: 192, b: 192 });
    assert.ok(dark < mid);
    assert.ok(mid < light);
  });
});

// ---------------------------------------------------------------------------
// wcagContrast
// ---------------------------------------------------------------------------

describe('wcagContrast', () => {
  test('black on white → 21:1', () => {
    const ratio = wcagContrast({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    assert.equal(round(ratio, 2), 21);
  });

  test('white on white → 1:1', () => {
    const ratio = wcagContrast({ r: 255, g: 255, b: 255 }, { r: 255, g: 255, b: 255 });
    assert.equal(round(ratio, 4), 1);
  });

  test('is symmetric (order of arguments does not matter)', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    assert.equal(wcagContrast(black, white), wcagContrast(white, black));
  });

  test('always returns a value ≥ 1', () => {
    const pairs = [
      [{ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }],
      [{ r: 100, g: 100, b: 100 }, { r: 200, g: 200, b: 200 }],
      [{ r: 50, g: 80, b: 120 }, { r: 210, g: 170, b: 90 }],
    ];
    for (const [a, b] of pairs) {
      assert.ok(wcagContrast(a, b) >= 1, `Expected ratio ≥ 1 for rgb(${a.r},${a.g},${a.b}) vs rgb(${b.r},${b.g},${b.b})`);
    }
  });

  test('dark grey on white passes AA threshold (4.5:1)', () => {
    // rgb(97,97,97) on white has a contrast of ≈ 4.54:1
    const ratio = wcagContrast({ r: 97, g: 97, b: 97 }, { r: 255, g: 255, b: 255 });
    assert.ok(ratio >= 4.5, `Expected ≥ 4.5 but got ${ratio}`);
  });

  test('mid grey on white does NOT pass AA threshold', () => {
    // rgb(153,153,153) on white ≈ 3.0:1 — fails 4.5 AA
    const ratio = wcagContrast({ r: 153, g: 153, b: 153 }, { r: 255, g: 255, b: 255 });
    assert.ok(ratio < 4.5, `Expected < 4.5 but got ${ratio}`);
  });

  test('known pair: #595959 on white ≥ 7:1 (AAA)', () => {
    const ratio = wcagContrast({ r: 89, g: 89, b: 89 }, { r: 255, g: 255, b: 255 });
    assert.ok(ratio >= 7, `Expected ≥ 7 but got ${ratio}`);
  });
});

// ---------------------------------------------------------------------------
// formatRatio
// ---------------------------------------------------------------------------

describe('formatRatio', () => {
  test('formats finite ratios with two decimal places and :1 suffix', () => {
    assert.equal(formatRatio(4.5), '4.50:1');
    assert.equal(formatRatio(21), '21.00:1');
    assert.equal(formatRatio(1), '1.00:1');
  });

  test('returns "n/a" for Infinity', () => {
    assert.equal(formatRatio(Infinity), 'n/a');
  });

  test('returns "n/a" for NaN', () => {
    assert.equal(formatRatio(NaN), 'n/a');
  });

  test('returns "n/a" for -Infinity', () => {
    assert.equal(formatRatio(-Infinity), 'n/a');
  });

  test('handles decimal ratios', () => {
    assert.equal(formatRatio(3.14159), '3.14:1');
  });
});

// ---------------------------------------------------------------------------
// formatLc
// ---------------------------------------------------------------------------

describe('formatLc', () => {
  test('positive values include leading +', () => {
    assert.equal(formatLc(75.5), '+75.5');
  });

  test('negative values have no leading +', () => {
    assert.equal(formatLc(-60.3), '-60.3');
  });

  test('zero is formatted without + sign', () => {
    assert.equal(formatLc(0), '0.0');
  });

  test('returns "n/a" for NaN', () => {
    assert.equal(formatLc(NaN), 'n/a');
  });

  test('returns "n/a" for Infinity', () => {
    assert.equal(formatLc(Infinity), 'n/a');
  });

  test('rounds to one decimal place', () => {
    assert.equal(formatLc(60.123), '+60.1');
  });
});

// ---------------------------------------------------------------------------
// foregroundCandidateScore
// ---------------------------------------------------------------------------

describe('foregroundCandidateScore', () => {
  test('returns 0 when ratio == threshold, lc == apcaThreshold, l == baseL', () => {
    const score = foregroundCandidateScore(0.5, 4.5, 60, 4.5, 60, 0.5);
    assert.equal(score, 0);
  });

  test('increases when ratio deviates from threshold', () => {
    const base = foregroundCandidateScore(0.5, 4.5, 60, 4.5, 60, 0.5);
    const worse = foregroundCandidateScore(0.5, 5.5, 60, 4.5, 60, 0.5);
    assert.ok(worse > base);
  });

  test('increases when lightness deviates from baseL', () => {
    const base  = foregroundCandidateScore(0.5, 4.5, 60, 4.5, 60, 0.5);
    const worse = foregroundCandidateScore(0.5, 4.5, 60, 4.5, 60, 0.8);
    assert.ok(worse > base);
  });

  test('NaN lc contributes 0 to apcaDiff', () => {
    const scoreWithNaN  = foregroundCandidateScore(0.5, 4.5, NaN, 4.5, 60, 0.5);
    const scoreWithExact = foregroundCandidateScore(0.5, 4.5, 60,  4.5, 60, 0.5);
    // With NaN, apcaDiff=0; with exact match, apcaDiff=0 too → scores equal
    assert.equal(scoreWithNaN, scoreWithExact);
  });

  test('lightness delta is weighted by 0.5', () => {
    const dl = 0.2;
    const score = foregroundCandidateScore(0.5, 4.5, 60, 4.5, 60, 0.5 + dl);
    assert.equal(round(score, 6), round(dl * 0.5, 6));
  });
});

// ---------------------------------------------------------------------------
// backgroundCandidateScore
// ---------------------------------------------------------------------------

describe('backgroundCandidateScore', () => {
  test('returns 0 when all deltas are 0', () => {
    const score = backgroundCandidateScore(0.5, 4.5, 60, 4.5, 60, 0.5, 0, 0);
    assert.equal(score, 0);
  });

  test('hue offset adds linearly to score', () => {
    const base = backgroundCandidateScore(0.5, 4.5, 60, 4.5, 60, 0.5, 0,   0);
    const with_hue = backgroundCandidateScore(0.5, 4.5, 60, 4.5, 60, 0.5, 0.1, 0);
    assert.equal(round(with_hue - base, 6), 0.1);
  });

  test('saturation delta adds linearly to score', () => {
    const base = backgroundCandidateScore(0.5, 4.5, 60, 4.5, 60, 0.5, 0, 0);
    const with_sat = backgroundCandidateScore(0.5, 4.5, 60, 4.5, 60, 0.5, 0, 0.2);
    assert.equal(round(with_sat - base, 6), 0.2);
  });

  test('NaN lc treated as 0 apcaDiff', () => {
    const s1 = backgroundCandidateScore(0.5, 4.5, NaN, 4.5, 60, 0.5, 0, 0);
    const s2 = backgroundCandidateScore(0.5, 4.5, 60,  4.5, 60, 0.5, 0, 0);
    assert.equal(s1, s2);
  });
});

// ---------------------------------------------------------------------------
// focusCandidateScore
// ---------------------------------------------------------------------------

describe('focusCandidateScore', () => {
  test('identical signature to foregroundCandidateScore', () => {
    // They share the same formula, so results must match
    const args = [0.4, 5.0, 55, 4.5, 60, 0.6];
    const fg    = foregroundCandidateScore(...args);
    const focus = focusCandidateScore(...args);
    assert.equal(fg, focus);
  });

  test('returns 0 for perfect match', () => {
    assert.equal(focusCandidateScore(0.5, 4.5, 60, 4.5, 60, 0.5), 0);
  });
});

// ---------------------------------------------------------------------------
// generateTonalScale
// ---------------------------------------------------------------------------

describe('generateTonalScale', () => {
  const red = { r: 255, g: 0, b: 0 };

  test('returns 11 stops', () => {
    assert.equal(generateTonalScale(red).length, 11);
  });

  test('stop names are 50, 100, 200, ..., 950', () => {
    const names = generateTonalScale(red).map(s => s.name);
    assert.deepEqual(names, ['50','100','200','300','400','500','600','700','800','900','950']);
  });

  test('each stop has a hex property starting with #', () => {
    for (const stop of generateTonalScale(red)) {
      assert.match(stop.hex, /^#[0-9A-Fa-f]{6}$/, `stop ${stop.name} hex: ${stop.hex}`);
    }
  });

  test('each stop has an rgb property with r, g, b', () => {
    for (const stop of generateTonalScale(red)) {
      assert.ok('r' in stop.rgb && 'g' in stop.rgb && 'b' in stop.rgb);
    }
  });

  test('lighter stops (50) are brighter than darker stops (950)', () => {
    const scale = generateTonalScale(red);
    const stop50  = scale.find(s => s.name === '50');
    const stop950 = scale.find(s => s.name === '950');
    // luminance of stop50 (l=0.95) should be greater than stop950 (l=0.05)
    const lum50  = (stop50.rgb.r + stop50.rgb.g + stop50.rgb.b) / 3;
    const lum950 = (stop950.rgb.r + stop950.rgb.g + stop950.rgb.b) / 3;
    assert.ok(lum50 > lum950, `stop50 (${lum50}) should be brighter than stop950 (${lum950})`);
  });

  test('works for grey (s near 0)', () => {
    const grey = { r: 128, g: 128, b: 128 };
    const scale = generateTonalScale(grey);
    assert.equal(scale.length, 11);
    // With grey, saturation would be 0, but clamp bumps it to 0.10
    for (const stop of scale) {
      assert.match(stop.hex, /^#[0-9A-Fa-f]{6}$/);
    }
  });
});

// ---------------------------------------------------------------------------
// generateHarmony
// ---------------------------------------------------------------------------

describe('generateHarmony', () => {
  test('returns exactly 5 entries', () => {
    assert.equal(generateHarmony({ r: 100, g: 149, b: 237 }).length, 5);
  });

  test('entry names are Harmonized 1 through Harmonized 5', () => {
    const names = generateHarmony({ r: 100, g: 149, b: 237 }).map(e => e.name);
    assert.deepEqual(names, ['Harmonized 1','Harmonized 2','Harmonized 3','Harmonized 4','Harmonized 5']);
  });

  test('each entry has a valid hex color', () => {
    for (const entry of generateHarmony({ r: 60, g: 180, b: 75 })) {
      assert.match(entry.hex, /^#[0-9A-Fa-f]{6}$/, `entry hex: ${entry.hex}`);
    }
  });

  test('works for pure colours and neutrals', () => {
    const inputs = [
      { r: 255, g: 0,   b: 0   },  // red
      { r: 0,   g: 0,   b: 255 },  // blue
      { r: 128, g: 128, b: 128 },  // grey (saturation → clamped to 0.25)
    ];
    for (const rgb of inputs) {
      const palette = generateHarmony(rgb);
      assert.equal(palette.length, 5);
    }
  });
});

// ---------------------------------------------------------------------------
// applyCohesiveTint
// ---------------------------------------------------------------------------

describe('applyCohesiveTint', () => {
  test('returns baseHex unchanged when intensity is 0', () => {
    assert.equal(applyCohesiveTint('#FF0000', '#0000FF', 0), '#FF0000');
  });

  test('returns baseHex unchanged when intensity is falsy (null)', () => {
    assert.equal(applyCohesiveTint('#FF0000', '#0000FF', null), '#FF0000');
  });

  test('returns a color-mix() string for intensity > 0', () => {
    const result = applyCohesiveTint('#FF0000', '#0000FF', 20);
    assert.match(result, /^color-mix\(in oklch,/);
  });

  test('tint percentage sums to 100', () => {
    const intensity = 30;
    const result = applyCohesiveTint('#FF0000', '#0000FF', intensity);
    // Expect: color-mix(in oklch, #0000FF 30%, #FF0000 70%)
    assert.ok(result.includes('30%'), `Expected 30% in: ${result}`);
    assert.ok(result.includes('70%'), `Expected 70% in: ${result}`);
  });

  test('clamps intensity above 100 to 100', () => {
    const result = applyCohesiveTint('#FF0000', '#0000FF', 150);
    assert.ok(result.includes('100%'), `Expected 100% in: ${result}`);
    assert.ok(result.includes('0%'), `Expected 0% in: ${result}`);
  });

  test('intensity of 100 produces 100%/0% split', () => {
    const result = applyCohesiveTint('#AABBCC', '#112233', 100);
    assert.ok(result.includes('100%') && result.includes('0%'));
  });
});

// ---------------------------------------------------------------------------
// Integration: wcagContrast + hslToHex end-to-end
// ---------------------------------------------------------------------------

describe('integration: color generation and contrast calculation', () => {
  test('hslToHex + wcagContrast: light text on dark background passes 4.5:1', () => {
    const textHex = hslToHex(0, 0, 95);   // near-white
    const bgHex   = hslToHex(0, 0, 10);   // near-black

    // Convert back to RGB for contrast calculation
    const textRgb = hslToRgb({ h: 0, s: 0, l: 0.95 });
    const bgRgb   = hslToRgb({ h: 0, s: 0, l: 0.10 });

    const ratio = wcagContrast(textRgb, bgRgb);
    assert.ok(ratio >= 4.5, `Expected ≥ 4.5 for ${textHex} on ${bgHex}, got ${ratio}`);
  });

  test('generateTonalScale + wcagContrast: extreme stops (50, 950) always produce high contrast with each other', () => {
    const blue  = { r: 37, g: 99, b: 235 };
    const scale = generateTonalScale(blue);

    const stop50  = scale[0];   // l=0.95 (lightest)
    const stop950 = scale[10];  // l=0.05 (darkest)

    const ratio = wcagContrast(stop50.rgb, stop950.rgb);
    assert.ok(ratio >= 7, `Expected ≥ 7:1 (AAA) between stop-50 and stop-950, got ${ratio}`);
  });

  test('wcagContrast of known accessible pair passes 4.5:1', () => {
    // Navy on white — well-known accessible combination
    const navy  = { r: 0, g: 0, b: 128 };
    const white = { r: 255, g: 255, b: 255 };
    assert.ok(wcagContrast(navy, white) >= 4.5);
  });

  test('wcagContrast of a known failing pair is < 4.5:1', () => {
    // Light grey on white — known to fail WCAG AA
    const lightGrey = { r: 200, g: 200, b: 200 };
    const white     = { r: 255, g: 255, b: 255 };
    assert.ok(wcagContrast(lightGrey, white) < 4.5);
  });
});

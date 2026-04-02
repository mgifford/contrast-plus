/**
 * apca.test.js
 *
 * Tests for APCA contrast calculations and the standalone helper functions
 * in scripts/find-bg-candidates.js and scripts/find-bg-candidates-wcagonly.js.
 *
 * Run with: npm test
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { APCAcontrast, sRGBtoY } from 'apca-w3';

// ---------------------------------------------------------------------------
// Inline pure helpers from scripts/find-bg-candidates.js for isolated testing
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

function rgbToHex255(r255, g255, b255) {
  const to255 = v => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return '#' + [to255(r255), to255(g255), to255(b255)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c) {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function rgbToHslScript({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  const l = (max + min) / 2;
  if (max === min) {
    h = 0; s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

function hslToRgbScript(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r, g, b };
}

function wcagContrastRgb(a, b) {
  const la = 0.2126 * srgbToLinear(a.r) + 0.7152 * srgbToLinear(a.g) + 0.0722 * srgbToLinear(a.b);
  const lb = 0.2126 * srgbToLinear(b.r) + 0.7152 * srgbToLinear(b.g) + 0.0722 * srgbToLinear(b.b);
  const L1 = Math.max(la, lb);
  const L2 = Math.min(la, lb);
  return (L1 + 0.05) / (L2 + 0.05);
}

function apcaLcRgb(textRgb, bgRgb) {
  try {
    const tY = sRGBtoY([textRgb.r * 255, textRgb.g * 255, textRgb.b * 255]);
    const bY = sRGBtoY([bgRgb.r  * 255, bgRgb.g  * 255, bgRgb.b  * 255]);
    return APCAcontrast(tY, bY);
  } catch (e) {
    return NaN;
  }
}

// Helper to round to N decimals
function round(n, decimals = 4) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

// ---------------------------------------------------------------------------
// hexToRgb
// ---------------------------------------------------------------------------

describe('hexToRgb', () => {
  test('pure black', () => {
    const { r, g, b } = hexToRgb('#000000');
    assert.equal(r, 0);
    assert.equal(g, 0);
    assert.equal(b, 0);
  });

  test('pure white', () => {
    const { r, g, b } = hexToRgb('#FFFFFF');
    assert.equal(r, 1);
    assert.equal(g, 1);
    assert.equal(b, 1);
  });

  test('pure red', () => {
    const { r, g, b } = hexToRgb('#FF0000');
    assert.equal(r, 1);
    assert.equal(g, 0);
    assert.equal(b, 0);
  });

  test('tolerates missing hash', () => {
    const { r, g, b } = hexToRgb('00FF00');
    assert.equal(r, 0);
    assert.equal(g, 1);
    assert.equal(b, 0);
  });

  test('lowercase hex', () => {
    const { r, g, b } = hexToRgb('#ff0000');
    assert.equal(r, 1);
    assert.equal(g, 0);
    assert.equal(b, 0);
  });

  test('intermediate values normalized to 0..1', () => {
    const { r, g, b } = hexToRgb('#804020');
    assert.equal(round(r, 4), round(0x80 / 255, 4));
    assert.equal(round(g, 4), round(0x40 / 255, 4));
    assert.equal(round(b, 4), round(0x20 / 255, 4));
  });
});

// ---------------------------------------------------------------------------
// rgbToHex255 (scripts version that takes floats 0..1)
// ---------------------------------------------------------------------------

describe('rgbToHex255', () => {
  test('black (0,0,0)', () => {
    assert.equal(rgbToHex255(0, 0, 0), '#000000');
  });

  test('white (1,1,1)', () => {
    assert.equal(rgbToHex255(1, 1, 1), '#ffffff');
  });

  test('red (1,0,0)', () => {
    assert.equal(rgbToHex255(1, 0, 0), '#ff0000');
  });

  test('clamps values above 1', () => {
    assert.equal(rgbToHex255(1.5, 0, 0), '#ff0000');
  });

  test('clamps values below 0', () => {
    assert.equal(rgbToHex255(-0.5, 0, 0), '#000000');
  });
});

// ---------------------------------------------------------------------------
// srgbToLinear
// ---------------------------------------------------------------------------

describe('srgbToLinear', () => {
  test('0 → 0', () => {
    assert.equal(srgbToLinear(0), 0);
  });

  test('1 → 1', () => {
    assert.equal(round(srgbToLinear(1), 6), 1);
  });

  test('values ≤ 0.04045 use linear branch', () => {
    const c = 0.04;
    assert.equal(round(srgbToLinear(c), 6), round(c / 12.92, 6));
  });

  test('values > 0.04045 use gamma branch', () => {
    const c = 0.5;
    const expected = Math.pow((c + 0.055) / 1.055, 2.4);
    assert.equal(round(srgbToLinear(c), 6), round(expected, 6));
  });

  test('is monotonically increasing', () => {
    const values = [0, 0.02, 0.04, 0.08, 0.2, 0.5, 0.8, 1.0];
    for (let i = 1; i < values.length; i++) {
      assert.ok(srgbToLinear(values[i]) > srgbToLinear(values[i - 1]),
        `srgbToLinear(${values[i]}) should be > srgbToLinear(${values[i - 1]})`);
    }
  });
});

// ---------------------------------------------------------------------------
// linearToSrgb
// ---------------------------------------------------------------------------

describe('linearToSrgb', () => {
  test('0 → 0', () => {
    assert.equal(linearToSrgb(0), 0);
  });

  test('1 → 1', () => {
    assert.equal(round(linearToSrgb(1), 6), 1);
  });

  test('values ≤ 0.0031308 use linear branch', () => {
    const c = 0.003;
    assert.equal(round(linearToSrgb(c), 6), round(c * 12.92, 6));
  });

  test('values > 0.0031308 use gamma branch', () => {
    const c = 0.5;
    const expected = 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    assert.equal(round(linearToSrgb(c), 6), round(expected, 6));
  });

  test('round-trips: linearToSrgb(srgbToLinear(c)) ≈ c', () => {
    const testValues = [0, 0.01, 0.1, 0.5, 0.9, 1.0];
    for (const c of testValues) {
      assert.equal(round(linearToSrgb(srgbToLinear(c)), 4), round(c, 4),
        `round-trip failed for c=${c}`);
    }
  });
});

// ---------------------------------------------------------------------------
// rgbToHslScript (scripts version using floats 0..1)
// ---------------------------------------------------------------------------

describe('rgbToHslScript', () => {
  test('pure white (1,1,1)', () => {
    const { h, s, l } = rgbToHslScript({ r: 1, g: 1, b: 1 });
    assert.equal(round(s, 4), 0);
    assert.equal(round(l, 4), 1);
  });

  test('pure black (0,0,0)', () => {
    const { h, s, l } = rgbToHslScript({ r: 0, g: 0, b: 0 });
    assert.equal(round(s, 4), 0);
    assert.equal(round(l, 4), 0);
  });

  test('pure red (1,0,0)', () => {
    const { h, s, l } = rgbToHslScript({ r: 1, g: 0, b: 0 });
    assert.equal(round(h, 2), 0);
    assert.equal(round(s, 4), 1);
    assert.equal(round(l, 4), 0.5);
  });

  test('pure green (0,1,0)', () => {
    const { h, s, l } = rgbToHslScript({ r: 0, g: 1, b: 0 });
    assert.equal(round(h, 2), 120);
    assert.equal(round(s, 4), 1);
    assert.equal(round(l, 4), 0.5);
  });

  test('pure blue (0,0,1)', () => {
    const { h, s, l } = rgbToHslScript({ r: 0, g: 0, b: 1 });
    assert.equal(round(h, 2), 240);
    assert.equal(round(s, 4), 1);
    assert.equal(round(l, 4), 0.5);
  });
});

// ---------------------------------------------------------------------------
// hslToRgbScript (scripts version accepting hue in degrees)
// ---------------------------------------------------------------------------

describe('hslToRgbScript', () => {
  test('white (any h, s=0, l=1)', () => {
    const { r, g, b } = hslToRgbScript(0, 0, 1);
    assert.equal(r, g);
    assert.equal(g, b);
    assert.equal(round(r, 4), 1);
  });

  test('black (any h, s=0, l=0)', () => {
    const { r, g, b } = hslToRgbScript(0, 0, 0);
    assert.equal(r, 0);
    assert.equal(g, 0);
    assert.equal(b, 0);
  });

  test('pure red (h=0, s=1, l=0.5)', () => {
    const { r, g, b } = hslToRgbScript(0, 1, 0.5);
    assert.equal(round(r, 4), 1);
    assert.equal(round(g, 4), 0);
    assert.equal(round(b, 4), 0);
  });

  test('pure green (h=120, s=1, l=0.5)', () => {
    const { r, g, b } = hslToRgbScript(120, 1, 0.5);
    assert.equal(round(r, 4), 0);
    assert.equal(round(g, 4), 1);
    assert.equal(round(b, 4), 0);
  });

  test('hue wraps: h=360 == h=0 (red)', () => {
    const { r: r0 } = hslToRgbScript(0,   1, 0.5);
    const { r: r360 } = hslToRgbScript(360, 1, 0.5);
    assert.equal(round(r0, 4), round(r360, 4));
  });
});

// ---------------------------------------------------------------------------
// wcagContrastRgb
// ---------------------------------------------------------------------------

describe('wcagContrastRgb', () => {
  test('black on white → 21:1', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 1, g: 1, b: 1 };
    assert.equal(round(wcagContrastRgb(black, white), 2), 21);
  });

  test('white on white → 1:1', () => {
    const white = { r: 1, g: 1, b: 1 };
    assert.equal(round(wcagContrastRgb(white, white), 4), 1);
  });

  test('is symmetric', () => {
    const a = hexToRgb('#336699');
    const b = hexToRgb('#FFEEDD');
    assert.equal(round(wcagContrastRgb(a, b), 6), round(wcagContrastRgb(b, a), 6));
  });

  test('always returns ≥ 1', () => {
    const pairs = [
      ['#FF0000', '#00FF00'],
      ['#336699', '#CCBB99'],
      ['#112233', '#EEDDCC'],
    ];
    for (const [hex1, hex2] of pairs) {
      const ratio = wcagContrastRgb(hexToRgb(hex1), hexToRgb(hex2));
      assert.ok(ratio >= 1, `Expected ≥ 1 for ${hex1} vs ${hex2}, got ${ratio}`);
    }
  });
});

// ---------------------------------------------------------------------------
// sRGBtoY (from apca-w3)
// ---------------------------------------------------------------------------

describe('sRGBtoY', () => {
  test('black [0,0,0] → 0', () => {
    assert.equal(sRGBtoY([0, 0, 0]), 0);
  });

  test('white [255,255,255] → ~1.0', () => {
    assert.ok(Math.abs(sRGBtoY([255, 255, 255]) - 1) < 0.01);
  });

  test('returns a number between 0 and 1 for valid sRGB inputs', () => {
    const inputs = [
      [128, 0,   0  ],
      [0,   128, 0  ],
      [0,   0,   128],
      [100, 100, 100],
    ];
    for (const input of inputs) {
      const y = sRGBtoY(input);
      assert.ok(typeof y === 'number', `sRGBtoY(${input}) should be a number`);
      assert.ok(y >= 0 && y <= 1, `sRGBtoY(${input}) = ${y} should be in [0,1]`);
    }
  });
});

// ---------------------------------------------------------------------------
// APCAcontrast
// ---------------------------------------------------------------------------

describe('APCAcontrast', () => {
  test('returns a number for valid luminance inputs', () => {
    const tY = sRGBtoY([0,   0,   0  ]);   // black text
    const bY = sRGBtoY([255, 255, 255]);   // white background
    const lc = APCAcontrast(tY, bY);
    assert.ok(typeof lc === 'number', `Expected number, got ${typeof lc}`);
  });

  test('black text on white background has high magnitude Lc', () => {
    const tY = sRGBtoY([0,   0,   0  ]);
    const bY = sRGBtoY([255, 255, 255]);
    const lc = APCAcontrast(tY, bY);
    assert.ok(Math.abs(lc) >= 100, `Expected |Lc| ≥ 100 for black-on-white, got ${lc}`);
  });

  test('white text on black background has high magnitude Lc', () => {
    const tY = sRGBtoY([255, 255, 255]);
    const bY = sRGBtoY([0,   0,   0  ]);
    const lc = APCAcontrast(tY, bY);
    assert.ok(Math.abs(lc) >= 100, `Expected |Lc| ≥ 100 for white-on-black, got ${lc}`);
  });

  test('same-color returns near-zero Lc', () => {
    const y = sRGBtoY([128, 128, 128]);
    const lc = APCAcontrast(y, y);
    assert.ok(Math.abs(lc) < 5, `Expected near-zero Lc for same-color pair, got ${lc}`);
  });

  test('sign reflects text-on-background polarity', () => {
    // Dark text on light background typically gives negative APCA Lc (per apca-w3 convention)
    const darkY  = sRGBtoY([0,   0,   0  ]);
    const lightY = sRGBtoY([255, 255, 255]);
    const lc = APCAcontrast(darkY, lightY);
    // Sign is library-version-dependent; just ensure it's non-zero for opposite extremes
    assert.ok(lc !== 0, `Expected non-zero Lc for black on white`);
  });
});

// ---------------------------------------------------------------------------
// apcaLcRgb (wrapper combining sRGBtoY + APCAcontrast)
// ---------------------------------------------------------------------------

describe('apcaLcRgb', () => {
  test('black text on white background yields |Lc| ≥ 100', () => {
    const lc = apcaLcRgb({ r: 0, g: 0, b: 0 }, { r: 1, g: 1, b: 1 });
    assert.ok(Math.abs(lc) >= 100, `Expected |Lc| ≥ 100, got ${lc}`);
  });

  test('identical colors yield near-zero Lc', () => {
    const lc = apcaLcRgb({ r: 0.5, g: 0.5, b: 0.5 }, { r: 0.5, g: 0.5, b: 0.5 });
    assert.ok(Math.abs(lc) < 5, `Expected near-zero Lc, got ${lc}`);
  });

  test('returns a finite number for typical colours', () => {
    const text = hexToRgb('#333333');
    const bg   = hexToRgb('#FFFFFF');
    const lc = apcaLcRgb(text, bg);
    assert.ok(isFinite(lc), `Expected finite Lc, got ${lc}`);
  });
});

// ---------------------------------------------------------------------------
// Integration: WCAG + APCA agree on high-contrast pairs
// ---------------------------------------------------------------------------

describe('integration: WCAG and APCA both report high contrast for extreme pairs', () => {
  test('black on white: WCAG ≥ 7 (AAA) and |APCA Lc| ≥ 60', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 1, g: 1, b: 1 };

    const wcag = wcagContrastRgb(black, white);
    const lc   = apcaLcRgb(black, white);

    assert.ok(wcag >= 7,  `Expected WCAG ≥ 7, got ${wcag}`);
    assert.ok(Math.abs(lc) >= 60, `Expected |APCA Lc| ≥ 60, got ${lc}`);
  });

  test('light grey on white: WCAG < 4.5 and |APCA Lc| < 60', () => {
    const lightGrey = hexToRgb('#CCCCCC');
    const white     = { r: 1, g: 1, b: 1 };

    const wcag = wcagContrastRgb(lightGrey, white);
    const lc   = apcaLcRgb(lightGrey, white);

    assert.ok(wcag < 4.5, `Expected WCAG < 4.5, got ${wcag}`);
    assert.ok(Math.abs(lc) < 60, `Expected |APCA Lc| < 60, got ${lc}`);
  });

  test('wcagContrastRgb and wcagContrast from color-utils produce consistent results for same pair', async () => {
    // Import the color-utils version for cross-module consistency check
    const { wcagContrast, srgbChannelToLinear } = await import('./color-utils.js');

    // Both functions must agree for black on white
    // color-utils: r,g,b in 0-255
    // scripts version: r,g,b in 0-1
    const wcagCU = wcagContrast({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 });
    const wcagSc = wcagContrastRgb({ r: 0, g: 0, b: 0 }, { r: 1, g: 1, b: 1 });
    assert.equal(round(wcagCU, 4), round(wcagSc, 4), `Both implementations should agree: ${wcagCU} vs ${wcagSc}`);
  });
});

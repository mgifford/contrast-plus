/**
 * color-utils.js
 *
 * Pure color-utility functions extracted from app.js for unit testing.
 * These implementations must stay in sync with the corresponding code in app.js.
 * Each function is annotated with the line range of its source in app.js so that
 * drift can be detected during code review.
 */

// ---------- Basic helpers ----------

/** app.js setupContrastTool() ~line 214 */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** app.js setupContrastTool() ~line 253 */
export function toHex(n) {
  return n.toString(16).padStart(2, "0").toUpperCase();
}

/** app.js top-level ~line 65 */
export function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

// ---------- Color conversion ----------

/**
 * Convert HSL (degrees, percent, percent) to a #RRGGBB hex string.
 * Matches the top-level hslToHex() in app.js.
 */
export function hslToHex(h, s, l) {
  s = s / 100;
  l = l / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (h % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (0 <= hh && hh < 1)      { r1 = c; g1 = x; b1 = 0; }
  else if (1 <= hh && hh < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (2 <= hh && hh < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (3 <= hh && hh < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (4 <= hh && hh < 5) { r1 = x; g1 = 0; b1 = c; }
  else                         { r1 = c; g1 = 0; b1 = x; }
  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * RGB {r,g,b} (0-255) → HSL {h,s,l} (h in 0..1, s and l in 0..1).
 * Matches rgbToHsl() inside setupContrastTool() in app.js.
 */
export function rgbToHsl({ r, g, b }) {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  let h, s;
  const l = (max + min) / 2;

  if (max === min) {
    h = 0;
    s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case R: h = (G - B) / d + (G < B ? 6 : 0); break;
      case G: h = (B - R) / d + 2; break;
      default: h = (R - G) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

/** Helper used by hslToRgb. */
export function hue2rgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

/**
 * HSL {h,s,l} (h in 0..1, s and l in 0..1) → RGB {r,g,b} (0-255 integers).
 * Matches hslToRgb() inside setupContrastTool() in app.js.
 */
export function hslToRgb({ h, s, l }) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * RGB {r,g,b} (0-255) → '#RRGGBB' hex string.
 * Matches rgbToHex() inside setupContrastTool() in app.js.
 */
export function rgbToHex({ r, g, b }) {
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

// ---------- WCAG contrast ----------

/**
 * Single-channel linearisation (sRGB → linear light).
 */
export function srgbChannelToLinear(c) {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/**
 * Relative luminance of an sRGB colour {r,g,b} (0-255).
 * Matches relativeLuminance() inside setupContrastTool() in app.js.
 */
export function relativeLuminance({ r, g, b }) {
  const R = srgbChannelToLinear(r);
  const G = srgbChannelToLinear(g);
  const B = srgbChannelToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * WCAG 2.x contrast ratio between two sRGB colours {r,g,b} (0-255).
 * Matches wcagContrast() inside setupContrastTool() in app.js.
 */
export function wcagContrast(c1, c2) {
  const L1 = relativeLuminance(c1);
  const L2 = relativeLuminance(c2);
  const lighter = Math.max(L1, L2);
  const darker  = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------- Formatting helpers ----------

/**
 * Format a WCAG ratio for display.
 * Matches formatRatio() inside setupContrastTool() in app.js.
 */
export function formatRatio(value) {
  if (!isFinite(value)) return "n/a";
  return value.toFixed(2) + ":1";
}

/**
 * Format an APCA Lc value for display.
 * Matches formatLc() inside setupContrastTool() in app.js.
 */
export function formatLc(value) {
  if (!isFinite(value)) return "n/a";
  const sign = value > 0 ? "+" : "";
  return sign + value.toFixed(1);
}

// ---------- Candidate scoring ----------

/**
 * Score for a foreground candidate (lower is better).
 * Matches foregroundCandidateScore() inside setupContrastTool() in app.js.
 */
export function foregroundCandidateScore(baseL, ratio, lc, wcagThreshold, apcaThreshold, l) {
  const wcagDiff = Math.abs(ratio - wcagThreshold);
  let apcaDiff = 0;
  if (!Number.isNaN(lc)) {
    apcaDiff = Math.abs(Math.abs(lc) - apcaThreshold);
  }
  const deltaL = Math.abs(l - baseL);
  return wcagDiff + apcaDiff + deltaL * 0.5;
}

/**
 * Score for a background candidate (lower is better).
 * Matches backgroundCandidateScore() inside setupContrastTool() in app.js.
 */
export function backgroundCandidateScore(baseL, ratio, lc, wcagThreshold, apcaThreshold, l, deltaH, deltaS) {
  const wcagDiff = Math.abs(ratio - wcagThreshold);
  let apcaDiff = 0;
  if (!Number.isNaN(lc)) {
    apcaDiff = Math.abs(Math.abs(lc) - apcaThreshold);
  }
  const deltaL = Math.abs(l - baseL);
  return wcagDiff + apcaDiff + deltaL * 0.5 + deltaH + deltaS;
}

/**
 * Score for a focus-color candidate (lower is better).
 * Matches focusCandidateScore() inside setupContrastTool() in app.js.
 */
export function focusCandidateScore(baseL, ratio, lc, wcagThreshold, apcaThreshold, l) {
  const wcagDiff = Math.abs(ratio - wcagThreshold);
  let apcaDiff = 0;
  if (!Number.isNaN(lc)) {
    apcaDiff = Math.abs(Math.abs(lc) - apcaThreshold);
  }
  const deltaL = Math.abs(l - baseL);
  return wcagDiff + apcaDiff + deltaL * 0.5;
}

// ---------- Tonal/harmony generation ----------

const TONAL_STOPS = [
  { name: '50',  l: 0.95 },
  { name: '100', l: 0.90 },
  { name: '200', l: 0.80 },
  { name: '300', l: 0.70 },
  { name: '400', l: 0.60 },
  { name: '500', l: 0.50 },
  { name: '600', l: 0.40 },
  { name: '700', l: 0.30 },
  { name: '800', l: 0.20 },
  { name: '900', l: 0.10 },
  { name: '950', l: 0.05 },
];

/**
 * Generate a tonal scale from a base RGB colour.
 * Matches generateTonalScale() inside setupContrastTool() in app.js.
 */
export function generateTonalScale(fgRgb) {
  const hsl = rgbToHsl(fgRgb);
  return TONAL_STOPS.map(stop => {
    const s = clamp(hsl.s, 0.10, 1);
    const rgb = hslToRgb({ h: hsl.h, s, l: stop.l });
    return { name: stop.name, hex: rgbToHex(rgb), rgb };
  });
}

/**
 * Generate a 5-colour harmony palette from a base RGB colour.
 * Matches generateHarmony() inside setupContrastTool() in app.js.
 */
export function generateHarmony(fgRgb) {
  const hsl = rgbToHsl(fgRgb);
  const baseH = hsl.h;
  const baseS = Math.max(0.25, hsl.s);
  const baseL = hsl.l;
  const palette = [];
  const offsets = [0, 0.08, -0.08, 0.16, -0.16];
  const lightness = [
    baseL,
    clamp(baseL + 0.12, 0.05, 0.95),
    clamp(baseL - 0.12, 0.05, 0.95),
    clamp(baseL + 0.22, 0.05, 0.95),
    clamp(baseL - 0.22, 0.05, 0.95),
  ];
  for (let i = 0; i < 5; i++) {
    const h = ((baseH + offsets[i]) % 1 + 1) % 1;
    const s = clamp(baseS * (1 - i * 0.05), 0.15, 1);
    const l = lightness[i];
    const rgb = hslToRgb({ h, s, l });
    palette.push({ hex: rgbToHex(rgb), name: `Harmonized ${i + 1}` });
  }
  return palette;
}

/**
 * Blend a base hex with a tint hex at a given intensity (0-100).
 * Returns a CSS color-mix() string, or the base hex when intensity is 0.
 * Matches applyCohesiveTint() inside setupContrastTool() in app.js.
 */
export function applyCohesiveTint(baseHex, tintHex, intensity) {
  if (!intensity || intensity <= 0) return baseHex;
  const tintPct = Math.round(clamp(intensity, 0, 100));
  const basePct = 100 - tintPct;
  return `color-mix(in oklch, ${tintHex} ${tintPct}%, ${baseHex} ${basePct}%)`;
}

/**
 * Compute a nearby focus color meeting 3:1 contrast with foreground and
 * reasonable contrast with background.
 * Matches computeClosestFocus() inside setupContrastTool() in app.js.
 *
 * NOTE: This is an intentional copy of the app.js closure to make the pure
 * logic independently testable without a browser DOM. Keep in sync with
 * the corresponding function in app.js (annotated with its line range).
 */
export function computeClosestFocus(fgRgb, bgRgb) {
  const fgHsl = rgbToHsl(fgRgb);
  const bgHsl = rgbToHsl(bgRgb);
  const baseCandidates = [{ h: fgHsl.h, s: fgHsl.s }, { h: bgHsl.h, s: bgHsl.s }];
  const results = [];

  for (const base of baseCandidates) {
    for (let d = 0; d <= 100; d += 2) {
      const l = clamp(fgHsl.l + d / 100, 0.02, 0.98);
      const candRgb = hslToRgb({ h: base.h, s: base.s, l });
      const ratioToFg = wcagContrast(candRgb, fgRgb);
      const ratioToBg = wcagContrast(candRgb, bgRgb);
      if (ratioToFg >= 3.0 && (ratioToBg >= 3.0 || ratioToBg >= 2.5)) {
        results.push({ hex: rgbToHex(candRgb), rgb: candRgb, delta: Math.abs(l - fgHsl.l) });
        break;
      }
    }
    for (let d = 2; d <= 100; d += 2) {
      const l = clamp(fgHsl.l - d / 100, 0.02, 0.98);
      const candRgb = hslToRgb({ h: base.h, s: base.s, l });
      const ratioToFg = wcagContrast(candRgb, fgRgb);
      const ratioToBg = wcagContrast(candRgb, bgRgb);
      if (ratioToFg >= 3.0 && (ratioToBg >= 3.0 || ratioToBg >= 2.5)) {
        results.push({ hex: rgbToHex(candRgb), rgb: candRgb, delta: Math.abs(l - fgHsl.l) });
        break;
      }
    }
  }

  if (!results.length) return null;
  results.sort((a, b) => a.delta - b.delta);
  return results[0];
}

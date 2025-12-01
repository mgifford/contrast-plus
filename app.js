// app.js
// Client-side APCA + WCAG 2.x contrast checker with suggestion support.

let APCAcontrast = null;
let APCA_sRGBtoY = null;

// Try to dynamically import APCA. If it fails, we still run the rest.
(async function init() {
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/apca-w3@0.1.9/+esm");
    APCAcontrast = mod.APCAcontrast;
    // helper to convert sRGB (0-255) to the Y value expected by APCAcontrast
    APCA_sRGBtoY = mod.sRGBtoY || null;
  } catch (e) {
    console.warn("APCA module could not be loaded. APCA results will be n/a.", e);
  }
  setupContrastTool();
})();

// Ensure random helpers are available globally for event handlers
// Simple HSL -> HEX converter (expects h in degrees 0-360, s and l in percent 0-100)
function hslToHex(h, s, l) {
  s = s / 100;
  l = l / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hh = (h % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (0 <= hh && hh < 1) { r1 = c; g1 = x; b1 = 0; }
  else if (1 <= hh && hh < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (2 <= hh && hh < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (3 <= hh && hh < 4) { r1 = 0; g1 = x; b1 = c; }
  else if (4 <= hh && hh < 5) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  const m = l - c / 2;
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  const toHex = (n) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function randomHex() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  const toHex = (n) => n.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function randomLightHex() {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 30) + 50; // 50-80%
  const l = Math.floor(Math.random() * 15) + 70; // 70-85%
  return hslToHex(h, s, l);
}

function randomDarkHex() {
  const h = Math.floor(Math.random() * 360);
  const s = Math.floor(Math.random() * 40) + 40; // 40-80%
  const l = Math.floor(Math.random() * 20) + 8;  // 8-28%
  return hslToHex(h, s, l);
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function setupContrastTool() {
  // ---------- DOM references ----------

  const page = document.getElementById("main");

  const fgText = document.getElementById("fgText");
  const fgPicker = document.getElementById("fgPicker");
  const bgText = document.getElementById("bgText");
  const bgPicker = document.getElementById("bgPicker");
  const thirdText = document.getElementById("thirdText");
  const thirdPicker = document.getElementById("thirdPicker");
  const enableThird = document.getElementById("enableThird");
  const thirdContainer = document.getElementById("thirdContainer");

  const wcagThresholdSelect = document.getElementById("wcagThreshold");
  const apcaThresholdSelect = document.getElementById("apcaThreshold");

  const previewBase = document.getElementById("previewBase");
  const previewThird = document.getElementById("previewThird");
  const previewThirdCard = document.getElementById("previewThirdCard");

  const demoHeadingBase = document.getElementById("demoHeadingBase");
  const demoLinkBase = document.getElementById("demoLinkBase");
  const demoButtonBase = document.querySelector("#demoButtonBase");

  const demoHeadingThird = document.getElementById("demoHeadingThird");
  const demoLinkThird = document.getElementById("demoLinkThird");
  const demoButtonThird = document.querySelector("#demoButtonThird");

  const simToggles = Array.from(document.querySelectorAll(".sim-toggle"));

  // Initialize simulation toggle visual state from aria-pressed attributes
  simToggles.forEach(b => {
    const pressed = b.getAttribute('aria-pressed') === 'true';
    if (pressed) {
      b.classList.add('sim-toggle-active');
      b.classList.remove('btn-secondary');
      b.classList.add('btn-primary');
    } else {
      b.classList.remove('sim-toggle-active');
      b.classList.remove('btn-primary');
      b.classList.add('btn-secondary');
    }
  });

  const errorBox = document.getElementById("errorBox");
  const resultsBody = document.getElementById("resultsBody");
  const focusSummary = document.getElementById("focusSummary");
  const focusText = document.getElementById("focusText");

  const suggestSection = document.getElementById("suggestSection");
  const fgSuggestions = document.getElementById("fgSuggestions");
  const bgSuggestions = document.getElementById("bgSuggestions");
  const thirdSuggestionBlock = document.getElementById("thirdSuggestionBlock");
  const thirdSuggestions = document.getElementById("thirdSuggestions");
  const suggestionStatus = document.getElementById("suggestionStatus");

  const liveRegion = document.getElementById("liveRegion");

  
  const themeButtons = Array.from(document.querySelectorAll("[data-theme-choice]"));

  // Read colors from URL params on load (e.g., ?fg=%23B53636&bg=%234e4c18&third=%23663399)
  function readColorsFromURL() {
    try {
      const params = new URLSearchParams(window.location.search);
      const fgParam = params.get('fg');
      const bgParam = params.get('bg');
      const thirdParam = params.get('third');
      if (fgParam) {
        try { const p = parseCssColor(fgParam); fgText.value = fgText.value || p.hex; fgPicker.value = p.hex; } catch {}
      }
      if (bgParam) {
        try { const p = parseCssColor(bgParam); bgText.value = bgText.value || p.hex; bgPicker.value = p.hex; } catch {}
      }
      if (thirdParam) {
        try { const p = parseCssColor(thirdParam); thirdText.value = thirdText.value || p.hex; thirdPicker.value = p.hex; enableThird.checked = true; thirdContainer.classList.remove('hidden'); } catch {}
      }
    } catch (e) {
      // ignore
    }
  }

  function updateURLWithColors(fgHex, bgHex, thirdHex) {
    try {
      const params = new URLSearchParams(window.location.search);
      if (fgHex) params.set('fg', fgHex);
      else params.delete('fg');
      if (bgHex) params.set('bg', bgHex);
      else params.delete('bg');
      if (thirdHex) params.set('third', thirdHex);
      else params.delete('third');
      const newUrl = window.location.pathname + '?' + params.toString();
      history.replaceState(null, '', newUrl);
    } catch (e) {}
  }

  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === "light" || mode === "dark") {
      root.dataset.theme = mode;
    } else {
      delete root.dataset.theme;
    }
    themeButtons.forEach(btn => {
      if (btn.dataset.themeChoice === mode) {
        btn.classList.add("theme-toggle-active");
      } else if (mode === "system" && btn.dataset.themeChoice === "system") {
        btn.classList.add("theme-toggle-active");
      } else {
        btn.classList.remove("theme-toggle-active");
      }
    });
    try {
      localStorage.setItem("contrastToolTheme", mode);
    } catch {}
  }

// Hidden element used to let the browser parse CSS color strings.
  const parserElement = document.createElement("span");
  parserElement.style.display = "none";
  document.body.appendChild(parserElement);

  let savedTheme = "system";
  try {
    const stored = localStorage.getItem("contrastToolTheme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      savedTheme = stored;
    }
  } catch {}
  applyTheme(savedTheme);

  // ---------- Helpers ----------

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  // Compute a nearby focus color meeting 3:1 with foreground and reasonable contrast with background
  function computeClosestFocus(fgRgb, bgRgb) {
    const fgHsl = rgbToHsl(fgRgb);
    const bgHsl = rgbToHsl(bgRgb);
    const baseCandidates = [ {h: fgHsl.h, s: fgHsl.s}, {h: bgHsl.h, s: bgHsl.s} ];
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

  function toHex(n) {
    return n.toString(16).padStart(2, "0").toUpperCase();
  }

  function rgbToHex({ r, g, b }) {
    return "#" + toHex(r) + toHex(g) + toHex(b);
  }

  function parseCssColor(colorString) {
    parserElement.style.color = "";
    parserElement.style.color = colorString.trim();

    const computed = getComputedStyle(parserElement).color;
    const nums = computed.match(/[\d.]+/g);
    if (!nums || nums.length < 3) {
      throw new Error(`Could not parse color: "${colorString}"`);
    }
    const r = clamp(Math.round(Number(nums[0])), 0, 255);
    const g = clamp(Math.round(Number(nums[1])), 0, 255);
    const b = clamp(Math.round(Number(nums[2])), 0, 255);
    return { r, g, b, hex: rgbToHex({ r, g, b }) };
  }

  function relativeLuminance({ r, g, b }) {
    function channel(c) {
      const cs = c / 255;
      return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
    }
    const R = channel(r);
    const G = channel(g);
    const B = channel(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  function wcagContrast(c1, c2) {
    const L1 = relativeLuminance(c1);
    const L2 = relativeLuminance(c2);
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function apcaLc(textRgb, backgroundRgb) {
    if (!APCAcontrast || !APCA_sRGBtoY) return NaN;
    try {
      const tY = APCA_sRGBtoY([textRgb.r, textRgb.g, textRgb.b]);
      const bY = APCA_sRGBtoY([backgroundRgb.r, backgroundRgb.g, backgroundRgb.b]);
      return APCAcontrast(tY, bY);
    } catch (e) {
      return NaN;
    }
  }

  function rgbToHsl({ r, g, b }) {
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
        case R:
          h = (G - B) / d + (G < B ? 6 : 0);
          break;
        case G:
          h = (B - R) / d + 2;
          break;
        default:
          h = (R - G) / d + 4;
          break;
      }
      h /= 6;
    }

    return { h, s, l };
  }

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  function hslToRgb({ h, s, l }) {
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

  function foregroundCandidateScore(baseL, ratio, lc, wcagThreshold, apcaThreshold, l) {
    const wcagDiff = Math.abs(ratio - wcagThreshold);
    let apcaDiff = 0;
    if (!Number.isNaN(lc)) {
      apcaDiff = Math.abs(Math.abs(lc) - apcaThreshold);
    }
    const deltaL = Math.abs(l - baseL);
    return wcagDiff + apcaDiff + deltaL * 0.5;
  }

  function backgroundCandidateScore(baseL, ratio, lc, wcagThreshold, apcaThreshold, l, deltaH, deltaS) {
    const wcagDiff = Math.abs(ratio - wcagThreshold);
    let apcaDiff = 0;
    if (!Number.isNaN(lc)) {
      apcaDiff = Math.abs(Math.abs(lc) - apcaThreshold);
    }
    const deltaL = Math.abs(l - baseL);
    return wcagDiff + apcaDiff + deltaL * 0.5 + deltaH + deltaS;
  }

  function focusCandidateScore(baseL, ratio, lc, wcagThreshold, apcaThreshold, l) {
    const wcagDiff = Math.abs(ratio - wcagThreshold);
    let apcaDiff = 0;
    if (!Number.isNaN(lc)) {
      apcaDiff = Math.abs(Math.abs(lc) - apcaThreshold);
    }
    const deltaL = Math.abs(l - baseL);
    return wcagDiff + apcaDiff + deltaL * 0.5;
  }

  /**
   * Foreground palette: keep hue/saturation, vary lightness.
   * candidate is treated as TEXT against fixed background.
   * Score tries to keep both color and metrics near threshold.
   */
  function findForegroundPalette(baseTextRgb, bgRgb, wcagThreshold, apcaThreshold, count) {
    const baseHsl = rgbToHsl(baseTextRgb);
    const { h, s, l: baseL } = baseHsl;

    const candidates = [];

    for (let l = 0.02; l <= 0.98 + 1e-9; l += 0.02) {
      const candidateRgb = hslToRgb({ h, s, l });

      const ratio = wcagContrast(candidateRgb, bgRgb);
      const lc = apcaLc(candidateRgb, bgRgb); // text = candidate
      const wcagPass = ratio >= wcagThreshold;
      const apcaPass = !Number.isNaN(lc) ? Math.abs(lc) >= apcaThreshold : true;
      if (!wcagPass || !apcaPass) continue;

      const score = foregroundCandidateScore(baseL, ratio, lc, wcagThreshold, apcaThreshold, l);

      candidates.push({
        rgb: candidateRgb,
        hex: rgbToHex(candidateRgb),
        ratio,
        lc,
        score,
      });
    }

    candidates.sort((a, b) => a.score - b.score);
    return candidates.slice(0, count);
  }

  /**
   * Background palette: try multiple passes to stay close to base hue/sat,
   * but relax saturation and hue slightly if needed. Score prefers
   * combinations that are near thresholds for both WCAG and APCA.
   */
  function findBackgroundPalette(baseBgRgb, fgRgb, wcagThreshold, apcaThreshold, count) {
    const baseHsl = rgbToHsl(baseBgRgb);
    const { h: baseH, s: baseS, l: baseL } = baseHsl;

    const candidates = [];

    function tryPass(hueOffsets, satScales) {
      for (const hOff of hueOffsets) {
        const h = ((baseH + hOff) % 1 + 1) % 1;
        for (const sScale of satScales) {
          const s = clamp(baseS * sScale, 0, 1);
          for (let l = 0.02; l <= 0.98 + 1e-9; l += 0.02) {
            const candidateRgb = hslToRgb({ h, s, l });

            const ratio = wcagContrast(fgRgb, candidateRgb);
            const lc = apcaLc(fgRgb, candidateRgb); // text = fg, bg = candidate
            const wcagPass = ratio >= wcagThreshold;
            const apcaPass = !Number.isNaN(lc) ? Math.abs(lc) >= apcaThreshold : true;
            if (!wcagPass || !apcaPass) continue;

            const deltaH = Math.abs(hOff);
            const deltaS = Math.abs(s - baseS);
            const score = backgroundCandidateScore(baseL, ratio, lc, wcagThreshold, apcaThreshold, l, deltaH, deltaS);

            candidates.push({
              rgb: candidateRgb,
              hex: rgbToHex(candidateRgb),
              ratio,
              lc,
              score,
            });

            if (candidates.length >= count * 4) return;
          }
          if (candidates.length >= count * 4) return;
        }
        if (candidates.length >= count * 4) return;
      }
    }

    // Pass 1: same hue, same saturation.
    tryPass([0], [1]);

    // Pass 2: same hue, slightly reduced saturation (wash out).
    if (candidates.length < count) {
      tryPass([0], [0.9, 0.8, 0.7]);
    }

    // Pass 3: small hue shifts around the original, modest saturation.
    if (candidates.length < count) {
      tryPass([0.03, -0.03, 0.06, -0.06, 0.09, -0.09], [1, 0.9]);
    }

    if (!candidates.length) {
      return [];
    }

    candidates.sort((a, b) => a.score - b.score);

// Enforce minimum lightness spacing so backgrounds are perceptibly different.
const picked = [];
const minDeltaL = 0.08;

for (const c of candidates) {
  if (picked.length === 0) {
    picked.push(c);
  } else {
    const tooClose = picked.some(p => {
      const dl = Math.abs((rgbToHsl(p.rgb).l) - (rgbToHsl(c.rgb).l));
      return dl < minDeltaL;
    });
    if (!tooClose) picked.push(c);
  }
  if (picked.length >= count) break;
}



// Top up if needed
if (picked.length < count) {
  for (const c of candidates) {
    if (picked.includes(c)) continue;
    picked.push(c);
    if (picked.length >= count) break;
  }
}

return picked.slice(0, count);
}

  /**
   * Third/focus palette: treat candidate as FOCUS color, evaluated against background
   * and extra constraints (e.g., 3:1 vs foreground). Score prefers near-threshold
   * combinations that minimally change lightness.
   */
  function findFocusPalette(baseFocusRgb, bgRgb, wcagThreshold, apcaThreshold, count, extraCheck) {
    const baseHsl = rgbToHsl(baseFocusRgb);
    const { h, s, l: baseL } = baseHsl;

    const candidates = [];

    for (let l = 0.02; l <= 0.98 + 1e-9; l += 0.02) {
      const candidateRgb = hslToRgb({ h, s, l });

      const ratioBg = wcagContrast(candidateRgb, bgRgb);
      const lcBg = apcaLc(candidateRgb, bgRgb);
      const wcagPass = ratioBg >= wcagThreshold;
      const apcaPass = !Number.isNaN(lcBg) ? Math.abs(lcBg) >= apcaThreshold : true;
      if (!wcagPass || !apcaPass) continue;

      if (extraCheck && !extraCheck(candidateRgb)) continue;

      const score = focusCandidateScore(baseL, ratioBg, lcBg, wcagThreshold, apcaThreshold, l);

      candidates.push({
        rgb: candidateRgb,
        hex: rgbToHex(candidateRgb),
        ratio: ratioBg,
        lc: lcBg,
        score,
        l,
      });
    }

    candidates.sort((a, b) => a.score - b.score);

// Similar spacing for focus colors so the focus ring options are distinct.
const picked = [];
const minDeltaL = 0.08;

for (const c of candidates) {
  if (picked.length === 0) {
    picked.push(c);
  } else {
    const tooClose = picked.some(p => Math.abs(p.l - c.l) < minDeltaL);
    if (!tooClose) picked.push(c);
  }
  if (picked.length >= count) break;
}

  

if (picked.length < count) {
  for (const c of candidates) {
    if (picked.includes(c)) continue;
    picked.push(c);
    if (picked.length >= count) break;
  }
}

return picked.slice(0, count);
}

  function formatRatio(value) {
    if (!isFinite(value)) return "n/a";
    return value.toFixed(2) + ":1";
  }

  function formatLc(value) {
    if (!isFinite(value)) return "n/a";
    const sign = value > 0 ? "+" : "";
    return sign + value.toFixed(1);
  }

  // label: string, ratio: number, wcagPass: bool, lc: number, apcaPass: bool
  // leftColor/rightColor: optional { display: string, hex: string }
  function addResultRow(label, ratio, wcagPass, lc, apcaPass, leftColor, rightColor) {
    const tr = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;
    tdLabel.setAttribute('data-label', 'Pair');

    // color cell shows small swatches and the original CSS string values for quick copy
    const tdColors = document.createElement('td');
    tdColors.className = 'result-colors';
    tdColors.setAttribute('data-label', 'Colors');
    tdColors.className = 'result-colors';
    function makeColorBlock(info, title) {
      const wrap = document.createElement('div');
      wrap.className = 'result-color-wrap';
      if (!info) return wrap;
      const sw = document.createElement('span');
      sw.className = 'result-swatch';
      sw.style.backgroundColor = info.hex || info.display;
      sw.setAttribute('title', (title ? title + ': ' : '') + (info.display || info.hex));
      const txt = document.createElement('code');
      txt.className = 'result-color-text';
      txt.textContent = info.display || info.hex || '';
      wrap.appendChild(sw);
      wrap.appendChild(txt);
      return wrap;
    }
    // left (text) and right (background/focus) stacked
    tdColors.appendChild(makeColorBlock(leftColor, 'Left'));
    tdColors.appendChild(makeColorBlock(rightColor, 'Right'));

    const tdRatio = document.createElement("td");
    tdRatio.textContent = formatRatio(ratio);
    tdRatio.setAttribute('data-label', 'WCAG ratio');

    const tdWcag = document.createElement("td");
    tdWcag.setAttribute('data-label', 'WCAG status');
    const wcagSpan = document.createElement("span");
    wcagSpan.className =
      "status-badge " + (wcagPass ? "status-pass" : "status-fail");
    wcagSpan.textContent = wcagPass ? "Pass" : "Fail";
    tdWcag.appendChild(wcagSpan);

    const tdLc = document.createElement("td");
    tdLc.textContent = formatLc(lc);
    tdLc.setAttribute('data-label', 'APCA Lc');

    const tdApca = document.createElement("td");
    tdApca.setAttribute('data-label', 'APCA status');
    const apcaSpan = document.createElement("span");
    apcaSpan.className =
      "status-badge " + (apcaPass ? "status-pass" : "status-fail");
    apcaSpan.textContent = apcaPass ? "Pass" : "Fail";
    tdApca.appendChild(apcaSpan);

    tr.appendChild(tdLabel);
    tr.appendChild(tdColors);
    tr.appendChild(tdRatio);
    tr.appendChild(tdWcag);
    tr.appendChild(tdLc);
    tr.appendChild(tdApca);

    resultsBody.appendChild(tr);
  }


  function applyPreviewColors(container, heading, link, button, fgHex, bgHex) {
    if (!container) return;

    container.style.color = fgHex;
    container.style.backgroundColor = bgHex;
    try {
      container.style.setProperty('--preview-fg', fgHex);
      container.style.setProperty('--preview-bg', bgHex);
    } catch (e) {}

    if (heading) heading.style.color = fgHex;
    if (link) {
      link.style.color = fgHex;
      link.style.textDecorationColor = fgHex;
    }
    if (button) {
      button.style.backgroundColor = fgHex;
      button.style.color = bgHex;
      button.style.borderColor = fgHex;
      button.style.boxShadow = "none";
    }
  }

  // --- Local persistence (localStorage fallback) ---
  const PALETTE_KEY = 'contrastplus.savedPalette';

  function loadSavedPalette() {
    try {
      const raw = localStorage.getItem(PALETTE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn('Failed to read saved palette', e);
    }
    return [];
  }

  function savePaletteToStorage(paletteArray) {
    try {
      localStorage.setItem(PALETTE_KEY, JSON.stringify(paletteArray));
    } catch (e) {
      console.warn('Failed to save palette', e);
    }
  }

  function addSavedColor(value) {
    const palette = loadSavedPalette();
    palette.unshift({ id: crypto.randomUUID(), value });
    savePaletteToStorage(palette.slice(0, 50)); // keep last 50
    renderSavedPalette();
  }

  function deleteSavedColor(id) {
    let palette = loadSavedPalette();
    palette = palette.filter(p => p.id !== id);
    savePaletteToStorage(palette);
    renderSavedPalette();
  }

  function renderSavedPalette() {
    const container = document.getElementById('paletteContainer');
    const count = document.getElementById('paletteCount');
    container.innerHTML = '';
    const palette = loadSavedPalette();
    count.textContent = String(palette.length);
    if (!palette.length) {
      const p = document.createElement('p');
      p.id = 'palettePlaceholder';
      p.className = 'small italic';
      p.textContent = 'No saved colors yet. Use the Save buttons near color inputs.';
      container.appendChild(p);
      return;
    }

    palette.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'palette-item';
      // (no inline icon in the saved-palette list; preview icons render in the Preview section)

      const sw = document.createElement('div');
      sw.className = 'palette-swatch';
      sw.style.width = '28px';
      sw.style.height = '28px';
      sw.style.borderRadius = '6px';
      sw.style.backgroundColor = item.value;
      sw.title = item.value;

      const meta = document.createElement('div');
      meta.className = 'palette-meta';
      const val = document.createElement('div');
      val.className = 'palette-value';
      val.textContent = item.value;

      const actions = document.createElement('div');
      actions.className = 'palette-actions';
      const loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.textContent = 'Load as FG';
      loadBtn.addEventListener('click', () => { fgText.value = item.value; fgPicker.value = parseCssColor(item.value).hex; updateAll(); });
      const loadBgBtn = document.createElement('button');
      loadBgBtn.type = 'button';
      loadBgBtn.textContent = 'Load as BG';
      loadBgBtn.addEventListener('click', () => { bgText.value = item.value; bgPicker.value = parseCssColor(item.value).hex; updateAll(); });
      const loadFocusBtn = document.createElement('button');
      loadFocusBtn.type = 'button';
      loadFocusBtn.textContent = 'Load as focus';
      loadFocusBtn.addEventListener('click', () => { thirdText.value = item.value; thirdPicker.value = parseCssColor(item.value).hex; enableThird.checked = true; thirdContainer.classList.remove('hidden'); updateAll(); });
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => { if (item.id) { deleteSavedColor(item.id); } renderSavedPalette(); try { updateBarChart([fgText.value || fgPicker.value, bgText.value || bgPicker.value, (document.getElementById('enableThird') && document.getElementById('enableThird').checked) ? (thirdText.value || thirdPicker.value) : null]); } catch(e){} });

      actions.appendChild(loadBtn);
      actions.appendChild(loadBgBtn);
      actions.appendChild(loadFocusBtn);
      actions.appendChild(delBtn);

      meta.appendChild(val);

      row.appendChild(sw);
      row.appendChild(meta);
      row.appendChild(actions);
      container.appendChild(row);
    });

    // Render preview icons into both preview panels using sequential selection rules
    try {
      const baseIcons = document.getElementById('previewSavedIconsBase');
      const thirdIcons = document.getElementById('previewSavedIconsThird');
      if (baseIcons) baseIcons.innerHTML = '';
      if (thirdIcons) thirdIcons.innerHTML = '';

      // Helper: build a sequential list of colors from saved palette
      const buildSequentialList = (savedArr, bgHex, focusHex, minCount = 4) => {
        const seen = new Set();
        const out = [];
        const normalizedBg = bgHex ? String(bgHex).toLowerCase() : null;

        // include focus first for third preview if provided
        if (focusHex) {
          const fh = String(focusHex);
          if (fh && fh.toLowerCase() !== normalizedBg) {
            out.push(fh);
            seen.add(fh.toLowerCase());
          }
        }

        // then include saved colors in their stored order, skipping any equal to BG
        for (const s of savedArr) {
          const val = String(s.value || '');
          if (!val) continue;
          const low = val.toLowerCase();
          if (normalizedBg && low === normalizedBg) continue;
          if (seen.has(low)) continue;
          out.push(val);
          seen.add(low);
        }

        // if fewer than minCount, add deterministic random-ish fillers (not random order)
        let fillerIndex = 0;
        while (out.length < minCount) {
          // alternate dark and light to maintain variety
          const hex = (fillerIndex % 2 === 0) ? randomDarkHex() : randomLightHex();
          fillerIndex += 1;
          const low = hex.toLowerCase();
          if (normalizedBg && low === normalizedBg) continue;
          if (seen.has(low)) continue;
          out.push(hex);
          seen.add(low);
        }

        return out;
      };

      // current bg and focus values from inputs (best-effort)
      let bgHex = null;
      let focusHex = null;
      try { bgHex = document.getElementById('bgPicker').value; } catch (e) {}
      try { if (document.getElementById('enableThird') && document.getElementById('enableThird').checked) focusHex = document.getElementById('thirdPicker').value; } catch (e) {}

      const seqBase = buildSequentialList(palette, bgHex, null, 4);
      const seqThird = buildSequentialList(palette, bgHex, focusHex, 4);

      const makeBig = (color, containerEl) => {
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'saved-icon-link svg-link';
        link.title = color + ' — click: FG, shift+click: BG, alt+click: Focus';
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const val = color;
          try { updateSVG(val); } catch (err) {}
          if (e.shiftKey) {
            bgText.value = val; bgPicker.value = parseCssColor(val).hex; updateAll();
          } else if (e.altKey) {
            thirdText.value = val; thirdPicker.value = parseCssColor(val).hex; enableThird.checked = true; thirdContainer.classList.remove('hidden'); updateAll();
          } else {
            fgText.value = val; fgPicker.value = parseCssColor(val).hex; updateAll();
          }
        });
        const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgEl.setAttribute('viewBox', '0 0 24 24');
        svgEl.setAttribute('width', '56');
        svgEl.setAttribute('height', '56');
        svgEl.setAttribute('aria-hidden', 'true');
        const pick = SVG_PATHS[Math.abs(hashCode(color)) % SVG_PATHS.length] || SVG_PATHS[0];
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pick.path);
        path.setAttribute('fill', color);
        svgEl.appendChild(path);
        link.appendChild(svgEl);
        containerEl.appendChild(link);
      };

      if (baseIcons) seqBase.forEach(c => makeBig(c, baseIcons));
      if (thirdIcons) seqThird.forEach(c => makeBig(c, thirdIcons));
    } catch (e) {
      // non-fatal
    }
    // ensure bar chart reflects the current colors after re-rendering palette
    try { updateBarChart([fgText.value || fgPicker.value, bgText.value || bgPicker.value, (document.getElementById('enableThird') && document.getElementById('enableThird').checked) ? (thirdText.value || thirdPicker.value) : null]); } catch (e) {}
  }

  // --- Harmony generator (no LLM) ---
  function generateHarmony(fgRgb) {
    // Create 5 colors rotating hue and varying lightness
    const hsl = rgbToHsl(fgRgb);
    const baseH = hsl.h;
    const baseS = Math.max(0.25, hsl.s);
    const baseL = hsl.l;
    const palette = [];
    const offsets = [0, 0.08, -0.08, 0.16, -0.16];
    const lightness = [baseL, clamp(baseL + 0.12, 0.05, 0.95), clamp(baseL - 0.12, 0.05, 0.95), clamp(baseL + 0.22, 0.05, 0.95), clamp(baseL - 0.22, 0.05, 0.95)];
    for (let i = 0; i < 5; i++) {
      const h = ((baseH + offsets[i]) % 1 + 1) % 1;
      const s = clamp(baseS * (1 - i * 0.05), 0.15, 1);
      const l = lightness[i];
      const rgb = hslToRgb({ h, s, l });
      palette.push({ hex: rgbToHex(rgb), name: `Harmonized ${i + 1}` });
    }
    return palette;
  }

  function renderHarmonyOutput(palette) {
    const out = document.getElementById('harmonyOutput');
    out.innerHTML = '';
    palette.forEach(c => {
      const card = document.createElement('div');
      card.className = 'harmony-swatch';
      const box = document.createElement('div');
      box.className = 'harmony-box';
      box.style.backgroundColor = c.hex;
      box.title = `${c.name} — ${c.hex}`;
      // clicking the swatch loads to foreground; small controls allow load to BG
      box.addEventListener('click', () => {
        fgText.value = c.hex;
        fgPicker.value = c.hex;
        updateAll();
      });
      const label = document.createElement('div');
      label.className = 'harmony-label';
      label.textContent = `${c.name} · ${c.hex}`;
      const controls = document.createElement('div');
      controls.className = 'harmony-controls-inline';
      const loadFg = document.createElement('button');
      loadFg.type = 'button';
      loadFg.textContent = 'Use FG';
      loadFg.addEventListener('click', () => {
        fgText.value = c.hex;
        fgPicker.value = c.hex;
        updateAll();
      });
      const loadBg = document.createElement('button');
      loadBg.type = 'button';
      loadBg.textContent = 'Use BG';
      loadBg.addEventListener('click', () => {
        bgText.value = c.hex;
        bgPicker.value = c.hex;
        updateAll();
      });
      controls.appendChild(loadFg);
      controls.appendChild(loadBg);
      card.appendChild(box);
      card.appendChild(label);
      card.appendChild(controls);
      out.appendChild(card);
    });
  }

  // --- Small dynamic visuals: bar chart + random SVG ---
  function updateBarChart(colors) {
    // Build entries once and render into both containers using sequential saved colors
    const saved = loadSavedPalette();
    const fgHex = (colors && colors[0]) || null;
    const bgHex = (colors && colors[1]) || null;
    const focusHex = (colors && colors[2]) || null;
    const entries = [];

    if (fgHex) entries.push({ label: 'Foreground', color: fgHex });
    if (focusHex) entries.push({ label: 'Focus', color: focusHex });

    // Helper to normalize hex/string
    const norm = (v) => (v ? String(v).toLowerCase() : '');

    // Add saved colors sequentially, skipping any equal to BG and duplicates
    const normalizedBg = norm(bgHex);
    const added = new Set(entries.map(e => norm(e.color)));

    for (const s of saved) {
      const val = String(s.value || '');
      const low = norm(val);
      if (!val) continue;
      if (normalizedBg && low === normalizedBg) continue; // never include BG color
      if (added.has(low)) continue;
      entries.push({ label: s.label || 'Saved', color: val });
      added.add(low);
    }

    // If fewer than 4 entries, add deterministic filler colors (dark/light alternation)
    let fillerIdx = 0;
    while (entries.length < 4) {
      const hex = (fillerIdx % 2 === 0) ? randomDarkHex() : randomLightHex();
      fillerIdx += 1;
      const low = norm(hex);
      if (normalizedBg && low === normalizedBg) continue;
      if (added.has(low)) continue;
      entries.push({ label: 'Generated', color: hex });
      added.add(low);
    }

    function renderBars(container, highlightFocus) {
      if (!container) return;
      container.innerHTML = '';
      // deterministic heights based on index so both charts align
      const baseCount = entries.length || 1;
      entries.forEach((entry, i) => {
        // produce evenly spaced heights between 48% and 92%
        const min = 48, max = 92;
        const value = Math.round(min + ((max - min) * (i / Math.max(1, baseCount - 1))));
        const bar = document.createElement('div');
        bar.className = 'bar-chart-bar';
        bar.tabIndex = 0;
        bar.setAttribute('role', 'img');
        // determine display color; if this is the focus entry and a focus color was passed, use it
        const isFocusEntry = entry.label && String(entry.label).toLowerCase().includes('focus');
        const displayColor = (isFocusEntry && focusHex) ? focusHex : entry.color;
        bar.dataset.color = displayColor;
        bar.dataset.label = entry.label;
        bar.style.height = `${value}%`;
        bar.style.backgroundColor = displayColor;

        const pct = document.createElement('div');
        pct.className = 'bar-chart-label';
        // show only the resolved color value (hex or css) as requested
        pct.textContent = displayColor;
        // expose the color value as the accessible label for copy/automation
        bar.setAttribute('aria-label', `${displayColor}`);
        bar.appendChild(pct);     

        // add hidden code box to show on hover/focus
        const code = document.createElement('div');
        code.className = 'bar-code';
        const codeId = `bar-code-${i}-${Math.abs(hashCode(entry.color))}`;
        code.id = codeId;
        code.textContent = displayColor;
        bar.appendChild(code);
        bar.setAttribute('aria-describedby', codeId);

        bar.addEventListener('mouseenter', () => { bar.classList.add('bar-hover'); bar.title = displayColor; });
        bar.addEventListener('mouseleave', () => bar.classList.remove('bar-hover'));
        bar.addEventListener('focus', () => bar.classList.add('bar-hover'));
        bar.addEventListener('blur', () => bar.classList.remove('bar-hover'));

        bar.addEventListener('click', (e) => {
          if (e.shiftKey) {
            bgText.value = entry.color; bgPicker.value = parseCssColor(entry.color).hex;
          } else if (e.altKey) {
            thirdText.value = entry.color; thirdPicker.value = parseCssColor(entry.color).hex; enableThird.checked = true; document.getElementById('thirdContainer').classList.remove('hidden');
          } else {
            fgText.value = entry.color; fgPicker.value = parseCssColor(entry.color).hex;
          }
          updateAll();
        });

        if (highlightFocus && entry.label.toLowerCase().includes('focus')) {
          bar.classList.add('bar-focus-highlight');
        }

        container.appendChild(bar);
      });
    }

    renderBars(document.getElementById('barChartContainer'), false);
    renderBars(document.getElementById('barChartContainerThird'), true);
  }

  const SVG_PATHS = [
    { id: 'sun', name: 'Sun', path: 'M12 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm0 17a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zm6.36-12.72a1 1 0 01.707-.293h.001a1 1 0 01.707 1.707l-1.414 1.414a1 1 0 01-1.414-1.414l1.414-1.414zM4.93 19.071a1 1 0 01-.707.293h-.001a1 1 0 01-.707-1.707l1.414-1.414a1 1 0 011.414 1.414l-1.414 1.414zM22 12a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zm-19 0a1 1 0 011-1h2a1 1 0 110 2H3a1 1 0 01-1-1zm16.485-6.636a1 1 0 01-1.414 0l-1.414-1.414a1 1 0 011.414-1.414l1.414 1.414a1 1 0 010 1.414zM4.93 4.93a1 1 0 011.414 0l1.414 1.414a1 1 0 01-1.414 1.414L4.93 6.344a1 1 0 010-1.414zM12 15a3 3 0 100-6 3 3 0 000 6z' },
    { id: 'star', name: 'Star', path: 'M12 2l2.4 7.2h7.6l-6.1 4.5 2.3 7.2L12 17.5l-6.2 4.4 2.3-7.2-6.1-4.5h7.6z' },
    { id: 'heart', name: 'Heart', path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
    { id: 'plus', name: 'Plus', path: 'M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2z' },
    { id: 'circle', name: 'Circle', path: 'M12 2a10 10 0 100 20 10 10 0 000-20z' },
    { id: 'triangle', name: 'Triangle', path: 'M12 4l8 14H4z' },
    { id: 'w3c', name: 'W3C', path: 'M3 3h18v3H3z M3 8h18v13H3z' },
    { id: 'access', name: 'Accessibility', path: 'M12 2a3 3 0 100 6 3 3 0 000-6zm-1 9h2l2 7h-2l-1-4-1 4H9l2-7z' }
  ];

  function updateSVG(color) {
    const container = document.getElementById('svgContainer');
    if (!container) return;
    container.innerHTML = '';

    const iconFiles = ['heart.svg','plus.svg','circle.svg','triangle.svg','w3c.svg','accessibility.svg'];
    const pickFile = iconFiles[Math.floor(Math.random() * iconFiles.length)];
    const url = `icons/${pickFile}`;

    // Try to fetch and inline the SVG (so we can set fill). If that fails, fallback to inline path.
    fetch(url).then(r => {
      if (!r.ok) throw new Error('fetch failed');
      return r.text();
    }).then(text => {
      // parse SVG text and inject color
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) throw new Error('invalid svg');
      // remove width/height so it scales
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      // set viewBox if missing
      if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 24 24');
      // set fill on paths/shape elements
      Array.from(svg.querySelectorAll('path, circle, rect, polygon')).forEach(el => el.setAttribute('fill', color));
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', pickFile.replace('.svg',''));
      container.appendChild(document.importNode(svg, true));
      container.title = pickFile.replace('.svg','') + ' — ' + color;
    }).catch(() => {
      const pick = SVG_PATHS[Math.floor(Math.random() * SVG_PATHS.length)];
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', pick.path);
      p.setAttribute('fill', color);
      svg.appendChild(p);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', pick.name ? pick.name + ' icon' : 'icon');
      container.appendChild(svg);
      container.title = (pick.name ? pick.name + ' — ' : '') + color;
    });

    // clicking svg link applies color as focus (handler uses event delegation via link)
    const link = document.getElementById('svgContainerLink');
    if (link) {
      link.addEventListener('click', (ev) => {
        ev.preventDefault();
        const thirdEnabled = document.getElementById('enableThird');
        if (thirdEnabled && !thirdEnabled.checked) {
          thirdEnabled.checked = true;
          document.getElementById('thirdContainer').classList.remove('hidden');
        }
        const hex = String(color || '#000');
        document.getElementById('thirdText').value = hex;
        document.getElementById('thirdPicker').value = parseCssColor(hex).hex;
        updateAll();
      });
    }
  }
  
  
  function updateSVGThird(color) {
    const container = document.getElementById('svgContainerThird');
    if (!container) return;
    container.innerHTML = '';
    const path = SVG_PATHS[Math.floor(Math.random() * SVG_PATHS.length)];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('fill', color);
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', path.path);
    svg.appendChild(p);
    container.appendChild(svg);
  }

  function applyFocusPreviewColors(container, heading, link, button, fgHex, bgHex, thirdHex) {
    if (!container) return;

    container.style.backgroundColor = bgHex;
    container.style.color = fgHex;
    try {
      container.style.setProperty('--preview-fg', fgHex);
      container.style.setProperty('--preview-bg', bgHex);
      container.style.setProperty('--preview-focus', thirdHex);
    } catch (e) {}

    if (heading) heading.style.color = fgHex;

    if (link) {
      link.style.color = fgHex;
      link.style.textDecorationColor = thirdHex;
      link.style.textDecorationThickness = "3px";
    }

    if (button) {
      button.style.backgroundColor = fgHex;
      button.style.color = bgHex;
      button.style.borderColor = thirdHex;
      button.style.boxShadow = "0 0 0 3px " + thirdHex;
    }
  }

  // ---------- Main update ----------

  function updateAll() {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
    resultsBody.innerHTML = "";
    focusSummary.classList.add("hidden");
    focusText.textContent = "";
    suggestionStatus.textContent = "";
    fgSuggestions.innerHTML = "";
    bgSuggestions.innerHTML = "";
    thirdSuggestions.innerHTML = "";
    suggestSection.classList.add("hidden");
    thirdSuggestionBlock.classList.add("hidden");
    liveRegion.textContent = "";

    const wcagThreshold = Number(wcagThresholdSelect.value) || 4.5;
    const apcaThreshold = Number(apcaThresholdSelect.value) || 60;
    const thirdEnabled = enableThird.checked;

    let fg, bg, third;

    try {
      fg = parseCssColor(fgText.value);
      bg = parseCssColor(bgText.value);
      fgPicker.value = fg.hex;
      bgPicker.value = bg.hex;

      if (thirdEnabled && thirdText.value.trim()) {
        third = parseCssColor(thirdText.value);
        thirdPicker.value = third.hex;
      }
      
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove("hidden");
      liveRegion.textContent = "Error: " + err.message;
      return;
    }

    applyPreviewColors(previewBase, demoHeadingBase, demoLinkBase, demoButtonBase, fg.hex, bg.hex);

    if (thirdEnabled && third) {
      previewThirdCard.classList.remove("hidden");
      applyFocusPreviewColors(previewThird, demoHeadingThird, demoLinkThird, demoButtonThird, fg.hex, bg.hex, third.hex);
      // apply global focus color variable
      try { document.documentElement.style.setProperty('--focus-color', third.hex); } catch (e) {}
    } else {
      previewThirdCard.classList.add("hidden");
      // reset to default focus color when not enabled by removing any inline override
      try { document.documentElement.style.removeProperty('--focus-color'); } catch (e) {}
    }

    // sync URL so colors are shareable
    try { updateURLWithColors(fg.hex, bg.hex, thirdEnabled && third ? third.hex : null); } catch (e) {}

    let liveSummary = [];

    const baseRatio = wcagContrast(fg, bg);
    const baseLc = apcaLc(fg, bg);
    const baseWcagPass = baseRatio >= wcagThreshold;
    const baseApcaPass = !Number.isNaN(baseLc) ? Math.abs(baseLc) >= apcaThreshold : true;
    addResultRow("Foreground and background", baseRatio, baseWcagPass, baseLc, baseApcaPass,
      { display: fgText.value || fg.hex, hex: fg.hex }, { display: bgText.value || bg.hex, hex: bg.hex });

    liveSummary.push(
      `Foreground and background: WCAG ratio ${formatRatio(baseRatio)} ` +
        (baseWcagPass ? "passes" : "fails") +
        `, APCA Lc ${formatLc(baseLc)} ` +
        (baseApcaPass ? "passes." : "fails.")
    );

    let anyFailure = !baseWcagPass || !baseApcaPass;
    let thirdWcagPassBg = true;
    let thirdApcaPassBg = true;
    let focusPass = true;
    let fgThirdRatio = NaN;
    let fgThirdLc = NaN;

    if (thirdEnabled && third) {
      const thirdRatioBg = wcagContrast(third, bg);
      const thirdLcBg = apcaLc(third, bg);
      thirdWcagPassBg = thirdRatioBg >= wcagThreshold;
      thirdApcaPassBg = !Number.isNaN(thirdLcBg) ? Math.abs(thirdLcBg) >= apcaThreshold : true;
      addResultRow("Focus and background", thirdRatioBg, thirdWcagPassBg, thirdLcBg, thirdApcaPassBg,
        { display: thirdText.value || third.hex, hex: third.hex }, { display: bgText.value || bg.hex, hex: bg.hex });

      fgThirdRatio = wcagContrast(fg, third);
      focusPass = fgThirdRatio >= 3.0;
      fgThirdLc = apcaLc(fg, third);
      addResultRow("Foreground and focus (focus delta)", fgThirdRatio, focusPass, fgThirdLc, true,
        { display: fgText.value || fg.hex, hex: fg.hex }, { display: thirdText.value || third.hex, hex: third.hex });

      focusSummary.classList.remove("hidden");
      if (focusPass) {
        focusText.textContent =
          `Focus appearance requirement of 3:1 between unfocused and focused state is satisfied: contrast is ${formatRatio(fgThirdRatio)}.`;
      } else {
        focusText.textContent =
          `Focus appearance requirement of 3:1 between unfocused and focused state is not satisfied: contrast is ${formatRatio(fgThirdRatio)}.`;
      }

      liveSummary.push(
        `Third color on background: WCAG ratio ${formatRatio(thirdRatioBg)} ` +
          (thirdWcagPassBg ? "passes" : "fails") +
          `, APCA Lc ${formatLc(thirdLcBg)} ` +
          (thirdApcaPassBg ? "passes." : "fails.")
      );
      liveSummary.push(
        `Focus contrast between foreground and third color is ${formatRatio(
          fgThirdRatio
        )}, which ${focusPass ? "meets" : "does not meet"} the 3 to 1 requirement.`
      );

      if (!thirdWcagPassBg || !thirdApcaPassBg || !focusPass) {
        anyFailure = true;
      }
    }

    if (anyFailure) {
      suggestSection.classList.remove("hidden");
      const parts = [];

      if (!baseWcagPass || !baseApcaPass) {
        const fgPalette = findForegroundPalette(fg, bg, wcagThreshold, apcaThreshold, 5);
        const bgPalette = findBackgroundPalette(bg, fg, wcagThreshold, apcaThreshold, 5);


      // Fallback: if no nearby foreground colors were found (likely due to APCA or search
      // constraints), generate a few generic WCAG-only suggestions so designers always
      // see some alternatives.
      if (!fgPalette.length) {
        const fallback = [];
        const baseHsl = rgbToHsl(fg);
        const targetLs = [0.15, 0.3, 0.5, 0.7, 0.9];
        for (const l of targetLs) {
          const cand = hslToRgb({ h: baseHsl.h, s: baseHsl.s, l });
          const ratio = wcagContrast(cand, bg);
          if (ratio >= wcagThreshold) {
            fallback.push({ rgb: cand, hex: rgbToHex(cand), ratio, lc: apcaLc(cand, bg) });
          }
        }
        if (!fallback.length) {
          // As an absolute last resort, try black/white.
          [ {hex: "#000000"}, {hex: "#FFFFFF"} ].forEach(c => {
            const candRgb = parseCssColor(c.hex);
            const ratio = wcagContrast(candRgb, bg);
            if (ratio >= wcagThreshold) {
              fallback.push({ rgb: candRgb, hex: c.hex, ratio, lc: apcaLc(candRgb, bg) });
            }
          });
        }
        if (fallback.length) {
          fallback.forEach(sug => {
            const swatch = document.createElement("div");
            swatch.className = "swatch";

            const colorBox = document.createElement("div");
            colorBox.className = "swatch-color";
            colorBox.style.backgroundColor = sug.hex;

            const label = document.createElement("div");
            label.className = "swatch-label";
            label.textContent =
              `${sug.hex} · ${formatRatio(sug.ratio)} · APCA ${formatLc(sug.lc)}`;

            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = "Use as foreground";
            btn.addEventListener("click", () => {
              fgText.value = sug.hex;
              fgPicker.value = sug.hex;
              updateAll();
            });

            swatch.appendChild(colorBox);
            swatch.appendChild(label);
            swatch.appendChild(btn);
            fgSuggestions.appendChild(swatch);
          });
          parts.push("Foreground options were widened to use WCAG-only candidates so that at least some suggestions are always available.");
        } else {
          parts.push("No nearby foreground colors found that satisfy thresholds by adjusting lightness only.");
        }
      } else {
        fgPalette.forEach(sug => {
          const swatch = document.createElement("div");
          swatch.className = "swatch";

          const colorBox = document.createElement("div");
          colorBox.className = "swatch-color";
          colorBox.style.backgroundColor = sug.hex;

          const label = document.createElement("div");
          label.className = "swatch-label";
          label.textContent = `${sug.hex} · ${formatRatio(sug.ratio)} · APCA ${formatLc(sug.lc)}`;

          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = "Use as foreground";
          btn.addEventListener("click", () => {
            fgText.value = sug.hex;
            fgPicker.value = sug.hex;
            updateAll();
          });

          swatch.appendChild(colorBox);
          swatch.appendChild(label);
          swatch.appendChild(btn);
          fgSuggestions.appendChild(swatch);
        });

        parts.push(`Suggested ${fgPalette.length} foreground alternatives that stay close in hue and saturation and near the chosen thresholds.`);
      }


        if (!bgPalette.length) {
          const fallbackBg = [];
          const baseHslBg = rgbToHsl(bg);
          const targetLsBg = [0.15, 0.3, 0.5, 0.7, 0.9];
          for (const l of targetLsBg) {
            const cand = hslToRgb({ h: baseHslBg.h, s: baseHslBg.s, l });
            const ratio = wcagContrast(fg, cand);
            if (ratio >= wcagThreshold) {
              fallbackBg.push({ rgb: cand, hex: rgbToHex(cand), ratio, lc: apcaLc(fg, cand) });
            }
          }
          if (!fallbackBg.length) {
            [ {hex: "#000000"}, {hex: "#FFFFFF"} ].forEach(c => {
              const candRgb = parseCssColor(c.hex);
              const ratio = wcagContrast(fg, candRgb);
              if (ratio >= wcagThreshold) {
                fallbackBg.push({ rgb: candRgb, hex: c.hex, ratio, lc: apcaLc(fg, candRgb) });
              }
            });
          }
          if (fallbackBg.length) {
            fallbackBg.forEach(sug => {
              const swatch = document.createElement("div");
              swatch.className = "swatch";

              const colorBox = document.createElement("div");
              colorBox.className = "swatch-color";
              colorBox.style.backgroundColor = sug.hex;

              const label = document.createElement("div");
              label.className = "swatch-label";
              label.textContent = `${sug.hex} · ${formatRatio(sug.ratio)} · APCA ${formatLc(sug.lc)}`;

              const btn = document.createElement("button");
              btn.type = "button";
              btn.textContent = "Use as background";
              btn.addEventListener("click", () => {
                bgText.value = sug.hex;
                bgPicker.value = sug.hex;
                updateAll();
              });

              swatch.appendChild(colorBox);
              swatch.appendChild(label);
              swatch.appendChild(btn);
              bgSuggestions.appendChild(swatch);
            });

            parts.push("Background options were widened to use WCAG-only candidates so that at least some suggestions are always available.");
          } else {
            parts.push("No nearby background colors found that satisfy thresholds by adjusting lightness, saturation, and hue within a narrow range.");
          }
        } else {
          bgPalette.forEach(sug => {
            const swatch = document.createElement("div");
            swatch.className = "swatch";

            const colorBox = document.createElement("div");
            colorBox.className = "swatch-color";
            colorBox.style.backgroundColor = sug.hex;

            const label = document.createElement("div");
            label.className = "swatch-label";
            label.textContent = `${sug.hex} · ${formatRatio(sug.ratio)} · APCA ${formatLc(sug.lc)}`;

            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = "Use as background";
            btn.addEventListener("click", () => {
              bgText.value = sug.hex;
              bgPicker.value = sug.hex;
              updateAll();
            });

            swatch.appendChild(colorBox);
            swatch.appendChild(label);
            swatch.appendChild(btn);
            bgSuggestions.appendChild(swatch);
          });

          parts.push(`Suggested ${bgPalette.length} background alternatives that stay visually close while aligning better with WCAG and APCA thresholds.`);
        }
      }

      if (thirdEnabled && third && (!thirdWcagPassBg || !focusPass)) {
        thirdSuggestionBlock.classList.remove("hidden");

        const thirdPalette = findFocusPalette(
          third,
          bg,
          wcagThreshold,
          apcaThreshold,
          5,
          candidateRgb => wcagContrast(candidateRgb, fg) >= 3.0
        );

        if (thirdPalette.length) {
          thirdPalette.forEach(sug => {
            const swatch = document.createElement("div");
            swatch.className = "swatch";

            const colorBox = document.createElement("div");
            colorBox.className = "swatch-color";
            colorBox.style.backgroundColor = sug.hex;

            const label = document.createElement("div");
            label.className = "swatch-label";
            label.textContent =
              `${sug.hex} · ${formatRatio(sug.ratio)} · APCA ${formatLc(sug.lc)}`;

            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = "Use as focus color";
            btn.addEventListener("click", () => {
              thirdText.value = sug.hex;
              thirdPicker.value = sug.hex;
              updateAll();
            });

            swatch.appendChild(colorBox);
            swatch.appendChild(label);
            swatch.appendChild(btn);
            thirdSuggestions.appendChild(swatch);
          });

          parts.push(`Suggested ${thirdPalette.length} focus color alternatives that pass thresholds, meet the 3 to 1 focus requirement, and stay close to the original focus color.`);
        } else {
          parts.push("No nearby focus colors found that satisfy both thresholds and the 3 to 1 focus requirement by adjusting lightness only.");
        }
        // If focus still fails, suggest a computed focus color
        if (!thirdPalette.length || !focusPass) {
          const focusSuggestion = computeClosestFocus(fg, bg);
          if (focusSuggestion) {
            const swatch = document.createElement('div');
            swatch.className = 'swatch';
            const colorBox = document.createElement('div');
            colorBox.className = 'swatch-color';
            colorBox.style.backgroundColor = focusSuggestion.hex;
            const label = document.createElement('div');
            label.className = 'swatch-label';
            label.textContent = `${focusSuggestion.hex} · Suggested focus color (minimal change)`;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = 'Use as focus color';
            btn.addEventListener('click', () => {
              thirdText.value = focusSuggestion.hex;
              thirdPicker.value = focusSuggestion.hex;
              enableThird.checked = true;
              thirdContainer.classList.remove('hidden');
              updateAll();
            });
            swatch.appendChild(colorBox);
            swatch.appendChild(label);
            swatch.appendChild(btn);
            thirdSuggestions.appendChild(swatch);
            parts.push('Suggested a nearby focus color optimized for the 3:1 focus requirement.');
          }
        }
      }

      suggestionStatus.textContent = parts.join(" ");
      // Only show the suggestions panel if at least one suggestion swatch was rendered
      const hasSuggestionSwatches = (
        fgSuggestions.children.length > 0 ||
        bgSuggestions.children.length > 0 ||
        thirdSuggestions.children.length > 0
      );
      if (!hasSuggestionSwatches) {
        suggestSection.classList.add("hidden");
      } else {
        suggestSection.classList.remove("hidden");
        liveSummary.push(suggestionStatus.textContent);
      }
    }

    // Update visuals
    try {
      const vizColors = [fg.hex, bg.hex];
      // always render unified bar charts; provide focus color when enabled
      if (thirdEnabled && third) {
        updateBarChart([fg.hex, bg.hex, third.hex]);
        updateSVG(fg.hex);
        updateSVGThird(third.hex);
      } else {
        updateBarChart([fg.hex, bg.hex]);
        updateSVG(fg.hex);
        // clear third visuals
        const c3 = document.getElementById('barChartContainerThird');
        if (c3) c3.innerHTML = '';
        const s3 = document.getElementById('svgContainerThird');
        if (s3) s3.innerHTML = '';
      }
    } catch (e) {
      // non-fatal
    }

    // render saved palette
    renderSavedPalette();

    liveRegion.textContent = liveSummary.join(" ");
  }

  // ---------- Event wiring ----------

  function syncTextFromPicker(picker, textInput) {
    textInput.value = picker.value;
  }

  function nudgeLightness(hex, deltaPercent) {
    try {
      const rgb = parseCssColor(hex);
      const hsl = rgbToHsl(rgb);
      let l = hsl.l * 100;
      l = clamp(l + deltaPercent, 0, 100);
      const newHex = hslToHex(hsl.h * 360, hsl.s * 100, l);
      return newHex;
    } catch (e) {
      return hex;
    }
  }

  function syncPickerFromText(textInput, picker) {
    try {
      const parsed = parseCssColor(textInput.value);
      picker.value = parsed.hex;
    } catch {
      // Ignore until user enters a valid color.
    }
  }

  function attachColorInputEvents(picker, textInput) {
    if (!picker) return;
    picker.addEventListener("input", () => {
      syncTextFromPicker(picker, textInput);
      updateAll();
    });
    picker.addEventListener("change", () => {
      syncTextFromPicker(picker, textInput);
      updateAll();
    });
  }

  attachColorInputEvents(fgPicker, fgText);
  attachColorInputEvents(bgPicker, bgText);
  attachColorInputEvents(thirdPicker, thirdText);

  fgText.addEventListener("input", () => {
    syncPickerFromText(fgText, fgPicker);
    updateAll();
  });
  bgText.addEventListener("input", () => {
    syncPickerFromText(bgText, bgPicker);
    updateAll();
  });
  thirdText.addEventListener("input", () => {
    syncPickerFromText(thirdText, thirdPicker);
    updateAll();
  });

  enableThird.addEventListener("change", () => {
    if (enableThird.checked) {
      thirdContainer.classList.remove("hidden");
    } else {
      thirdContainer.classList.add("hidden");
    }
    updateAll();
  });

  wcagThresholdSelect.addEventListener("change", updateAll);
  apcaThresholdSelect.addEventListener("change", updateAll);

  simToggles.forEach(btn => {
    btn.addEventListener("click", () => {
      const mode = btn.dataset.sim || "normal";
      page.dataset.sim = mode;
      simToggles.forEach(b => {
        b.classList.remove("sim-toggle-active");
        b.setAttribute('aria-pressed', 'false');
        // swap to secondary style
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      });
      btn.classList.add("sim-toggle-active");
      btn.setAttribute('aria-pressed', 'true');
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
      liveRegion.textContent = `Preview simulation set to ${mode}.`;
    });
  });

  // Toggle preview buttons behavior (demo toggles).
  // Attach explicit handlers to each .btn-toggle so clicks and keyboard
  // activation reliably toggle `aria-pressed` and a visual class.
  const previewToggles = Array.from(document.querySelectorAll('.btn-toggle'));
  previewToggles.forEach(btn => {
    // Ensure initial state
    if (!btn.hasAttribute('aria-pressed')) btn.setAttribute('aria-pressed', 'false');
    btn.classList.toggle('btn-toggle-active', btn.getAttribute('aria-pressed') === 'true');

    btn.addEventListener('click', (e) => {
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      btn.classList.toggle('btn-toggle-active', !pressed);
    });

    // Support keyboard activation (Space or Enter)
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
        e.preventDefault();
        btn.click();
      }
    });
  });

  themeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const choice = btn.dataset.themeChoice || "system";
      applyTheme(choice);
      liveRegion.textContent = `Theme set to ${choice}.`;
    });
  });

  // Wire small save buttons (if present)
  const saveFgBtn = document.getElementById('saveFg');
  const saveBgBtn = document.getElementById('saveBg');
  const saveThirdBtn = document.getElementById('saveThird');
  const harmonyButton = document.getElementById('harmonyButton');

  if (saveFgBtn) saveFgBtn.addEventListener('click', () => addSavedColor(fgText.value.trim() || fgPicker.value));
  if (saveBgBtn) saveBgBtn.addEventListener('click', () => addSavedColor(bgText.value.trim() || bgPicker.value));
  if (saveThirdBtn) saveThirdBtn.addEventListener('click', () => addSavedColor(thirdText.value.trim() || thirdPicker.value));
  const findBestFocusBtn = document.getElementById('findBestFocus');
  let focusSuggestionAttempt = 0;
  let _lastFgForSuggestion = null;
  let _lastBgForSuggestion = null;
  if (findBestFocusBtn) findBestFocusBtn.addEventListener('click', () => {
    try {
      const fg = parseCssColor(fgText.value);
      const bg = parseCssColor(bgText.value);
      // Reset attempts if FG/BG changed
      const currentFg = fgText.value || fg.hex;
      const currentBg = bgText.value || bg.hex;
      if (_lastFgForSuggestion !== currentFg || _lastBgForSuggestion !== currentBg) {
        focusSuggestionAttempt = 0;
        _lastFgForSuggestion = currentFg;
        _lastBgForSuggestion = currentBg;
      }

      // Try to find multiple candidate focus colors
      const wcagThreshold = Number(wcagThresholdSelect.value) || 3.0;
      const apcaThreshold = Number(apcaThresholdSelect.value) || 60;

      // Use existing algorithm to search around FG and BG hues
      const candidates = [];
      try {
        const fpal = findFocusPalette(fg, bg, wcagThreshold, apcaThreshold, 8, candidateRgb => wcagContrast(candidateRgb, fg) >= 3.0);
        fpal.forEach(c => candidates.push({ hex: c.hex, score: c.score, ratio: c.ratio, lc: c.lc }));
      } catch (e) {}

      // If none found, try computeClosestFocus for a fallback
      if (!candidates.length) {
        const best = computeClosestFocus(fg, bg);
        if (best && best.hex) candidates.push({ hex: best.hex, score: 0, ratio: wcagContrast(parseCssColor(best.hex), bg), lc: apcaLc(parseCssColor(best.hex), bg) });
      }

      // Score candidates with APCA-aware metric (prefer small deviation from 3:1 and APCA closeness)
      const scored = candidates.map(c => {
        let wcagDiff = Math.abs((c.ratio || 0) - 3.0);
        let apcaDiff = Number.isNaN(c.lc) ? 0 : Math.abs(Math.abs(c.lc) - apcaThreshold);
        return Object.assign({}, c, { combined: wcagDiff + apcaDiff * 0.02 });
      });

      scored.sort((a, b) => a.combined - b.combined);

      const container = document.getElementById('focusCandidates');
      container.innerHTML = '';
      if (!scored.length) {
        container.textContent = 'No focus candidates found.';
        return;
      }

      // Show only one suggestion and cycle through candidates on repeated clicks
      const selectedIndex = focusSuggestionAttempt % Math.max(1, scored.length);
      const selected = scored[selectedIndex];
      focusSuggestionAttempt += 1;
      if (selected) {
        // apply it immediately
        thirdText.value = selected.hex;
        thirdPicker.value = parseCssColor(selected.hex).hex;
        enableThird.checked = true;
        thirdContainer.classList.remove('hidden');
        updateAll();

        // show a single confirmation card
        const c = selected;
        const card = document.createElement('div');
        card.className = 'focus-candidate';
        const sw = document.createElement('span');
        sw.className = 'result-swatch';
        sw.style.backgroundColor = c.hex;
        const meta = document.createElement('div');
        meta.className = 'focus-candidate-meta';
        const title = document.createElement('div');
        title.textContent = `${c.hex} · ${formatRatio(c.ratio || 0)} · APCA ${formatLc(c.lc)}`;
        const note = document.createElement('div');
        note.className = 'small muted';
        note.textContent = 'Applied — click Suggestion again for a different option.';
        meta.appendChild(title);
        meta.appendChild(note);
        card.appendChild(sw);
        card.appendChild(meta);
        container.appendChild(card);
      } else {
        container.textContent = 'No focus candidates found.';
      }

    } catch (e) {
      liveRegion.textContent = 'Could not compute focus color: invalid FG/BG.';
    }
  });
  if (harmonyButton) harmonyButton.addEventListener('click', () => {
    try {
      const fg = parseCssColor(fgText.value);
      const palette = generateHarmony(fg);
      renderHarmonyOutput(palette);
    } catch (e) {
      liveRegion.textContent = 'Could not generate harmony: invalid foreground color.';
    }
  });

  // Render saved palette once at startup
  renderSavedPalette();

  // wire Clear All / Copy Palette (in-case elements exist in HTML)
  const clearBtn = document.getElementById('clearPalette');
  if (clearBtn) clearBtn.addEventListener('click', () => { localStorage.removeItem(PALETTE_KEY); renderSavedPalette(); try { updateBarChart([fgText.value || fgPicker.value, bgText.value || bgPicker.value, (document.getElementById('enableThird') && document.getElementById('enableThird').checked) ? (thirdText.value || thirdPicker.value) : null]); } catch(e){} });
  const copyBtn = document.getElementById('copyPalette');
  if (copyBtn) copyBtn.addEventListener('click', async () => {
    const palette = loadSavedPalette();
    if (!palette || !palette.length) { alert('No saved colors to export'); return; }
    // Build CSV with header: id,hex
    const rows = ['id,hex'];
    for (const p of palette) {
      // escape any double quotes
      const id = String(p.id || '').replace(/"/g, '""');
      const hex = String(p.value || '').replace(/"/g, '""');
      rows.push(`"${id}","${hex}"`);
    }
    const csv = rows.join('\n');
    // Try copying to clipboard
    try {
      await navigator.clipboard.writeText(csv);
    } catch (e) {
      // ignore copy failure, will still trigger download
    }
    // Trigger file download
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'palette.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      alert('Palette exported as CSV (copied to clipboard if supported)');
    } catch (e) {
      alert('Export failed: ' + e);
    }
  });

  // Random button handlers (local scope)
  document.addEventListener('click', (ev) => {
    const t = ev.target;
    if (!t) return;
    const id = t.id || '';
    if (id === 'randomFgDark') {
      const hex = randomDarkHex();
      fgText.value = hex; fgPicker.value = hex; updateAll();
    } else if (id === 'randomFgLight') {
      const hex = randomLightHex();
      fgText.value = hex; fgPicker.value = hex; updateAll();
    } else if (id === 'randomBgDark') {
      const hex = randomDarkHex();
      bgText.value = hex; bgPicker.value = hex; updateAll();
    } else if (id === 'randomBgLight') {
      const hex = randomLightHex();
      bgText.value = hex; bgPicker.value = hex; updateAll();
    } else if (id === 'randomThird') {
      const hex = randomHex();
      thirdText.value = hex; thirdPicker.value = hex;
      if (enableThird && !enableThird.checked) { enableThird.checked = true; thirdContainer.classList.remove('hidden'); }
      updateAll();
    } else if (id === 'randomThirdDark') {
      const hex = randomDarkHex();
      thirdText.value = hex; thirdPicker.value = hex;
      if (enableThird && !enableThird.checked) { enableThird.checked = true; thirdContainer.classList.remove('hidden'); }
      updateAll();
    } else if (id === 'randomThirdLight') {
      const hex = randomLightHex();
      thirdText.value = hex; thirdPicker.value = hex;
      if (enableThird && !enableThird.checked) { enableThird.checked = true; thirdContainer.classList.remove('hidden'); }
      updateAll();
    } else if (id === 'fgLighter') {
      const h = nudgeLightness(fgText.value || fgPicker.value, -6);
      fgText.value = h; fgPicker.value = parseCssColor(h).hex; updateAll();
    } else if (id === 'fgDarker') {
      const h = nudgeLightness(fgText.value || fgPicker.value, 6);
      fgText.value = h; fgPicker.value = parseCssColor(h).hex; updateAll();
    } else if (id === 'bgLighter') {
      const h = nudgeLightness(bgText.value || bgPicker.value, -6);
      bgText.value = h; bgPicker.value = parseCssColor(h).hex; updateAll();
    } else if (id === 'bgDarker') {
      const h = nudgeLightness(bgText.value || bgPicker.value, 6);
      bgText.value = h; bgPicker.value = parseCssColor(h).hex; updateAll();
    } else if (id === 'thirdLighter') {
      const h = nudgeLightness(thirdText.value || thirdPicker.value, -6);
      thirdText.value = h; thirdPicker.value = parseCssColor(h).hex; updateAll();
    } else if (id === 'thirdDarker') {
      const h = nudgeLightness(thirdText.value || thirdPicker.value, 6);
      thirdText.value = h; thirdPicker.value = parseCssColor(h).hex; updateAll();
    }
  });

  // read URL params first (if present) then initial render
  try { readColorsFromURL(); } catch (e) {}
  updateAll();
}

// (removed duplicate global random helpers; random helpers live inside setup)





// === Palette overrides: two-stage search (strict both-thresholds, then WCAG-only) ===

function findForegroundPalette(baseTextRgb, bgRgb, wcagThreshold, apcaThreshold, count) {
  const baseHsl = rgbToHsl(baseTextRgb);
  const baseL = baseHsl.l;
  const strict = [];
  const relaxed = [];

  function consider(hOff, sScale) {
    const h = ((baseHsl.h + hOff) % 1 + 1) % 1;
    const s = clamp(baseHsl.s * sScale, 0, 1);
    for (let l = 0.02; l <= 0.98 + 1e-9; l += 0.02) {
      const candidateRgb = hslToRgb({ h, s, l });
      const ratio = wcagContrast(candidateRgb, bgRgb);
      const lc = apcaLc(candidateRgb, bgRgb);
      if (ratio >= wcagThreshold) {
        const passesApca = !Number.isNaN(lc) && Math.abs(lc) >= apcaThreshold;
        const score = foregroundCandidateScore(baseL, ratio, lc, wcagThreshold, apcaThreshold, l);
        const entry = { rgb: candidateRgb, hex: rgbToHex(candidateRgb), ratio, lc, score, l };
        if (passesApca) strict.push(entry);
        else relaxed.push(entry);
      }
    }
  }

  // Same hue, similar saturation
  consider(0, 1);
  [0.9, 0.8, 1.1].forEach(s => consider(0, s));
  // Small hue shifts around original
  [0.03, -0.03, 0.06, -0.06].forEach(hOff => {
    [1, 0.9].forEach(s => consider(hOff, s));
  });

  function pickSpaced(source) {
    source.sort((a, b) => a.score - b.score);
    const picked = [];
    const minDeltaL = 0.10; // ensure more obvious differences
    for (const c of source) {
      if (picked.length === 0) {
        picked.push(c);
      } else {
        const tooClose = picked.some(p => Math.abs(p.l - c.l) < minDeltaL);
        if (!tooClose) picked.push(c);
      }
      if (picked.length >= count) break;
    }
    if (picked.length < count) {
      for (const c of source) {
        if (picked.includes(c)) continue;
        picked.push(c);
        if (picked.length >= count) break;
      }
    }
    return picked.slice(0, count);
  }

  if (strict.length) {
    return pickSpaced(strict);
  }
  return pickSpaced(relaxed);
}

function findBackgroundPalette(baseBgRgb, fgRgb, wcagThreshold, apcaThreshold, count) {
  const baseHsl = rgbToHsl(baseBgRgb);
  const baseL = baseHsl.l;
  const strict = [];
  const relaxed = [];

  function consider(hOff, sScale) {
    const h = ((baseHsl.h + hOff) % 1 + 1) % 1;
    const s = clamp(baseHsl.s * sScale, 0, 1);
    for (let l = 0.02; l <= 0.98 + 1e-9; l += 0.02) {
      const candidateRgb = hslToRgb({ h, s, l });
      const ratio = wcagContrast(fgRgb, candidateRgb);
      const lc = apcaLc(fgRgb, candidateRgb);
      if (ratio >= wcagThreshold) {
        const passesApca = !Number.isNaN(lc) && Math.abs(lc) >= apcaThreshold;
        const deltaH = Math.abs(hOff);
        const deltaS = Math.abs(s - baseHsl.s);
        const score = backgroundCandidateScore(baseL, ratio, lc, wcagThreshold, apcaThreshold, l, deltaH, deltaS);
        const entry = { rgb: candidateRgb, hex: rgbToHex(candidateRgb), ratio, lc, score };
        if (passesApca) strict.push(entry);
        else relaxed.push(entry);
      }
    }
  }

  consider(0, 1);
  [0.9, 0.8, 0.7].forEach(s => consider(0, s));
  [0.03, -0.03, 0.06, -0.06, 0.09, -0.09].forEach(hOff => {
    [1, 0.9].forEach(s => consider(hOff, s));
  });

  function pickSpaced(source) {
    source.sort((a, b) => a.score - b.score);
    const picked = [];
    const minDeltaL = 0.10;
    for (const c of source) {
      const l = rgbToHsl(c.rgb).l;
      if (picked.length === 0) {
        picked.push({ ...c, l });
      } else {
        const tooClose = picked.some(p => Math.abs(p.l - l) < minDeltaL);
        if (!tooClose) picked.push({ ...c, l });
      }
      if (picked.length >= count) break;
    }
    if (picked.length < count) {
      for (const c of source) {
        if (picked.some(p => p.rgb === c.rgb)) continue;
        const l = rgbToHsl(c.rgb).l;
        picked.push({ ...c, l });
        if (picked.length >= count) break;
      }
    }
    return picked.slice(0, count);
  }

  if (strict.length) {
    return pickSpaced(strict);
  }
  return pickSpaced(relaxed);
}

function findFocusPalette(baseFocusRgb, bgRgb, wcagThreshold, apcaThreshold, count, extraCheck) {
  const baseHsl = rgbToHsl(baseFocusRgb);
  const baseL = baseHsl.l;
  const strict = [];
  const relaxed = [];

  for (let l = 0.02; l <= 0.98 + 1e-9; l += 0.02) {
    const candidateRgb = hslToRgb({ h: baseHsl.h, s: baseHsl.s, l });
    const ratioBg = wcagContrast(candidateRgb, bgRgb);
    const lcBg = apcaLc(candidateRgb, bgRgb);
    if (ratioBg >= wcagThreshold) {
      if (extraCheck && !extraCheck(candidateRgb)) continue;
      const passesApca = !Number.isNaN(lcBg) && Math.abs(lcBg) >= apcaThreshold;
      const score = focusCandidateScore(baseL, ratioBg, lcBg, wcagThreshold, apcaThreshold, l);
      const entry = { rgb: candidateRgb, hex: rgbToHex(candidateRgb), ratio: ratioBg, lc: lcBg, score, l };
      if (passesApca) strict.push(entry);
      else relaxed.push(entry);
    }
  }

  function pickSpaced(source) {
    source.sort((a, b) => a.score - b.score);
    const picked = [];
    const minDeltaL = 0.10;
    for (const c of source) {
      if (picked.length === 0) {
        picked.push(c);
      } else {
        const tooClose = picked.some(p => Math.abs(p.l - c.l) < minDeltaL);
        if (!tooClose) picked.push(c);
      }
      if (picked.length >= count) break;
    }
    if (picked.length < count) {
      for (const c of source) {
        if (picked.includes(c)) continue;
        picked.push(c);
        if (picked.length >= count) break;
      }
    }
    return picked.slice(0, count);
  }

  if (strict.length) {
    return pickSpaced(strict);
  }
  return pickSpaced(relaxed);
}

// app.js
// Client-side APCA + WCAG 2.x contrast checker with suggestion support.

let APCAcontrast = null;

// Try to dynamically import APCA. If it fails, we still run the rest.
(async function init() {
  try {
    const mod = await import("https://cdn.jsdelivr.net/npm/apca-w3@0.1.9/+esm");
    APCAcontrast = mod.APCAcontrast;
  } catch (e) {
    console.warn("APCA module could not be loaded. APCA results will be n/a.", e);
  }
  setupContrastTool();
})();

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
  const demoButtonBase = document.getElementById("demoButtonBase");

  const demoHeadingThird = document.getElementById("demoHeadingThird");
  const demoLinkThird = document.getElementById("demoLinkThird");
  const demoButtonThird = document.getElementById("demoButtonThird");

  const simToggles = Array.from(document.querySelectorAll(".sim-toggle"));

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
    if (!APCAcontrast) return NaN;
    return APCAcontrast(
      [textRgb.r, textRgb.g, textRgb.b],
      [backgroundRgb.r, backgroundRgb.g, backgroundRgb.b]
    );
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

  function addResultRow(label, ratio, wcagPass, lc, apcaPass) {
    const tr = document.createElement("tr");

    const tdLabel = document.createElement("td");
    tdLabel.textContent = label;

    const tdRatio = document.createElement("td");
    tdRatio.textContent = formatRatio(ratio);

    const tdWcag = document.createElement("td");
    const wcagSpan = document.createElement("span");
    wcagSpan.className =
      "status-badge " + (wcagPass ? "status-pass" : "status-fail");
    wcagSpan.textContent = wcagPass ? "Pass" : "Fail";
    tdWcag.appendChild(wcagSpan);

    const tdLc = document.createElement("td");
    tdLc.textContent = formatLc(lc);

    const tdApca = document.createElement("td");
    const apcaSpan = document.createElement("span");
    apcaSpan.className =
      "status-badge " + (apcaPass ? "status-pass" : "status-fail");
    apcaSpan.textContent = apcaPass ? "Pass" : "Fail";
    tdApca.appendChild(apcaSpan);

    tr.appendChild(tdLabel);
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

  function applyFocusPreviewColors(container, heading, link, button, fgHex, bgHex, thirdHex) {
    if (!container) return;

    container.style.backgroundColor = bgHex;
    container.style.color = fgHex;

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
    } else {
      previewThirdCard.classList.add("hidden");
    }

    let liveSummary = [];

    const baseRatio = wcagContrast(fg, bg);
    const baseLc = apcaLc(fg, bg);
    const baseWcagPass = baseRatio >= wcagThreshold;
    const baseApcaPass = !Number.isNaN(baseLc) ? Math.abs(baseLc) >= apcaThreshold : true;
    addResultRow("Foreground and background", baseRatio, baseWcagPass, baseLc, baseApcaPass);

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
      addResultRow("Third and background", thirdRatioBg, thirdWcagPassBg, thirdLcBg, thirdApcaPassBg);

      fgThirdRatio = wcagContrast(fg, third);
      focusPass = fgThirdRatio >= 3.0;
      fgThirdLc = apcaLc(fg, third);
      addResultRow("Foreground and third (focus delta)", fgThirdRatio, focusPass, fgThirdLc, true);

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

          parts.push(`Suggested ${fgPalette.length} foreground alternatives that stay close in hue and saturation and near the chosen thresholds.`);
        } else {
          parts.push("No nearby foreground colors found that satisfy thresholds by adjusting lightness only.");
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
              label.textContent =
                `${sug.hex} · ${formatRatio(sug.ratio)} · APCA ${formatLc(sug.lc)}`;

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
        } else {
          parts.push("No nearby background colors found that satisfy thresholds by adjusting lightness, saturation, and hue within a narrow range.");
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
      }

      suggestionStatus.textContent = parts.join(" ");
      if (parts.length) {
        liveSummary.push(suggestionStatus.textContent);
      }
    }

    liveRegion.textContent = liveSummary.join(" ");
  }

  // ---------- Event wiring ----------

  function syncTextFromPicker(picker, textInput) {
    textInput.value = picker.value;
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
      simToggles.forEach(b => b.classList.remove("sim-toggle-active"));
      btn.classList.add("sim-toggle-active");
      liveRegion.textContent = `Preview simulation set to ${mode}.`;
    });
  });

  themeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const choice = btn.dataset.themeChoice || "system";
      applyTheme(choice);
      liveRegion.textContent = `Theme set to ${choice}.`;
    });
  });

  updateAll();
}



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

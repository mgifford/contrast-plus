# Contrast Plus

A practical contrast checker that reports **both**:
- **WCAG 2.x contrast ratio** (the compliance metric used today in most policies)
- **APCA Lc** (Accessible Perceptual Contrast Algorithm, a perceptual readability metric)

This project includes a web UI (GitHub Pages) titled **“APCA + WCAG 2 Contrast Checker”** that lets you enter colors in modern CSS formats, preview states, and evaluate contrast with both methods.

Live tool: https://mgifford.github.io/contrast-plus/  
Repository: https://github.com/mgifford/contrast-plus

---

## What it does

- Accepts **foreground**, **background**, and an optional **focus/hover (third) color**
- Computes:
  - **WCAG 2.x contrast ratio** using the standard luminance formula
  - **APCA Lc** (loaded via a separate APCA script; if it fails to load, APCA shows `n/a`)
- Provides preview panels for:
  - text, links, buttons, simple icons
  - focus/hover states using a third color
- Offers **suggested nearby colors** that move toward both WCAG and APCA targets
- Includes a **Harmony Palette Generator** (no external API used)
- Allows saving and copying a **Saved Color Palette**

---

## APCA link (required)

APCA reference: https://www.apcacontrast.com/  
The UI also links APCA directly as **“APCA Lc”**.

---

## Interface overview (what you will see)

### Theme
A theme control: **System / Light / Dark**.

### Inputs
#### Foreground
- Color value field
- Picker
- Nudge (+ / −)
- Random
- Dark / Light toggle
- Save

#### Background
Same controls as Foreground.

#### Focus color (optional)
- Checkbox: Enable focus/hover color
- Focus color value field
- Picker
- Nudge (+ / −)
- Random
- Dark / Light toggle
- Save
- Suggestion

### Accepted color formats
Enter colors using modern CSS formats supported by your browser, for example:
`pink`, `#0044cc`, `rgb(10 120 200)`, `hsl(200 40% 40%)`, `lch(60 50 240)`, `oklch(0.7 0.16 250)`.

### Targets (threshold selectors)
#### WCAG 2.x threshold
Target ratio options:
- 4.5:1 (AA normal text)
- 3:1 (AA large text or UI)
- 7:1 (AAA)

#### APCA threshold
Target Lc options:
- 60 (body text)
- 45 (large text or UI)
- 75 (small text)
- 90 (very small text)

### Preview
Preview modes:
Normal, Grayscale, Protanopia, Deuteranopia, Tritanopia, Low Vision

Two preview panels:
- **Foreground on background**: heading, paragraph, link, and button styles (Text, Ghost, Filled, Raised)
- **Focus states exposed**: shows focus/hover appearance using the third color (when enabled)

### Results
A results section showing (conceptually):
- Pair colors
- WCAG ratio and status
- APCA Lc and status

Also includes a section for:
- **Focus appearance (WCAG 2.2 2.4.13)**

### Suggested colors
“Suggested colors that move toward both targets”:
- Adjust foreground (keep background)
- Adjust background (keep foreground)
- Third/focus color on background
Includes an option: **Allow WCAG-only suggestions (ignore APCA target)**

### Palette tools
- **Harmony Palette Generator**: generates a 5-color palette based on the current foreground color (no external API)
- **Saved Color Palette**: save colors, clear all, copy palette

---

## How to interpret the two metrics

- **WCAG 2.x ratio** answers: “Does this meet WCAG 2.x contrast requirements?”
- **APCA Lc** answers: “Is this likely to be readable in practice at this size/weight/polarity?”

APCA is a strong engineering signal for real readability, but do not assume it replaces WCAG 2.x compliance unless your policy explicitly says so.

---

## License

See the LICENSE.txt

---

## Maintainer

Mike Gifford  

## AI Disclosure

Yes. AI was used in creating this tool. There be dragons! 


https://github.com/mgifford

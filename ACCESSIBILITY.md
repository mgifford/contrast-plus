# Accessibility Commitment (ACCESSIBILITY.md)

## 1. Our commitment

We believe accessibility is a subset of quality. contrast-plus is a public-facing web tool to help designers, developers, and accessibility practitioners explore and understand color contrast. We commit to **WCAG 2.2 AA** standards for the application itself and track our progress publicly to remain accountable to our users.

## 2. Real-time health metrics

| Metric | Status / Value |
| :--- | :--- |
| **Open A11y Issues** | [View open accessibility issues](https://github.com/mgifford/contrast-plus/labels/accessibility) |
| **Automated Test Pass Rate** | Monitored via axe scan in CI ([view workflow](.github/workflows/)) |
| **A11y PRs Merged (MTD)** | Tracked in [project insights](https://github.com/mgifford/contrast-plus/pulse) |
| **Browser Support** | Last 2 major versions of Chrome, Firefox, Safari |

## 3. Contributor requirements (the guardrails)

To contribute to this repo, you must follow these guidelines:

- **Semantic HTML:** Use semantic landmarks and heading structure (one `<h1>` per page).
- **Keyboard operability:** All interactive elements must be keyboard operable with visible focus indicators.
- **Labels and instructions:** All inputs must have programmatic labels. Units and context must be clearly explained.
- **Dynamic updates:** Contrast result changes must be announced via `aria-live` or `role="status"`.
- **Color independence:** Do not rely on color alone to convey meaning; provide numeric or text equivalents.
- **Dark/Light mode:** Implement theme switching following [LIGHT_DARK_MODE_ACCESSIBILITY_BEST_PRACTICES](https://github.com/mgifford/ACCESSIBILITY.md/blob/main/examples/LIGHT_DARK_MODE_ACCESSIBILITY_BEST_PRACTICES.md):
  - Default to system preference (`prefers-color-scheme`)
  - Persist user choice in `localStorage`
  - Validate contrast in both light and dark modes
- **No pass/fail certification:** The UI must not imply that any single metric guarantees accessibility.
- **Inclusive language:** Use person-centered, respectful language throughout.

## 4. Reporting and severity taxonomy

Please [open an issue](https://github.com/mgifford/contrast-plus/issues/new) when reporting problems. We prioritize based on:

- **Critical:** A barrier that prevents users from completing core tasks (e.g., inaccessible color picker, broken keyboard navigation).
- **High:** Significant contrast failure or missing label in the tool itself.
- **Medium:** Guidance clarity issues, incomplete examples, or minor contrast gaps.
- **Low:** Minor improvements, typos, or enhancements.

## 5. Automated check coverage

CI workflows run on every pull request and on a monthly schedule:

- **HTML validation** – checks well-formed markup and valid attributes.
- **Axe accessibility scan** – runs `axe-core` against the live GitHub Pages deployment to flag WCAG violations.
- **Spell check** – validates spelling in HTML and Markdown with `cspell`.

See [`.github/workflows/`](.github/workflows/) for the current workflow definitions.

## 6. Browser and assistive technology testing

### Browser support

This project targets the **last 2 major versions** of all major browser engines:

- **Chrome/Chromium** (including Edge, Brave, Opera)
- **Firefox**
- **Safari/WebKit** (macOS and iOS)

### Assistive technology testing

Contributors are encouraged to test with:

- **Screen readers:** JAWS, NVDA, VoiceOver, TalkBack
- **Keyboard navigation:** Tab, arrow keys, standard shortcuts
- **Magnification tools:** Browser zoom (up to 200%), screen magnifiers
- **Voice control:** Dragon, Voice Control

## 7. Dark and light mode support

contrast-plus implements accessible theme switching following the [LIGHT_DARK_MODE_ACCESSIBILITY_BEST_PRACTICES](https://github.com/mgifford/ACCESSIBILITY.md/blob/main/examples/LIGHT_DARK_MODE_ACCESSIBILITY_BEST_PRACTICES.md):

- A single toggle button (sun/moon icon) in the top-right corner of the header allows users to switch between light and dark themes.
- The toggle defaults to the user's OS/browser `prefers-color-scheme` preference when no override exists.
- User overrides are persisted across sessions via `localStorage`.
- The `aria-label` on the toggle button always describes the **action** (e.g., "Switch to dark mode" when currently in light mode).
- CSS custom properties (`--color-text`, `--color-background`, etc.) control all theme-sensitive colors.
- Both light and dark themes are validated to meet WCAG 2.2 AA contrast requirements.
- `@media (forced-colors: active)` styles preserve semantic boundaries in Windows High Contrast mode.

## 8. Known limitations

- contrast-plus is an **educational tool**, not a certification service. Outputs are informational only.
- The APCA Lc metric is loaded via a separate script; if that script fails to load, APCA values show `n/a` as intentional graceful degradation.
- Some visualization panels are inherently color-dependent (they demonstrate contrast). Numeric equivalents are always provided alongside visual previews.
- The application does not claim formal WCAG conformance; it aims to follow WCAG 2.2 AA patterns where feasible.

## 9. AI disclosure

This project uses AI tools during development (see [README.md](README.md#ai-disclosure) for details). **No AI is used at runtime** — all contrast calculations are deterministic mathematical algorithms.

## 10. Getting help

- **Questions or bugs:** [Open an issue](https://github.com/mgifford/contrast-plus/issues)
- **Accessibility feedback:** Use the `accessibility` label when filing issues
- **Contributions:** Follow the guidelines above; keep changes focused and document accessibility impact

## 11. Continuous improvement

We regularly review and update:

- WCAG conformance as standards evolve (currently targeting WCAG 2.2 AA)
- Contrast thresholds and APCA algorithm updates
- Keyboard and screen-reader behavior based on community feedback
- Inclusive language and terminology

## 12. CI/CD Accessibility Best Practices

Integrating accessibility checks into the CI/CD pipeline ensures regressions are caught before they reach users. This section documents the strategy used in contrast-plus and offers guidance for contributors adding new automation.

Full reference: [CI/CD Accessibility Best Practices](https://github.com/mgifford/ACCESSIBILITY.md/blob/main/examples/CI_CD_ACCESSIBILITY_BEST_PRACTICES.md)

### Strategy: Local-First

Run audits locally before pushing. This is the fastest feedback loop and keeps CI noise low.

```bash
# Serve the site locally (matches GitHub Pages behavior)
npm run serve   # python3 -m http.server 8005

# Then, in a second terminal:
npm run test:a11y   # pa11y scan against http://localhost:8005/
npm run check       # HTML validation + spell check
```

### Workflows in this repository

| Workflow file | Trigger | What it checks |
|---|---|---|
| `quality.yml` | Push to `main`, every PR | HTML validation, spell check, pa11y (WCAG 2 AA), link check, basic security |
| `axe-scan.yml` | Push to `main`, monthly | axe-core scan of both pages |
| `a11y-scanner.yml` | Monthly, manual dispatch | GitHub AI accessibility scanner against the live GitHub Pages site |

All workflow definitions live in [`.github/workflows/`](.github/workflows/).

### Governance and SLAs

- **Critical failures** (broken keyboard nav, inaccessible color picker) block merge via the `quality.yml` checks.
- **Scheduled scan findings** from `a11y-scanner.yml` are filed as GitHub Issues with the `accessibility` label.
- If open accessibility issues exist, the monthly scanner is paused automatically to prevent alert fatigue.
- Issues are triaged using the severity taxonomy in [§4](#4-reporting-and-severity-taxonomy) above.

### Extending the pipeline

When adding new interactive features or pages, update CI accordingly:

1. **Add the new URL** to the `urls` list in `a11y-scanner.yml` and to the axe-core scan steps in `axe-scan.yml`.
2. **Test both light and dark themes** — the `prefers-color-scheme` media query affects contrast values.
3. **Test on mobile viewport sizes** — layout changes can introduce new accessibility issues.
4. **Export structured JSON reports** when doing deep audits so findings are reviewable and traceable.

### Alternative tools and resources

- **[Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)** — enforce 100% accessibility and performance scores as a quality gate.
- **[Playwright + axe-core](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)** — dynamic testing including open menus, modals, and theme emulation.
- **[AccessLint](https://github.com/accesslint)** — inline PR comments without a full CI run.
- **[Open-Scans](https://github.com/mgifford/open-scans)** — external scans using multiple engines against a live URL.
- **[CivicActions: Scaling Automation](https://accessibility.civicactions.com/posts/how-we-scale-inclusive-website-content-with-automated-testing-and-open-source-tools)** — enterprise-scale a11y philosophy.

## 13. Color Contrast Best Practices

Because contrast-plus is a tool *about* color contrast, this project holds itself to a higher standard of contrast quality than a typical web application. This section summarizes the rules contributors must follow and the thresholds all UI colors must meet.

Full reference: [Color Contrast Accessibility Best Practices](https://github.com/mgifford/ACCESSIBILITY.md/blob/main/examples/COLOR_CONTRAST_ACCESSIBILITY_BEST_PRACTICES.md)

### Core principle

Sufficient contrast between foreground and background colors is a prerequisite for users to read text, identify UI components, perceive graphical content, and track keyboard focus. Color alone must never be the sole means of conveying information.

All visual interface elements that convey information or require user interaction must meet the applicable WCAG 2.2 Level AA contrast thresholds below. Contrast must be maintained in **light mode, dark mode, and forced-colors (high contrast) mode**.

### WCAG 2.2 requirements overview

| Success Criterion | Level | Requirement | Applies To |
|:---|:---:|:---|:---|
| 1.4.1 Use of Color | A | Color must not be the only visual means of conveying information | All content |
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 for normal text; 3:1 for large text | Text and images of text |
| 1.4.6 Contrast (Enhanced) | AAA | 7:1 for normal text; 4.5:1 for large text | Text and images of text |
| 1.4.11 Non-text Contrast | AA | 3:1 against adjacent colors | UI components, graphical objects |
| 2.4.13 Focus Appearance | AA | Focus indicator ≥ perimeter of component × 2 CSS px; 3:1 contrast change | Keyboard focus indicators |

### Text contrast thresholds (WCAG 1.4.3)

| Text type | Minimum (AA) | Enhanced (AAA) |
|:---|:---:|:---:|
| Normal text (below 18pt / 14pt bold) | **4.5:1** | 7:1 |
| Large text (18pt+ / 14pt+ bold) | **3:1** | 4.5:1 |
| Logotypes, incidental/decorative text, disabled controls | Exempt | Exempt |

**"Large text"** means 18pt (≈ 24 CSS `px`) or larger in regular weight, or 14pt (≈ 18.67 CSS `px`) or larger in bold weight.

### Non-text contrast (WCAG 1.4.11)

Form input borders, interactive component boundaries, meaningful icons, chart elements, and status indicators must all achieve **3:1** against their adjacent colors. Decorative graphics, inactive/disabled components, and logos are exempt.

### Focus appearance (WCAG 2.4.13)

Every keyboard-focusable element must have a visible focus indicator that:

1. Encloses the component with a minimum area of the component's perimeter × 2 CSS pixels.
2. Has **3:1 contrast** between focused and unfocused states.
3. Has **3:1 contrast** against every adjacent color in the unfocused state.

Use `outline` for focus rings — it is preserved in forced-colors mode by default. Never suppress focus visibility with `outline: none` or `outline: 0` without providing an equivalent replacement.

### Forced-colors (high contrast) mode

The CSS `forced-colors` media query replaces author colors with system-defined values. Ensure the UI:

- Uses `outline` (not `box-shadow`) for focus indicators.
- Does not rely on `background-color` gradients or pseudo-element colors to convey information.
- Applies `@media (forced-colors: active)` overrides for SVG icons and custom components as needed.

Test using Chrome DevTools → Rendering → "Emulate CSS media feature forced-colors: active".

### APCA — the emerging standard

The [Advanced Perceptual Contrast Algorithm (APCA)](https://apcacontrast.com/) is the algorithm this tool measures and displays. APCA is **not yet required** by WCAG 2.2 but is expected in WCAG 3.0. Teams should continue to meet WCAG 2.2 AA requirements in parallel and treat APCA as supplemental guidance.

| Content type | Minimum Lc | Recommended Lc |
|:---|:---:|:---:|
| Normal body text (16px / 400 weight) | 60 | 75 |
| Large heading text (24px+ / 700 weight) | 45 | 60 |
| UI component labels | 45 | 60 |
| Placeholder / muted text | 30 | 45 |

Lc values are signed (positive = dark-on-light, negative = light-on-dark); only the absolute value is compared against thresholds.

### Common mistakes

| Mistake | Why it fails | Fix |
|:---|:---|:---|
| `outline: none` with no replacement | Focus invisible for keyboard users (2.4.7, 2.4.13) | Provide a visible custom focus style |
| Low-contrast placeholder text | Placeholder below 4.5:1 fails 1.4.3 | Use a placeholder color ≥ 4.5:1 or place labels outside the field |
| Error states shown only with red color | Color is sole cue (1.4.1) | Add error icon, text label, and `aria-invalid` |
| Contrast checked only in light mode | Dark mode or high contrast mode may fail | Test all modes |
| Gradient background behind text | Contrast varies across the gradient | Verify at the lowest-contrast region or use a solid overlay |
| Icon-only buttons with low-contrast icons | Icon fails 3:1 non-text requirement (1.4.11) | Render icons in a color with ≥ 3:1 contrast against its background |

### Contrast testing checklist

#### Automated
- [ ] Run axe-core `color-contrast` rule against all pages (`npm run test:a11y`)
- [ ] Run `color-contrast-enhanced` rule for AAA coverage
- [ ] Validate focus indicator contrast via axe `focus-order-semantics` and `focus-visible` rules

#### Manual
- [ ] Check text contrast for all text sizes with a contrast checker tool
- [ ] Check non-text contrast for all form controls, icons, and data visualizations
- [ ] Verify focus ring is visible on all interactive elements in default and dark modes
- [ ] Test in Windows High Contrast / forced-colors mode
- [ ] Test at browser zoom 200% and 400%
- [ ] Review all interactive states: default, hover, focus, active, visited, error, disabled
- [ ] View the page in grayscale and confirm all information conveyed by color is also conveyed by text, icons, or patterns

Last updated: 2026-03-31

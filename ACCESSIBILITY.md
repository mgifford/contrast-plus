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

Last updated: 2026-03-29

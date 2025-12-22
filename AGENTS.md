# AGENTS.md

## Project Purpose
contrast-plus is a public-facing web tool focused on exploring, explaining, and improving color contrast in user interfaces.

The project exists to:
- Help designers and developers reason about contrast choices
- Visualize contrast relationships and trade-offs
- Support learning and discussion around accessible color use

This project is **educational and assistive**. It is not a certification tool, automated compliance checker, or substitute for expert accessibility review.

## Audience and Responsibility
This project is intended for:
- Designers and front-end developers
- Accessibility practitioners
- People learning about color contrast and perception

All outputs are informational. Responsibility for applying results in real products rests with qualified humans.

The tool must not present itself as providing definitive WCAG compliance determinations.

## Scope
The project consists of:
- Static HTML, CSS, and JavaScript
- Client-side calculations and visualizations
- Interactive controls for exploring color and contrast combinations

No server-side processing is assumed unless explicitly documented.

## Conceptual Integrity
The project must maintain clear distinctions between:
- Visual demonstrations
- Calculated contrast values
- Accessibility guidance or thresholds

Language and UI must avoid implying that any single metric guarantees accessibility.

Where multiple contrast models or heuristics are shown, each must be clearly identified and explained.

## UI Contract
The UI must:
- Make inputs (colors, text size, weight, background) explicit
- Show calculated outputs transparently
- Avoid hiding assumptions, rounding, or thresholds
- Allow users to change inputs and see predictable results

No UI element may imply pass/fail certification or official approval.

## Accessibility Position
Accessibility is a core concern of this project.

The project aims to follow WCAG 2.2 AA patterns where feasible, but does not claim formal conformance.

Because the project explores visual contrast, some views may be inherently challenging for certain users. These limitations must be acknowledged and documented.

## Accessibility Expectations (Minimum Bar)

### Structure and Semantics
- Use semantic HTML and landmarks.
- One `<h1>` per page with logical heading structure.
- Group related controls and outputs clearly.

### Keyboard and Focus
- All interactive elements must be keyboard operable.
- Focus order must follow logical reading order.
- Focus indicators must remain visible.

### Labels, Instructions, and Feedback
- All inputs have programmatic labels.
- Units, meaning, and context of values are clearly explained.
- Results are presented in text, not color alone.

### Dynamic Updates
- Changes to contrast results are perceivable.
- Important updates announced using `aria-live` or `role="status"` where appropriate.

### Color and Perception
- Do not rely on color alone to convey meaning.
- Provide numeric or textual equivalents for visual cues.
- Avoid animations or effects that obscure perception.

## Error Handling and Reliability
- Invalid or unsupported input must be handled gracefully.
- Errors must be explained in plain language.
- The UI must not fail silently.

## Data Handling and Privacy
- Do not collect or transmit personal data.
- Do not include analytics or tracking by default.
- Any client-side storage must be optional and documented.

## Dependencies
- Prefer minimal, well-understood dependencies.
- Avoid external scripts with unclear provenance.
- Document any third-party libraries used, including purpose and limitations.
- Do not commit secrets or API keys.

## Testing Expectations
Manual testing is required for meaningful changes:
- Keyboard-only interaction testing
- Focus visibility verification
- Verification that results are perceivable without color
- Zoom testing up to 200%

Automated tests are encouraged for calculation logic but do not replace manual review.

## Contribution Standards
Pull requests should include:
- Description of the change and rationale
- Notes on conceptual or explanatory impact
- Notes on accessibility impact
- Documentation of known limitations introduced

## Definition of Done
A change is complete only when:
- Calculations and visualizations are transparent and correct
- UI behavior is predictable and understandable
- Accessibility has not regressed
- Assumptions and limitations are explicit
- The project remains honest about what it does and does not provide

## GitHub Pages constraints (required)

All pages must work when hosted under the repository subpath:
- `https://<user>.github.io/<repo>/`

Rules:
- Use relative URLs that respect the repo base path.
  - Prefer `./assets/...` or `assets/...` from the current page.
  - Avoid absolute root paths like `/assets/...` unless you explicitly set and use a base path.
- Navigation links must work from every page (no assumptions about being at site root).
- Do not rely on server-side routing. Every page must be reachable as a real file.
- Avoid build steps unless documented and reproducible. Prefer “works from static files”.
- If using Jekyll:
  - Treat Jekyll processing as optional unless `_config.yml` and layouts are part of the repo.
  - If you use `{{ site.baseurl }}`, use it consistently for links and assets.
- Provide a failure-safe: pages should render a readable error if required data files are missing.

Static asset rules:
- Pin external CDN dependencies (exact versions) and document why each exists.
- Prefer vendoring critical JS/CSS locally to reduce breakage.
- Don’t depend on blocked resources (mixed content, HTTP, or fragile third-party endpoints).

Caching/versioning:
- If you fetch JSON/data files, include a lightweight cache-busting strategy (e.g., query param using a version string) OR document that users must hard refresh after updates.


## Local preview (required before publish)

Test pages via a local HTTP server (not `file://`) to match GitHub Pages behavior.

Examples:
- `python3 -m http.server 8000`
- `npx serve`

Verify:
- links resolve under a subpath
- fetch requests succeed
- no console errors on load

This project values clarity, accessibility, and education over compliance claims or false certainty.

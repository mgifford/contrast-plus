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

This project values clarity, accessibility, and education over compliance claims or false certainty.

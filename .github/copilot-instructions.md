# Copilot Instructions for contrast-plus

## Primary Reference

All coding agents working on this repository **must read [`AGENTS.md`](../AGENTS.md)** in the repository root before making any changes. It is the authoritative guide covering:

- Project purpose and scope (educational contrast-checking tool, not a compliance certifier)
- Conceptual integrity rules (never imply a single metric guarantees accessibility)
- UI contract (transparent inputs/outputs, no pass/fail certification language)
- Accessibility expectations (semantic HTML, keyboard operability, aria-live, etc.)
- Error handling, privacy, and dependency guidelines
- GitHub Pages deployment constraints (relative URLs, no server-side routing)
- Local preview instructions (`python3 -m http.server 8005`)
- Definition of Done checklist

## Repository at a Glance

| File / Directory | Purpose |
|---|---|
| `index.html` | Main application page (APCA + WCAG 2 Contrast Checker) |
| `app.js` | Client-side contrast calculations and UI logic |
| `styles.css` | Application styles |
| `test-apca.html` | Standalone APCA test/debug page |
| `bluesky-likes.js` | Bluesky social integration script |
| `package.json` | Defines lint/spell-check/a11y scripts (no build step) |
| `cspell.json` | Spell-check configuration |
| `.github/workflows/` | CI workflows: HTML validation, axe scan, quality checks |

## Tech Stack

- **Pure static files** — HTML, CSS, vanilla JavaScript; no framework, no build step required.
- **Hosted on GitHub Pages** at `https://mgifford.github.io/contrast-plus/`
- **APCA** contrast algorithm loaded via the `apca-w3` npm package (vendored or CDN).
- All pages must work from a subpath (use relative URLs, never `/assets/…`).

## Key Commands

```bash
# Lint HTML
npm run lint:html

# Spell-check markdown and HTML
npm run lint:spell

# Run both lint checks
npm run check

# Local preview (required — matches GitHub Pages behaviour)
npm run serve           # alias for: python3 -m http.server 8005
# then open http://localhost:8005/

# Accessibility smoke test (requires a running server on port 8005)
npm run test:a11y
```

## Workflow Before Submitting a PR

1. Run `npm run check` — fix all HTML-validation and spelling errors.
2. Start the local server (`npm run serve`) and manually verify:
   - Links resolve correctly under the `/contrast-plus/` subpath.
   - No console errors on load.
   - Keyboard-only navigation works end-to-end.
3. Run `npm run test:a11y` against the live local server.
4. Confirm the Definition of Done in `AGENTS.md` is satisfied.

## Errors and Known Workarounds

- **APCA script not loading**: The UI shows `n/a` for APCA values when the APCA script fails to load. This is intentional graceful degradation — do not treat it as a silent failure.
- **`file://` protocol**: Always use an HTTP server for local testing; `fetch()` calls fail under `file://`.
- **GitHub Pages subpath**: Never use absolute root paths (`/assets/…`). Use `./assets/…` or bare relative paths instead.

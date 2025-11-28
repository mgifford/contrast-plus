# APCA + WCAG 2.x Contrast Checker

A client-side tool for evaluating color accessibility using WCAG 2.x contrast ratios and APCA (Advanced Perceptual Contrast Algorithm).  
Runs entirely in the browser using JavaScript and is suitable for GitHub Pages hosting.

## Background and References

- https://github.com/mgifford/apca-wcag2  
- https://github.com/mgifford/apca-wcag2/blob/main/apca-wcag2-diff.mjs  
- https://github.com/Tanaguru/Contrast-Finder  
- https://contrast.report/  
- https://github.com/adamchaboryk/contrast.report  
- https://github.com/incluud/color-contrast-checker  
- https://github.com/cstrobbe/contrast-ratio  
- https://webaim.org/resources/linkcontrastchecker/?fcolor=0000FF&bcolor=FFFFFF

## Features

- Foreground/background/focus color evaluation  
- WCAG 2.x contrast ratio calculation  
- APCA Lc calculation (when available)  
- Focus contrast evaluation (WCAG 2.2 SC 2.4.13)  
- Theme support (Light / Dark / System)  
- Suggested colors when WCAG or APCA fails  
- Supports modern CSS color formats (where browser supports parsing)

## TODO

- Fix remaining regressions in JS execution  
- Write automated tests for contrast and APCA values  
- Add stable module-based JS architecture  
- Ensure consistent behavior across browsers  
- Improve focus/third-color suggestion logic  
- Add ARIA-live for dynamic content updates

## Regression Summary (Last Three Releases)

- Script was not loaded with `type="module"`, causing JS execution to fail  
- Overlapping palette-function overrides caused unreachable branches  
- APCA import variations caused invalid Lc results  
- Browser caching on GitHub Pages masked updated scripts  
- Missing tests prevented early detection of breakage

# Definition of Done for contrast-plus Reports

This document defines when a report for the `contrast-plus` repository should be considered complete.

It is intentionally **not** a blank template. It captures the default standard that reports in this project should meet before they are treated as done.

## What this applies to

This definition of done applies to report-style deliverables such as:

- accessibility audit reports
- feature analysis reports
- testing and QA summaries
- issue investigation write-ups
- content or documentation review reports

## Project context the report must respect

Every completed report must reflect the actual position of this project:

- `contrast-plus` is an **educational and assistive** tool for exploring color contrast.
- It is **not** a certification service and must not be described as one.
- Reports must not imply that any single metric, including WCAG ratio or APCA Lc, guarantees accessibility by itself.
- Reports should treat accessibility as a core quality concern while remaining honest about limitations.

## A report is done when all of the following are true

### 1. The report is clearly about this repository

The report identifies:

- the repository: `mgifford/contrast-plus`
- the relevant page or artifact, when applicable (for example `index.html`, `test-apca.html`, or the GitHub Pages site)
- the date of the report
- the code state when it matters, such as a commit SHA, branch, pull request, issue, or release

### 2. The report has a clear audience and purpose

For this repository, the expected audience is usually:

- the maintainer
- contributors and reviewers
- designers and front-end developers
- accessibility practitioners

A complete report makes clear whether it is primarily meant to:

- explain a problem
- document testing results
- support a change decision
- recommend follow-up work

### 3. The report is evidence-based

A finished report does not rely on vague impressions alone. It uses evidence such as:

- direct observations from the UI or repository
- references to specific files or workflows
- results from project validation commands
- screenshots or examples with enough written context to stand on their own
- cited standards or references when standards are discussed

The report also distinguishes between:

- confirmed findings
- assumptions
- open questions
- suggested next steps

### 4. The report uses project-appropriate language

A complete report:

- describes WCAG 2.2 contrast ratios as the reference compliance metric
- describes APCA as a perceptual readability metric and supplemental guidance
- avoids pass/fail certification language that overstates what the tool can prove
- keeps assumptions, thresholds, and limitations explicit

### 5. The report includes the validation work that can already be done in this repo

When relevant to the subject of the report, the finished report records results from the existing repository checks:

- `npm run check` for HTML validation and spell checking
- `npm test` for the Node test suite
- `npm run serve` followed by `npm run test:a11y` for a local accessibility smoke test against `http://localhost:8005/`

If one of these checks is not relevant or could not be run, the report says so plainly and explains why.

### 6. The report includes required manual review expectations for this project

When the report covers UI, accessibility, or user-visible behavior, it is not done until it notes the status of manual review for:

- keyboard-only navigation
- visible focus indicators
- results being understandable without color alone
- zoom behavior up to 200%
- behavior under a local HTTP server rather than `file://`

If manual review has not happened yet, the report must say that directly instead of implying it is complete.

### 7. The report is accessible and readable as a document

A completed report is itself easy to review:

- headings are logical and specific
- terminology is consistent with the rest of the project
- screenshots, tables, and examples are explained in text
- important findings are not conveyed by color alone
- spelling and links have been checked

### 8. The report is actionable

A done report leaves a contributor knowing what to do next.

That means it includes, where applicable:

- the severity or priority of each problem
- why the problem matters
- the likely area of the codebase involved
- a reasonable next action, such as opening an issue, updating docs, or changing UI behavior

### 9. The report is honest about limits

The report is only done when it explicitly states anything that is still uncertain, including:

- missing evidence
- untested browsers or assistive technologies
- checks that were skipped
- areas that still need human judgment

For this project, honesty about scope and limitation is part of correctness.

## Default completion checklist

Use this as the final gate for any report in `contrast-plus`:

- [ ] The report is clearly scoped to `mgifford/contrast-plus`
- [ ] The audience and purpose are obvious
- [ ] Evidence is included and traceable
- [ ] The project is described as educational and assistive, not certifying
- [ ] WCAG and APCA are described carefully and accurately
- [ ] Relevant repo validation commands are recorded or explicitly deferred with a reason
- [ ] Relevant manual accessibility review is recorded or explicitly deferred with a reason
- [ ] Findings are actionable for maintainers and contributors
- [ ] Limitations and unknowns are explicit
- [ ] The document is readable, accessible, and review-ready

## Short version

In this repository, a report is done when it is:

- specific to the actual state of the project
- supported by evidence
- honest about uncertainty
- aligned with the project's accessibility and educational values
- useful enough that a contributor can act on it next

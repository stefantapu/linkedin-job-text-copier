# Issue tracker: GitHub

Issues and specs live in stefantapu/linkedin-job-text-copier.
Use gh from this clone; specify --repo when running elsewhere.

- Publish: gh issue create.
- Fetch: gh issue view <number> --json number,title,body,labels,comments.
- List: gh issue list with appropriate state and label filters.
- Comment: gh issue comment <number>.
- Label: gh issue edit <number> --add-label / --remove-label.
- Close: gh issue close <number>.
- For multiline bodies, write a temporary UTF-8 file and use --body-file.
- If sandbox authentication fails, retry with host credential access.

## Pull requests as a triage surface

PRs as a request surface: no.

## Wayfinding

The map is an issue labelled wayfinder:map.
Child tickets use wayfinder:research, wayfinder:prototype,
wayfinder:grilling, or wayfinder:task.
Link children using GitHub sub-issues; otherwise use a map task list
and a "Part of #<map>" line in each child.
Use native issue dependencies for blockers; otherwise use
"Blocked by: #<number>" lines.
Choose the first open child in map order with no open blockers
and no assignee. Claim with gh issue edit <number> --add-assignee @me.
Resolve by commenting, closing, then adding a result link to
the map's Decisions-so-far.
Create missing wayfinder labels when that workflow is used.

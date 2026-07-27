@AGENTS.md

## TODO.md

Keep `TODO.md` up to date:

- Add an entry for every bug, feature, or enhancement before work begins.
- Remove items from TODO.md once the work has been committed — do not leave them checked off. The git log is the record.

## Versioning

The app version lives in `package.json` and must be displayed in the UI footer.

- Any commit touching files other than `CLAUDE.md` must include a version bump — patch for fixes, minor for new features, major for breaking changes. CLAUDE.md-only commits may use `--no-verify` to skip the bump.
- The version in the footer must be a clickable link to `/changelog`. The changelog page renders the git log — each entry shows the short hash and commit message (`git log --pretty=format:"%h %s" -n 50`). Implement as a Next.js API route if not already present.

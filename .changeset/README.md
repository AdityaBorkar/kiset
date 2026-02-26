# Changesets

This directory contains changeset files that document changes to be included in the next release.

## Adding a changeset

When you make changes to the codebase, run:

```bash
bunx changeset
```

This will guide you through creating a changeset file. You'll need to:
1. Select the packages affected (kiset)
2. Choose a semver bump type: patch, minor, or major
3. Add a summary of your changes

The changeset file will be saved in this directory (e.g., `happy-shrimps-cheer.md`).

## Why changesets?

Changesets help maintain a clear changelog and ensure consistent versioning. Every change to `src/` must have a corresponding changeset.

CI will check that all PRs modifying `src/` have a changeset.

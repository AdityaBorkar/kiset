# Branch Setup Instructions

## 2. Configure Branch Protection (via GitHub UI or API)

### canary Branch

- Require pull request reviews before merging
- Require 1 approval
- Dismiss stale approvals when new commits are pushed
- Require branches to be up to date before merging
- Require status checks to pass before merging

### Stable Branch

- Require pull request reviews before merging
- Require 2 approvals
- Dismiss stale approvals when new commits are pushed
- Require branches to be up to date before merging
- Require status checks to pass before merging

## 4. Set Default Branch

Set `stable` as the default branch for production releases.

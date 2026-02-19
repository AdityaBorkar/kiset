# Branch Setup & Protection

This document describes how to configure the dev, beta, and stable branches for the release workflow.

## Branch Structure

| Branch | Purpose | NPM Tag | Version Format |
|--------|---------|---------|----------------|
| `dev` | Continuous integration | `canary` | `1.0.0-dev.1` |
| `beta` | Testing/pre-production | `beta` | `1.0.0-beta.1` |
| `stable` | Production releases | `latest` | `1.0.0` |

## Setup Instructions

### 1. Create Branches

```bash
git checkout -b dev
git checkout -b beta
git checkout -b stable
```

Push to remote:
```bash
git push -u origin dev
git push -u origin beta
git push -u origin stable
```

### 2. Configure Branch Protection (via GitHub UI or API)

#### Beta Branch
- Require pull request reviews before merging
- Require 1 approval
- Dismiss stale approvals when new commits are pushed
- Require branches to be up to date before merging
- Require status checks to pass before merging

#### Stable Branch
- Require pull request reviews before merging
- Require 2 approvals
- Dismiss stale approvals when new commits are pushed
- Require branches to be up to date before merging
- Require status checks to pass before merging

#### Dev Branch
- No restrictions (fast iteration)

### 3. Update CODEOWNERS

Edit `.github/CODEOWNERS` to add required reviewers:

```
* @username1 @username2
beta/* @required-reviewer
stable/* @required-reviewer1 @required-reviewer2
```

### 4. Set Default Branch

Set `stable` as the default branch for production releases.

## Release Workflow

```
dev ──(merge via PR)──► beta ──(merge via PR)──► stable
 │                      │                         │
 ▼                      ▼                         ▼
canary                  beta                     latest
@1.0.0-dev.x          @1.0.0-beta.x            @1.0.0
```

## Version Examples

- Push to `dev`: `1.0.0-dev.1`, `1.0.0-dev.2`
- Merge to `beta`: `1.0.0-beta.1`, `1.0.0-beta.2`
- Merge to `stable`: `1.0.0`, `1.0.1`, `1.1.0`

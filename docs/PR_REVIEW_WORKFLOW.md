# GitHub PR Review Workflow Documentation

**Project:** Office Management SaaS Platform  
**Version:** 1.0  
**Date:** March 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Workflow Trigger](#2-workflow-trigger)
3. [Automated Checks](#3-automated-checks)
4. [PR Review Process](#4-pr-review-process)
5. [Branch Protection Setup](#5-branch-protection-setup)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Overview

The PR Review Workflow is a GitHub Actions automated system that runs quality checks on every Pull Request before it can be merged into the main branch.

### Purpose

- Ensure code quality standards are maintained
- Catch bugs and issues before they reach production
- Automate repetitive review tasks
- Provide consistent feedback to developers

### Workflow File Location

```
.github/workflows/pr-review.yml
```

---

## 2. Workflow Trigger

The workflow automatically runs when:

| Event | Description |
|-------|-------------|
| **PR Opened** | New pull request created targeting main branch |
| **PR Updated** | New commits pushed to an existing PR |
| **PR Reopened** | Closed PR is reopened |

### Target Branches

- `main`
- `master`

---

## 3. Automated Checks

### 3.1 Code Quality Check

**What it does:**
- Scans for debug `console.log` statements
- Runs ESLint for code style issues
- Checks for code formatting problems

**Pass Criteria:** No blocking errors found

### 3.2 TypeScript Check

**What it does:**
- Validates all TypeScript types
- Ensures no type errors in services
- Checks web application types

**Pass Criteria:** `tsc --noEmit` completes without errors

### 3.3 Build Test

**What it does:**
- Builds all shared packages
- Compiles all backend services
- Creates production build of web application

**Pass Criteria:** All builds complete successfully

### 3.4 Security Scan

**What it does:**
- Runs `npm audit` for vulnerable dependencies
- Scans code for hardcoded secrets/passwords
- Checks for exposed API keys

**Pass Criteria:** No high-severity vulnerabilities

---

## 4. PR Review Process

### Step-by-Step Flow

```
Developer                    GitHub Actions                Admin/Reviewer
    │                              │                              │
    │  1. Create PR                │                              │
    │─────────────────────────────>│                              │
    │                              │                              │
    │                  2. Run Automated Checks                    │
    │                              │                              │
    │  3. Receive Check Results    │                              │
    │<─────────────────────────────│                              │
    │                              │                              │
    │                              │  4. PR Summary Posted        │
    │                              │─────────────────────────────>│
    │                              │                              │
    │                              │         5. Review Code       │
    │                              │                              │
    │  6a. Request Changes         │                              │
    │<─────────────────────────────┼──────────────────────────────│
    │                              │                              │
    │  6b. Approve & Merge         │                              │
    │                              │<─────────────────────────────│
```

### PR States

| State | Description | Action Required |
|-------|-------------|-----------------|
| 🔴 **Checks Failed** | One or more automated checks failed | Developer must fix issues |
| 🟡 **Checks Pending** | Checks are still running | Wait for completion |
| 🟢 **Checks Passed** | All checks successful | Ready for review |
| 🔵 **Approved** | Reviewer approved | Can be merged |

---

## 5. Branch Protection Setup

### Required Settings in GitHub

1. Go to **Repository Settings** → **Branches**
2. Click **Add rule** for `main` branch
3. Configure these options:

#### Required Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| Require PR before merging | ✅ Enabled | No direct pushes to main |
| Required approvals | 1 | At least one reviewer must approve |
| Dismiss stale approvals | ✅ Enabled | New commits require re-approval |
| Require status checks | ✅ Enabled | Automated checks must pass |
| Required checks | `✅ PR Review Status` | This workflow must succeed |
| Require up-to-date branch | ✅ Enabled | PR must be current with main |

### How to Enable

```
Settings → Branches → Add branch protection rule

Branch name pattern: main

☑️ Require a pull request before merging
   └── Require approvals: 1
   └── Dismiss stale pull request approvals

☑️ Require status checks to pass before merging
   └── Require branches to be up to date
   └── Search and add: "PR Review Status"

☑️ Do not allow bypassing the above settings
```

---

## 6. Troubleshooting

### Common Issues

#### Issue: Checks are stuck on "Pending"

**Cause:** GitHub Actions runner not available  
**Solution:** Wait a few minutes or check GitHub Status page

#### Issue: Build fails but code works locally

**Cause:** Missing dependencies or environment differences  
**Solution:** 
1. Ensure all dependencies are in `package.json`
2. Check Node.js version matches (v20)
3. Run `npm ci` locally to test

#### Issue: TypeScript errors in workflow but not locally

**Cause:** Prisma client not generated  
**Solution:** Workflow generates Prisma client, but ensure schemas are valid

#### Issue: Security scan shows vulnerabilities

**Cause:** Outdated dependencies  
**Solution:** Run `npm audit fix` to update dependencies

### Getting Help

If automated checks fail:
1. Click on the failed check to see details
2. Read the error message in the logs
3. Fix the issues locally
4. Push new commits to update the PR

---

## Appendix: Workflow Configuration Reference

```yaml
# Trigger on PRs to main
on:
  pull_request:
    branches: [main, master]

# Jobs run in this order:
# 1. code-quality    (parallel)
# 2. type-check      (parallel)
# 3. build-test      (after 1 & 2)
# 4. security-scan   (parallel)
# 5. pr-summary      (after all)
# 6. pr-review-status (final gate)
```

---

**Document Version:** 1.0  
**Last Updated:** March 2026  
**Maintained By:** DevOps Team

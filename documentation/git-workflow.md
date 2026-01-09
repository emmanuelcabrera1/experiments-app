# Git & Version Control Guide

Version control saves your history. If you break something, you can go back.

## Initial Setup

1. **Install Git:** Download and install from [git-scm.com](https://git-scm.com).
2. **Configure:**
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```

## Starting a Project

1. Open your project folder in terminal.
2. Initialize repository:
   ```bash
   git init
   ```
3. Create `.gitignore` file (files to ignore):
   ```
   node_modules/
   .DS_Store
   dist/
   ```

## Daily Workflow

### 1. Check Status

See what changed:

```bash
git status
```

### 2. Stage Changes

Prepare files for saving:

```bash
git add .         # Stage all changes
# OR
git add index.html # Stage specific file
```

### 3. Pre-Commit Check

Ensure you aren't leaking secrets:

```bash
npm run security-check
```

### 4. Commit (Save)

Save a snapshot with a message describing the change:

```bash
git commit -m "Added navbar component"
```

### 4. View History

See past commits:

```bash
git log --oneline
```

## Best Practices

- **Commit Often:** Small, frequent commits are better than one huge one.
- **Clear Messages:** Write descriptive messages (e.g., "Fixed mobile layout" not "Update").
- **Branching:** Use branches for new features if you are comfortable.
  ```bash
  git checkout -b new-feature
  # ... make changes ...
  git checkout main
  git merge new-feature
  ```

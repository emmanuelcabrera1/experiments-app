# GitHub Workflow Guide

## Quick Commands Reference

### Check Status
```bash
git status
```
Shows which files have been modified, staged, or are untracked.

---

### Pull Latest Changes
```bash
git pull origin main
```
Downloads and merges changes from GitHub to your local repo.

---

### Push Changes to GitHub

**Step 1: Stage files**
```bash
git add <filename>        # Stage specific file
git add .                 # Stage all changes
```

**Step 2: Commit**
```bash
git commit -m "Your commit message"
```

**Step 3: Push**
```bash
git push origin main
```

---

### Create a New Repository

**Step 1: Create repo on GitHub**
1. Go to https://github.com/new
2. Enter repository name
3. Choose Public or Private
4. Click "Create repository"

**Step 2: Initialize local project**
```bash
cd your-project-folder
git init
git add .
git commit -m "Initial commit"
```

**Step 3: Connect to GitHub**
```bash
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

> 💡 **Tip**: Replace `YOUR_USERNAME` and `REPO_NAME` with your actual GitHub username and repository name.

---

### View Commit History
```bash
git log -n 5              # Last 5 commits
```

---

### Discard Local Changes
```bash
git checkout -- <filename>    # Discard changes to specific file
git restore <filename>        # Same as above (newer syntax)
```

---

### Resolve Conflicts

If push is rejected (remote has newer changes):

```bash
git pull --rebase origin main    # Pull and rebase your changes on top
git push origin main             # Then push
```

If there are merge conflicts:
```bash
git rebase --abort               # Abort and try again, OR
git push --force origin main     # Force push your local (overwrites remote!)
```

> ⚠️ **Warning**: `--force` will overwrite the remote. Only use if you're sure your local is correct.

---

## Project-Specific Info

| Project | Repository |
|---------|------------|
| minimalist-todo | https://github.com/emmanuelcabrera1/minimalist-todo.git |

---

## Common Scenarios

### Scenario 1: Daily workflow
```bash
git pull origin main              # Get latest
# ... make your changes ...
git add .
git commit -m "Description of changes"
git push origin main
```

### Scenario 2: Check what changed
```bash
git diff                          # See unstaged changes
git diff --staged                 # See staged changes
```

### Scenario 3: Undo last commit (keep changes)
```bash
git reset --soft HEAD~1
```

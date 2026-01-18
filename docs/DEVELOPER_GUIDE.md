# Developer Guide

## How-To Workflows

### 🛑 High-Stakes Updates (SOP)
**Touching `sw.js`, `data.js`, or `app.js`?**
👉 **[READ THIS FIRST: High-Stakes SOP](../../../documentation/protocols/HIGH_STAKES_SOP.md)**
1.  **Plan**: Create RFC (Migration + Kill Switch).
2.  **Verify**: Run "Pre-Flight" (Incognito vs. Upgrade).
3.  **Sync**: If pulling from GitHub, treat it as a broken build until verified.

### 🧪 Adding a New Experiment Template
Experiments are defined in `js/data.js`. To add a new default idea:
1.  Open `js/data.js`.
2.  Locate `const TEMPLATES`.
3.  Add a new object:
    ```javascript
    {
        id: 'new-id-14',
        title: 'New Experiment',
        purpose: 'Why do this?',
        successCriteria: 'How to win',
        durationDays: 14,
        category: 'HEALTH' // options: HEALTH, WORK, RELATIONSHIPS, LEARNING
    }
    ```

### 📲 Debugging
The app includes a built-in diagnostic mode.
- **Production**: Hidden by default.
- **Development**: Open `tests/debug-diagnostic.html` (requires a specific relative path setup) OR open the browser console and type `App.log(state)`.

### 🔄 PWA Updates
When releasing a new version:
1.  Open `sw.js`.
2.  Increment `CACHE_VERSION` (e.g., `v1.0.6` -> `v1.0.7`).
3.  The app will auto-detect the update on the next reload.
4.  User will see "Update Available" toast.

### 🔗 Follow-up Tasks (Checklist → Hidden Task)
When a checklist item is checked, it automatically creates a follow-up task in the HIDDEN section.

**How It Works:**
1. User checks a subtask/checklist item
2. System creates a new task with:
   - Title = subtask text
   - Hidden = true (appears in HIDDEN section)
   - Notes = "Follow-up from: [Parent Task] → [Checklist Name]"
   - Bi-directional links (subtask ↔ follow-up task)
3. Hidden section auto-expands to show the new task
4. Visual indicators appear:
   - ↪ icon on checked subtask (click to navigate to follow-up)
   - "↪ Follow-up" badge on follow-up task (click to navigate to source)

**Unchecking Behavior:**
- Unchecking a subtask deletes its follow-up task
- Follow-up task must be empty (no content added)

**Data Model:**
```javascript
// Subtask Item
{
  id: "sub-xxx",
  text: "Terminación de Obra",
  completed: true,
  followUpTaskId: "todo-yyy"  // Reference to follow-up
}

// Follow-up Task
{
  id: "todo-yyy",
  title: "Terminación de Obra",
  sourceTaskId: "todo-parent",
  sourceSubtaskId: "sub-xxx",
  hidden: true
}
```

**Edge Cases Handled:**
- Deleting parent task → cascades to delete all follow-ups
- Deleting follow-up manually → clears subtask reference
- Orphaned references → cleaned up on app initialization
- Rapid toggle → debounced (no duplicates)

**Developer Notes:**
- TodoManager.toggleSubtaskItem() handles creation/deletion
- TodoManager.cleanupOrphanedFollowUps() runs on init
- Navigation handlers in app.js (goto-followup, goto-source)
- Visual indicators in css/todo.css

### 👆 Interaction Patterns (Swipe Gestures)
The app uses a custom touch handling system for swipe actions (Swipe-to-Hide, etc.).

**Key Principles:**
- **Dynamic Widths:** Warning! Do not hardcode swipe distances. The system calculates `leftWidth` and `rightWidth` based on the rendered buttons at `touchstart`.
- **Direction Locking:** Vertical scrolls are unlocked until a horizontal threshold is met. Once horizontal swipe begins, vertical scroll is locked (`preventDefault`).
- **Persistence:** State changes (like hiding a task) must auto-expand their container or persist their state to `localStorage` to prevent user confusion.

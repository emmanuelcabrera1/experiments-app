# Developer Guide

## How-To Workflows

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

# 🤖 AGENT CONTEXT FILE
> **READ THIS FIRST** for high-precision modifications to `experiments-web`.

## ⚡ Quick Context
- **Type**: Vanilla JS PWA (SPA architecture).
- **Frameworks**: NONE. No React, No Vue, No jQuery.
- **Style**: String-template components (`ui.js`).
- **State**: Mutated global `App.state` in `app.js`.

## 📂 Critical File Map
| File | Do Use For... | 🛑 Avoid... |
|------|---------------|-------------|
| `js/app.js` | Logic, Routing, Events, State updates. | Defining UI HTML (Use `ui.js`). |
| `js/ui.js` | HTML Templates, Classes, Icons. | Logic or Event handling. |
| `js/data.js` | Default Templates (`TEMPLATES`), Storage keys. | UI rendering. |
| `sw.js` | Caching patterns. | DOM access (runs in worker). |

## 🛠️ Common Tasks (Cheat Sheet)

### 1. Adding a New Field to Experiments
1.  **DB**: Add field to `TEMPLATES` in `js/data.js`.
2.  **UI**: Update `experimentRow` or `renderExperimentDetail` in `js/ui.js`.

### 2. Creating a New Screen/Tab
1.  **UI**: Create `renderNewScreen()` in `js/app.js`.
2.  **Nav**: Add button to `renderTabBar()` in `js/ui.js`.
3.  **Route**: Add case to `renderCurrentScreen()` in `js/app.js`.

### 3. Modifying Styles
- **Global**: `css/base.css`
- **Components**: `css/components.css`
- **Tokens**: `css/tokens.css` (Do not hardcode colors, use `var(--color-...)`).

## ⚠️ Integrity Rules
1.  **IDs**: Do NOT remove `id="app"`, `id="header"`, or `id="tab-bar"`.
2.  **Events**: We use **Event Delegation**. Attach clicks to containers, not dynamic elements.
    - ✅ `container.addEventListener('click', e => ...)`
    - ❌ `element.onclick = ...`
3.  **XSS**: ALWAYS use `escapeHtml()` from `ui.js` when rendering user content.

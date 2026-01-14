# Experiments Web - Architecture

## 🚀 System Overview
Experiments Web is a **Progressive Web App (PWA)** built with Vanilla JavaScript. It uses a custom component system and centralized state management to deliver a native-app-like experience without heavy frameworks.

## 🏗️ Technical Stack
- **Core**: HTML5, Vanilla JavaScript (ES6+), CSS3 Variables.
- **PWA**: Service Workers (Cache-first), Manifest.json.
- **Data**: LocalStorage with JSON serialization.
- **Styling**: Native CSS tokens (Solar System Design System).

## 🧩 Module Structure
The application is modularized into `js/` directory:

| Module | Responsibility |
|--------|----------------|
| `app.js` | **Main Controller**. Manages Global State, Routing, and Event Delegation. |
| `data.js` | **Data Layer**. Handles `experiments_db` in LocalStorage and default templates. |
| `ui.js` | **View Layer**. specialized "Factory" functions that return HTML strings. |
| `sw.js` | **Service Worker**. Handles offline caching and updates. |
| `sw-register.js`| **Registration**. Decoupled registration logic for CSP compliance. |

## 🔄 State Management
State is centralized in `App.state` within `app.js`.
- **Single Source of Truth**: The UI always reflects `App.state`.
- **Updates**: State changes trigger targeted re-renders (e.g., `renderExperimentsScreen()`).
- **Persistence**: Critical data is saved via `Data.save(...)`.

## 📱 PWA Strategy
- **Cache Strategy**:
  - **Static Assets**: _Cache-First_ (Speed & Offline).
  - **Data/API**: _Network-First_ (Freshness).
- **Updates**: Uses a versioned cache (e.g., `v1.0.6`). Updates are detected via the Service Worker lifecycle.

## 🎨 Component System
UI is generated via function factories in `ui.js`.
**Pattern**:
```javascript
// ui.js
function card(data) {
    return `<div class="card">${escapeHtml(data.title)}</div>`;
}
```
**Usage**:
```javascript
// app.js
container.innerHTML = data.map(ui.card).join('');
```
_Note: We use string concatenation for performance and simplicity in this specific context._

# Design System Ruleset

> [!IMPORTANT]
> These rules are MANDATORY for all new applications created in this workspace.

## 1. Typography
- **Primary Font**: `Inter` (Sans-serif) for UI, body text, and inputs.
- **Display Font**: `Playfair Display` (Serif) for headings (h1, h2) and large stats.
- **Hierarchy**:
  - `h1`: 3rem - 4rem (Desktop), 2.5rem (Mobile). Bold/Heavy.
  - `h2`: 2rem - 2.5rem. Medium/Bold.
  - `Body`: 1rem (16px). Line-height 1.6.
  - `Small`: 0.875rem. Uppercase tracking (letter-spacing) 0.05em.

## 2. Color System
Use the **60-30-10 Rule**.
- **60% (Background/Neutral)**: Dark/Black (`#050505` to `#1a1a1a`) or White/Light (`#f8f9fa` to `#ffffff`).
- **30% (Secondary/UI)**: Subtle borders, cards, muted text (`#333`, `#e0e0e0`).
- **10% (Accent/Action)**: High contrast color (Gold `#d4af37`, Blue `#4a90e2`, etc.) for buttons, focus states, and key data.

### CSS Variables (Standard)
```css
:root {
  --bg-color: #050505;       /* Main Background */
  --surface-color: #1a1a1a;  /* Cards, Panels */
  --text-primary: #e0e0e0;   /* Body Text */
  --text-secondary: #888888; /* Subtitles, Labels */
  --accent-color: #d4af37;   /* Buttons, Links, Highlights */
  --border-color: #333333;   /* Dividers, Borders */
}
```

## 3. Layout & Spacing
- **Container**: `max-width: 1200px`, centered (`margin: 0 auto`).
- **Padding**: Mobile `1rem`, Desktop `2rem`.
- **Spacing Scale**: 4px, 8px, 16px, 24px, 32px, 48px, 64px.
- **Grid**: Use CSS Grid for layouts. `gap: 1.5rem` (24px) default.

## 4. Micro-Interactions & Animation
- **Hover Effects**: All interactive elements (buttons, cards) must have a `:hover` state (e.g., `transform: translateY(-2px)`, `opacity: 0.9`).
- **Focus States**: Custom focus styles matching the `--accent-color` (never default browser blue).
- **Entrance**: Use fade-in animations for main content (`fadeInUp`, `fadeInDown`).

## 5. File Structure
- **Simple (< 500 lines)**: Keep everything in `index.html` (HTML + CSS + JS).
- **Complex (> 500 lines)**: Split into:
    - `/project-name/index.html`
    - `/project-name/style.css`
    - `/project-name/script.js`

## 6. Code Quality
- **Semantic HTML**: Use `<header>`, `<main>`, `<footer>`, `<section>`, `<article>`.
- **Accessibility**: All images need `alt` tags. Inputs need `<label>` or `aria-label`.
- **No Console Errors**: Code must run cleanly.

# Workspace Design System Standards

## 1. Directory Structure & Atomic Design
All projects must strictly follow this directory structure to ensure modularity and maintainability (Atomic Design principles).

```
project-name/
├── assets/             # Images, icons, static files
├── css/
│   ├── tokens.css      # Design Tokens (Variables only)
│   ├── base.css        # Resets, Typography, Utilities
│   └── components.css  # Component styles (Molecules/Organisms)
├── js/
│   ├── app.js          # Main logic
│   └── utils.js        # Helper functions
├── index.html          # Main entry point
└── README.md           # Project documentation
```

## 2. Design Tokens (Level 1 & 2)
All CSS must use variables defined in `css/tokens.css`. No hardcoded hex values in component styles.

### Required Token Categories
- **Color**: `--color-bg-default`, `--color-surface`, `--color-text-primary`, `--color-accent`
- **Typography**: `--font-family-body`, `--font-family-heading`, `--font-size-base`
- **Spacing**: `--space-sm`, `--space-md`, `--space-lg` (8px grid)
- **Animation**: `--ease-out`, `--duration-base`

## 3. UX Laws Compliance
- **Fitts’s Law**: All interactive elements (buttons, inputs) must have a minimum touch target of **44x44px**.
- **Hick’s Law**: Interfaces must be minimalist. Primary actions should be prominent; secondary actions less so.
- **Jakob’s Law**: Use standard browser inputs (`<input type="date">`, `<select>`) unless a custom control significantly validates the UX.

## 4. Visual Fidelity (Hi-Fi)
- **Glassmorphism/Modern UI**: Use subtle borders (`1px solid var(--color-border)`), soft shadows, and gradients where appropriate.
- **Micro-interactions**: Hover states for all interactive elements. `fade-in` animations on load.

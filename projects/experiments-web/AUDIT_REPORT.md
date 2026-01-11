# Comprehensive UX/UI & Accessibility Audit Report

**Date:** January 10, 2026
**Auditor:** Jules (Senior UX Engineer & Accessibility Specialist)
**Scope:** Experiments PWA - `/projects/experiments-web/`
**Application Type:** Progressive Web App (PWA)

---

## 1. Executive Summary

The Experiments PWA is a well-structured application with a clean, monochrome design and a solid vanilla JavaScript architecture. It implements core PWA features like a service worker and manifest. However, the audit revealed critical gaps in data safety (potential data loss on corruption), accessibility (low contrast in dark mode, missing keyboard controls), and mobile UX (small touch targets, missing input modes). While the visual design is consistent, several "polish" issues and functional edge cases prevent it from being production-ready.

**Overall Health:** 🟡 **Requires Improvement** (Critical bugs and accessibility violations present)

---

## 2. Critical Bugs (Immediate Fix Required)

| ID | Severity | Category | Location | Description | Steps to Reproduce | Expected | Actual |
|----|----------|----------|----------|-------------|--------------------|----------|--------|
| B1 | 🔴 Critical | Data Safety | `js/data.js:80-89` | **Silent Data Loss**: If `localStorage` data is corrupted, `load()` returns empty, and subsequent `save()` overwrites the corrupted data with a new empty state, permanently losing user data. | 1. Manually corrupt `experiments_db` in localStorage.<br>2. Reload app (app loads empty state).<br>3. Create new experiment. | App should detect corruption and warn user or attempt backup restore. | App overwrites corrupted data with new data, destroying history. |
| B2 | 🔴 Critical | Crash | `js/data.js` | **No Quota Handling**: `save()` does not catch `QuotaExceededError`. If device storage is full, the app will crash/freeze during save operations. | 1. Fill localStorage to limit.<br>2. Try to save new experiment. | App should handle error gracefully (e.g., show toast). | Uncaught exception stops script execution. |
| B3 | 🔴 Critical | Accessibility | `css/tokens.css:81` | **Invisible Text**: Tertiary text color in Dark Mode (`#EBEBF54D`) has a contrast ratio of ~1.8:1 against the background (`#1C1C1E`), failing WCAG AA (4.5:1) and making it nearly invisible. | 1. Switch to Dark Mode.<br>2. View "Check-ins" label in weekly summary or footer text. | Text should be legible (≥4.5:1 or ≥3:1 for large). | Text is extremely faint and hard to read. |

---

## 3. UX Friction Points

| ID | Impact | Category | Location | Issue | Recommendation |
|----|--------|----------|----------|-------|----------------|
| U1 | High | Error Prevention | `js/app.js` | **No Undo**: Deleting an experiment or entry is permanent immediately after confirmation. | Implement a "Soft Delete" with a "Undo" toast notification for 5-10 seconds. |
| U2 | High | Mobile UX | `js/app.js` | **Touch Targets**: Back/Edit buttons (40px) and Calendar nav (32px) are below the 44px minimum, making them hard to tap. | Increase all interactive targets to at least 44x44px (padding or size). |
| U3 | Medium | Input UX | `js/app.js` | **Wrong Keyboard**: Numeric inputs (Duration) do not trigger the numeric keypad on iOS/Android. | Add `inputmode="numeric"` to number inputs and `autocomplete` attributes where appropriate. |
| U4 | Medium | State | `js/app.js` | **Stale Date**: App does not refresh "Today" when resumed from background (e.g., next day), leading to incorrect streaks. | Add `visibilitychange` listener to re-evaluate "Today" and refresh view. |
| U5 | Low | Feedback | `js/app.js` | **Hardcoded Colors**: Settings icons use hardcoded light backgrounds (`#E8F5E9`) that look out of place in Dark Mode. | Use CSS variables for icon backgrounds (e.g., `var(--surface-variant)`). |

---

## 4. Accessibility Violations (WCAG 2.1 AA)

| ID | WCAG | Severity | Element | Issue | Fix |
|----|------|----------|---------|-------|-----|
| A1 | 1.4.3 | 🔴 Critical | Text | **Contrast**: Tertiary text color fails contrast requirements in Dark Mode. | Change `--text-tertiary` alpha from 30% (`4D`) to 50% (`80`) or higher. |
| A2 | 2.1.1 | 🔴 Critical | `div.experiment-row` | **Keyboard Access**: Interactive lists (experiments, gallery cards) are `div`s with `click` handlers but lack `role="button"`, `tabindex="0"`, and keyboard listeners. | Add `role="button"`, `tabindex="0"`, and handle `Enter`/`Space` keys. |
| A3 | 2.3.3 | 🟡 Major | Animation | **Reduced Motion**: No support for `prefers-reduced-motion`. | Add `@media (prefers-reduced-motion)` to disable/speed up animations. |
| A4 | 2.4.7 | 🟡 Major | `.pill` | **Focus Visible**: Filter pills lack a distinct focus style for keyboard navigation. | Add `:focus-visible` styles to `.pill` in CSS. |
| A5 | 1.1.1 | 🟢 Minor | SVG Icons | **Decorative Icons**: SVGs in buttons do not have `aria-hidden="true"`, potentially creating noise for screen readers. | Add `aria-hidden="true"` to decorative SVGs or ensure `aria-label` on parent is sufficient. |

---

## 5. Visual Design Audit

### 5.1 Design System Consistency
- **Typography**: Generally good use of Inter and system fonts. Type scale is consistent.
- **Colors**: Hardcoded hex values in `js/app.js` (Settings screen) break the design system's theming capabilities.
- **Spacing**: 8pt grid is respected in CSS, but inline styles in JS sometimes deviate.

### 5.2 Responsive Behavior
- **Mobile**: Layout is mobile-optimized.
- **Safe Areas**: `env(safe-area-inset-*)` is correctly used in `tokens.css`.
- **Desktop**: Layout remains "mobile-width" centered or stretches awkwardly. (Acceptable for PWA, but could be improved).

---

## 6. Recommended Fix Order

1.  **Data Safety (B1, B2)**: Implement error handling in `js/data.js` to prevent data loss on corruption and handle quota errors. This is critical for user trust.
2.  **Accessibility Basics (A1, A2, A3)**:
    -   Fix Contrast in `css/tokens.css`.
    -   Add `role="button"` and keyboard handling to `experiment-row` and cards in `js/ui.js` / `js/app.js`.
    -   Add Reduced Motion query in `css/components.css`.
3.  **Mobile UX (U2, U3)**:
    -   Increase touch targets in `css/components.css` and `js/app.js`.
    -   Add `inputmode="numeric"` to forms in `js/app.js`.
4.  **State Management (U4)**: Add `visibilitychange` handler to `js/app.js`.
5.  **UX Polish (U1, U5)**: Implement "Undo" logic and fix hardcoded colors.

---

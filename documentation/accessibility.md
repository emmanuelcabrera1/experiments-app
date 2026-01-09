# Accessibility (a11y) Checklist

Making your app accessible ensures everyone can use it.

## 1. Structure & HTML

- [ ] **Semantic HTML:** Use `<nav>`, `<main>`, `<header>`, `<footer>`, `<button>` appropriately.
- [ ] **Headings:** Use `<h1>` through `<h6>` in logical order (don't skip levels).
- [ ] **Lang Attribute:** `<html>` tag has a language attribute (e.g., `<html lang="en">`).
- [ ] **Unique IDs:** All `id` attributes are unique on the page.

## 2. Text & Content

- [ ] **Alt Text:** All `<img>` tags have descriptive `alt` attributes (or `alt=""` if decorative).
- [ ] **Link Text:** Link text describes the destination (Avoid "Click Here").
- [ ] **Page Titles:** Each page has a unique, descriptive `<title>`.

## 3. Color & Visibility

- [ ] **Contrast:** Text vs background has a contrast ratio of at least 4.5:1.
  - _Tool: WebAIM Contrast Checker_
- [ ] **Color Reliance:** Color is not the only way information is conveyed (e.g., use icons + color for errors).

## 4. Keyboard Navigation

- [ ] **Focus Visible:** All interactive elements have a visible focus state (outline).
- [ ] **Tab Order:** You can Tabbing through the page follows a logical order.
- [ ] **No Traps:** Keyboard focus never gets "stuck" in an element.

## 5. Forms

- [ ] **Labels:** All inputs have an associated `<label>`.
- [ ] **Error Messages:** Errors are clearly identified and described in text.

## 6. Media

- [ ] **Captions:** Videos have captions.
- [ ] **Transcripts:** Audio content has transcripts.

> **Tip:** Use the **Lighthouse** tool in Chrome DevTools to run an accessibility audit.

---
description: Workflow for creating a new web app in the HTML_Apps_Workspace.
---

# Workflow: Create New Web App

Follow these steps to create a new application that adheres to the workspace's Design System.

## 1. Project Initialization
1.  **Determine Project Name**: Convert user request to a kebab-case name (e.g., "Currency Converter" -> `currency-converter`).
2.  **Copy Template**: 
    - Copy the contents of `templates/new-project-template` to `projects/<project-name>`.
    - Ensure all subdirectories (`css`, `js`) are preserved.

## 2. Configuration
1.  **Update Metadata**:
    - Open `projects/<project-name>/index.html`.
    - Replace `{{PROJECT_NAME}}` with the actual project Title (e.g., "Currency Converter").
2.  **Verify Structure**:
    - Check that `css/tokens.css`, `css/base.css`, and `css/components.css` are correctly linked.

## 3. Implementation
1.  **Develop Features**:
    - Write HTML in `index.html` (inside `<main>`).
    - Add logic to `js/app.js`.
    - Add component styles to `css/components.css`.
    - **CRITICAL**: Use variables from `css/tokens.css` for all colors, spacing, and fonts.
2.  **Add Assets**: Place images in `assets/`.

## 4. Polish & Verify
1.  **Compliance Check**:
    - **Fitts's Law**: Are buttons at least 44px height?
    - **Design Tokens**: Are you using `--accent-color` instead of hex codes?
    - **Atomic Design**: Are reusable components identified?
2.  **Test**: Open `index.html` in the browser to verify the build.

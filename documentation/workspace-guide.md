# Workspace Manual

This guide explains how to use the **HTML Apps Workspace** effectively.

## Directory Structure

```
workspace/
├── components/       # Reusable UI snippets (copy-paste these)
├── documentation/    # Guides and references
├── projects/         # YOUR apps live here
├── templates/        # Starting points (duplicate these)
├── index.html        # Dashboard
└── README.md         # Overview
```

## Workflow: How to Start a New App

1. **Choose a Template**
   - Go to `templates/` folder.
   - Choose one (e.g., `landing-page.html`).

2. **Duplicate to Projects**
   - Copy the file (e.g., `landing-page.html`).
   - Create a new folder in `projects/` (e.g., `projects/my-app/`).
   - Paste the file and rename it to `index.html`.

   > **IMPORTANT:** When you move a file into a subfolder, relative links might break.
   > Since our templates use embedded CSS/styles, they will work immediately.
   > However, if you link to images/assets, check your paths.

3. **Customize**
   - Open your new `index.html`.
   - Change colors, text, and images.
   - Add components from the `components/` folder as needed.

## Using Components

1. Open a component file (e.g., `components/navbar.html`).
2. Copy the HTML and CSS (`<style>` block).
3. Paste it into your project file.
   - Put CSS in the `<head>` or existing `<style>` block.
   - Put HTML in the `<body>` where you want it to appear.

## Best Practices

- **Keep it Simple:** Start with one file (`index.html`). Only split into multiple files (style.css, script.js) when the file gets too long (>500 lines).
- **Use Comments:** Comment your code to organize sections.
- **Security First:** Never commit API keys or passwords. Run `npm run security-check` to verify your code before saving.
- **Test Frequently:** Use the "Live Server" extension in VS Code to see changes instantly.

## Troubleshooting

- **Styles not showing?** Check that your CSS is inside `<style>` tags or properly linked.
- **Images broken?** Check the file path. relative paths (`../images/pic.jpg`) depend on where your file is located.

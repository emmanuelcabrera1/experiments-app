# Asset Management Guide

Organizing images, fonts, and other media keeps your project fast and clean.

## Directory Structure

Recommended structure for your `projects/my-app/` folder:

```
my-app/
├── assets/
│   ├── images/       # Photos, illustrations
│   ├── icons/        # SVG icons, favicons
│   ├── fonts/        # Custom font files
│   └── styles/       # CSS files (if separated)
└── index.html
```

## Images

### File Formats

- **Photos:** Use **JPG** or **WebP**.
- **Graphics/Logos:** Use **SVG** (best) or **PNG** (if transparent).
- **Animations:** Use **GIF** or **MP4** (better quality/size).

### Optimization (Crucial!)

Always compress images before uploading. Large images slow down your site.

- **Tools:**
  - [TinyPNG](https://tinypng.com) (Drag & drop compression)
  - [Squoosh](https://squoosh.app) (Advanced control)

### Size Guidelines

- **Hero Backgrounds:** Max 1920px wide. File size < 300KB.
- **Content Images:** Max 800-1200px wide. File size < 150KB.
- **Icons:** SVG preferred (tiny file size).

## Fonts

### Using Google Fonts (Easiest)

1. Go to [fonts.google.com](https://fonts.google.com).
2. Select styles (Regular 400, SemiBold 600, Bold 700).
3. Copy the `<link>` code.
4. Paste into your HTML `<head>`.

### Hosting Locally (Faster/Private)

1. Download font files (`.woff2` preferred).
2. Place in `assets/fonts/`.
3. Use `@font-face` in CSS:
   ```css
   @font-face {
     font-family: 'MyFont';
     src: url('assets/fonts/myfont.woff2') format('woff2');
   }
   ```

## Naming Conventions

Use lowercase and hyphens (kebab-case). no spaces.

- ✅ `hero-background.jpg`
- ✅ `user-avatar.png`
- ❌ `Hero Background.jpg`
- ❌ `Image_01.jpg`

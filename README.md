# MotoVault GitHub Pages Deployment Guide 🏍️

Follow these simple steps to build and host MotoVault as a completely static Single Page Application (SPA) on GitHub Pages, optimized for iOS Safari standalone operations.

---

## Step 1: Set Your Repository Base Path

If your GitHub Pages URL is formatted as `https://<your-username>.github.io/<repository-name>/` (a subdirectory), you must tell Vite's bundler where to fetch assets.

1. Open `vite.config.ts`.
2. Add your `base` setting with your repository name. For example:
   ```typescript
   export default defineConfig(() => {
     return {
       base: '/your-repository-name/', // <-- Add this line (replace with your repo name, keep slashes)
       plugins: [react(), tailwindcss()],
       // ... existing configuration
     };
   });
   ```
   *(Note: If hosting on a custom root domain like `yourdomain.com` or `username.github.io` directly, you can omit or set the base to `'/'`).*

---

## Step 2: Automated Deployment via `gh-pages` Package

This is the easiest client-side command-line script to publish directly to GitHub Pages.

### 1. Install the deployment helper
```bash
npm install -D gh-pages
```

### 2. Configure Scripts in `package.json`
Open your `package.json` and add `homepage`, `predeploy`, and `deploy` fields:
```json
{
  "homepage": "https://<your-username>.github.io/<your-repository-name>",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "tsc --noEmit",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

### 3. Run Build & Deploy
Once your repository is committed and connected to GitHub, run this single terminal command to push the compiled assets to your `gh-pages` branch:
```bash
npm run deploy
```

---

## Step 3: Progressive Web App (PWA) Homescreen Experience on iOS
This codebase is pre-configured with a custom Apple-friendly viewport, responsive inputs to prevent layout shifting on tap-focus, and safe-area padding for the home-indicator.

To load the standalone icon experience on your iPhone:
1. Open **Safari** and navigate to your production URL.
2. Tap the **Share** button (box with an up-arrow) in the browser toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. MotoVault will now launch as a dedicated fullscreen workspace without URL browser bars!

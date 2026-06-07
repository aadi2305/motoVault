# MotoVault 🏍️ — Automated GitHub Pages Deployment

Your MotoVault app is fully primed with **CB350RS (Current ODO: 898 km)** baseline specs, initialized starting on **May 23rd**, and configured as a Static Single Page Application (SPA) optimized for **iOS Safari (Homescreen Web App)**.

When you sync this code directly to your GitHub repository, **GitHub Actions** will automatically compile the code and build/deploy your live site. No manual terminal commands are needed!

---

## 🚀 Easy 2-Step Go-Live Guide

Once you export or sync your project to your GitHub repository:

### 1. Enable GitHub Actions Permissions in your Repo
Since the automated GitHub Action pushes the built files to your `gh-pages` branch, you need to grant it write permissions:
1. On GitHub, navigate to your **Repository Settings** tab.
2. Under the left sidebar, expand **Actions** and click **General**.
3. Scroll down to the bottom to **Workflow permissions**.
4. Select **Read and write permissions**, then click **Save**.

### 2. Configure GitHub Pages to Serve from the Build Branch
1. Under your **Repository Settings** tab, click **Pages** in the left sidebar.
2. Under **Build and deployment** -> **Source**, make sure **Deploy from a branch** is selected.
3. Under **Branch**, select `gh-pages` and folder `/ (root)`, then click **Save**.

---

## 📱 Premium iOS Safari Standalone PWA Setup
Once your URL is active (usually `https://<your-username>.github.io/<your-repository-name>/`):

1. Launch **Safari** on your iPhone and open your live link.
2. Tap the **Share** button in the browser sheet.
3. Select **Add to Home Screen**.
4. Launch MotoVault directly from your phone's home screen for a gorgeous, full-screen, native-feeling ride logbook with tailored safe-areas and inputs!

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

## 🔒 Fixing the "Domain Not Authorized" Google Auth Error (Bring Your Own Database)

The Firebase database that comes pre-configured with MotoVault is a **managed AI Studio instance**. Google AI Studio does not grant end-users access to the actual Firebase Console for these managed instances, which means you cannot add `aadi2305.github.io` to its authorized domains list. 

To use cloud-sync and Google Auth on your own GitHub Pages domain, you simply need to link the app to your own free Firebase Database:

### Step 1: Create a Free Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/) and log in with your Google account.
2. Click **Add Project**, name it something like `MotoVault-DB`, and follow the prompts. (You can turn off Google Analytics).
3. Once the project is created, click the **Web icon (`</>`)** on the Project Overview page to register a Web App.
4. Name the web app (e.g., `MotoVault Web`), leave Firebase Hosting unchecked, and click **Register App**.
5. You will be shown a `firebaseConfig` object (a snippet of code with `apiKey`, `authDomain`, `projectId`, etc.). **Copy this block of keys**.

### Step 2: Enable Authentication & Firestore
1. On the left menu, go to **Build -> Authentication**. Click **Get Started**.
2. Go to the **Sign-in method** tab, click **Google**, enable it, select a support email, and click Save.
3. Go to the **Settings** tab (within Authentication), select **Authorized domains**, click **Add domain**, and type in `aadi2305.github.io`.
4. Next, on the left menu, go to **Build -> Firestore Database**. Click **Create database**.
5. Start in **Test mode** (or set up basic rules later), choose a location, and click **Create**.

### Step 3: Replace the Config in your Repository!
Now, you just need to tell MotoVault to use *your* new database instead of the AI Studio one. 
1. In your GitHub repository, open the file `firebase-applet-config.json` (located at the root level).
2. Replace all the keys with the ones you copied from Firebase in Step 1. It should look like this:
   ```json
   {
     "apiKey": "AIzaSyYourNewApiKey...",
     "authDomain": "your-motovault-project.firebaseapp.com",
     "projectId": "your-motovault-project",
     "storageBucket": "your-motovault-project.appspot.com",
     "messagingSenderId": "1234567890",
     "appId": "1:1234567890:web:abcdef1234567"
   }
   ```
3. Commit this change. The GitHub Action will immediately rebuild your site, and Google Login + Cloud Sync will work flawlessly on your domain!

---

## 📱 Premium iOS Safari Standalone PWA Setup
Once your URL is active (usually `https://<aadi2305>.github.io/<your-repository-name>/`):

1. Launch **Safari** on your iPhone and open your live link.
2. Tap the **Share** button in the browser sheet.
3. Select **Add to Home Screen**.
4. Launch MotoVault directly from your phone's home screen for a gorgeous, full-screen, native-feeling ride logbook with tailored safe-areas and inputs!

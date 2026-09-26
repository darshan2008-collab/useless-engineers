# Android Studio APK Guide for Q-SENSE Mobile

This project contains a fully configured native Android Studio project that packages the Q-SENSE React web application into an Android Mobile APK without altering any web features or designs.

---

## 📁 Android Project Location
- **Android Studio Project Path**: `d:\WONDER AI\frontend\android`
- **Capacitor Configuration**: `d:\WONDER AI\frontend\capacitor.config.json`

---

## 🚀 Method 1: Open in Android Studio (GUI)

1. Open **Android Studio**.
2. Select **Open** (or `File > Open...`).
3. Browse to and select the directory:
   ```
   d:\WONDER AI\frontend\android
   ```
4. Wait for Gradle sync to complete automatically.
5. To generate the APK:
   - Click menu **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
6. Once the build finishes, click the popup notification link **locate** to find your `.apk` file:
   ```
   frontend/android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## ⚡ Method 2: Build APK via Terminal (CLI)

From PowerShell or Command Prompt, run:
```powershell
cd "d:\WONDER AI\frontend\android"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
.\gradlew assembleDebug
```
The output APK will be at:
`frontend/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔄 When You Make Updates to the Web App:

If you update any frontend code in `frontend/src`:
1. Re-build and sync assets into Android Studio:
   ```powershell
   cd "d:\WONDER AI\frontend"
   npm run build
   npx cap sync android
   ```
2. Re-build the APK in Android Studio or using `./gradlew assembleDebug`.

---

## 🌐 Connecting to the Backend API from Mobile

- **Android Emulator**: Automatically routes `http://10.0.2.2:8000/api` to your host computer's backend.
- **Physical Android Phone**: Ensure your phone is connected to the same Wi-Fi network as your computer, and use your computer's local IP (e.g. `http://192.168.1.X:8000/api`).

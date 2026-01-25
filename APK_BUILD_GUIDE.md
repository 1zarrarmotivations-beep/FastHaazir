# APK Build & Firebase SHA Key Setup Guide

## 🔑 CRITICAL: Firebase SHA Keys for APK Phone Auth

For Firebase Phone OTP to work on Android APK, you MUST add SHA fingerprints to Firebase Console.

### Generate SHA Keys

**Option 1: Debug Keystore (for testing)**
```bash
# On Linux/Mac
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# On Windows
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Option 2: Release Keystore (for production)**
```bash
keytool -list -v -keystore /path/to/your-release-keystore.jks -alias your-key-alias
```

### Add SHA Keys to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/project/fast-haazir-786/settings/general/android:com.fasthaazir.app)
2. Select project: `fast-haazir-786`
3. Go to **Project Settings** > **General** tab
4. Scroll to **Your apps** > **Android apps**
5. Find `com.fasthaazir.app`
6. Click **Add fingerprint**
7. Paste your SHA-1 and SHA-256 fingerprints

### Required SHA Keys

| Environment | Fingerprint Type | Status |
|-------------|------------------|--------|
| Debug APK   | SHA-1            | ⚠️ Must add |
| Debug APK   | SHA-256          | ⚠️ Must add |
| Release APK | SHA-1            | ⚠️ Must add |
| Release APK | SHA-256          | ⚠️ Must add |

---

## 📱 Building the APK

### Method 1: GitHub Actions (Recommended)

1. Go to your repository: https://github.com/babajaanz451-spec/fasthaazir
2. Click **Actions** tab
3. Select **Build Android APK** workflow
4. Click **Run workflow**
5. Wait for build to complete
6. Download APK from **Artifacts**

### Method 2: Local Build

```bash
# Clone and enter frontend directory
cd frontend

# Install dependencies
npm install

# Build the web app
npm run build

# Sync Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android

# Or build directly
cd android
./gradlew assembleDebug
```

---

## ✅ Verification Checklist

Before building APK, ensure:

- [ ] `google-services.json` exists in `frontend/android/app/`
- [ ] Package name is `com.fasthaazir.app` in all config files
- [ ] SHA fingerprints are added to Firebase Console
- [ ] `.env` has correct Supabase values
- [ ] `capacitor.config.ts` has correct settings

---

## 🔧 Configuration Files

| File | Purpose |
|------|---------|
| `frontend/android/app/google-services.json` | Firebase Android config |
| `frontend/capacitor.config.ts` | Capacitor settings |
| `frontend/.env` | Environment variables |
| `.github/workflows/main.yml` | GitHub Actions build |

---

## 🐛 Troubleshooting

### OTP Not Sending
1. Verify SHA keys are added to Firebase
2. Check Firebase Phone Auth is enabled
3. Verify package name matches (`com.fasthaazir.app`)

### Network/Connection Errors
1. Check `network_security_config.xml` allows required domains
2. Verify `AndroidManifest.xml` has INTERNET permission
3. Ensure Supabase URL is correct

### Data Not Loading
1. Verify Supabase anon key is correct
2. Check RLS policies allow access
3. Verify API calls are not being blocked

---

## 📋 Current Configuration

- **Firebase Project**: `fast-haazir-786`
- **Package Name**: `com.fasthaazir.app`
- **Supabase Project**: `pmqkclhqvjfmcxzuoypa`
- **Min SDK**: 22
- **Target SDK**: 34

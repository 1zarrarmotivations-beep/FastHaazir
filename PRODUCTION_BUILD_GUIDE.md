# Fast Haazir - Production APK Build Guide

## 🎯 Overview

This guide explains how to build a **production-ready APK** for Fast Haazir that works **identically to the web app**.

---

## ⚠️ CRITICAL: SHA Keys for Firebase Phone OTP

For Firebase Phone Authentication (OTP) to work in the APK, you **MUST** add SHA fingerprints to Firebase Console.

### Step 1: Generate SHA Keys

**For Debug APK (testing):**
```bash
# Linux/Mac
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Windows
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**For Release APK (production):**
```bash
keytool -list -v -keystore /path/to/your-release.keystore -alias your-alias
```

### Step 2: Add SHA Keys to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/project/fast-haazir-786/settings/general/android:com.fasthaazir.app)
2. Select **Project Settings** → **General** tab
3. Scroll to **Your apps** → **Android apps** → `com.fasthaazir.app`
4. Click **Add fingerprint**
5. Add both **SHA-1** and **SHA-256** for:
   - Debug keystore (for testing)
   - Release keystore (for production)

### SHA Keys Checklist

| Keystore | SHA-1 | SHA-256 | Status |
|----------|-------|---------|--------|
| Debug    | ⚠️    | ⚠️      | Add to Firebase |
| Release  | ⚠️    | ⚠️      | Add to Firebase |

---

## 🚀 Building the APK

### Method 1: GitHub Actions (Recommended)

1. Go to **GitHub Repository** → **Actions** tab
2. Select **"Build Android APK (Production Ready)"** workflow
3. Click **"Run workflow"**
4. Wait for build (~5-10 minutes)
5. Download APK from **Artifacts** section

### Method 2: Local Build

```bash
# 1. Clone and navigate
cd frontend

# 2. Install dependencies
npm install

# 3. Create .env file
cat > .env << EOF
VITE_SUPABASE_URL=https://pmqkclhqvjfmcxzuoypa.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcWtjbGhxdmpmbWN4enVveXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0ODY2MTEsImV4cCI6MjA4MjA2MjYxMX0.EObJ4bGppAue12-eXk-CjWTCvSaqEKRpVeObJ7O7r64
VITE_SUPABASE_PROJECT_ID=pmqkclhqvjfmcxzuoypa
EOF

# 4. Build frontend
npm run build

# 5. Sync Capacitor
npx cap sync android

# 6. Build APK
cd android
./gradlew assembleDebug

# APK location: app/build/outputs/apk/debug/app-debug.apk
```

---

## ✅ Verification Checklist

After building, verify these features work:

### Authentication
- [ ] Customer Phone OTP login works with **REAL numbers** (+92...)
- [ ] Admin email/password login works
- [ ] Rider login works
- [ ] No test/bypass OTP logic

### Data Loading
- [ ] Restaurants load correctly
- [ ] Menu items display
- [ ] Orders load in history
- [ ] Chat messages work
- [ ] Real-time updates function

### Firebase Configuration
- [ ] Same Firebase project as web (`fast-haazir-786`)
- [ ] `google-services.json` is in `android/app/`
- [ ] Package name is `com.fasthaazir.app`
- [ ] SHA keys added to Firebase Console

### Supabase Configuration
- [ ] Same Supabase URL as web
- [ ] Same anon key as web
- [ ] No "connection error" messages
- [ ] RLS policies work correctly

---

## 🔧 Configuration Details

### Firebase Project
- **Project ID:** `fast-haazir-786`
- **Package Name:** `com.fasthaazir.app`
- **Auth Methods:** Phone OTP, Email/Password, Google

### Supabase Project
- **Project ID:** `pmqkclhqvjfmcxzuoypa`
- **URL:** `https://pmqkclhqvjfmcxzuoypa.supabase.co`

### Android Configuration
- **Min SDK:** 22
- **Target SDK:** 34
- **Scheme:** HTTPS

---

## 🐛 Troubleshooting

### OTP Not Working
1. ✅ Verify SHA keys are added to Firebase Console
2. ✅ Check `google-services.json` has correct package name
3. ✅ Ensure Firebase Phone Auth is enabled
4. ✅ Clear app data and reinstall

### "Internet / Connection Error"
1. ✅ Check `network_security_config.xml` includes `supabase.co`
2. ✅ Verify `AndroidManifest.xml` has INTERNET permission
3. ✅ Ensure Supabase URL is correct
4. ✅ Check device has internet connection

### Restaurants Not Loading
1. ✅ Verify Supabase URL is correct in build
2. ✅ Check RLS policies in Supabase
3. ✅ Verify user is authenticated
4. ✅ Check console logs for errors

### Slow Performance
1. ✅ Enable ProGuard/R8 for release builds
2. ✅ Check for large images
3. ✅ Verify network requests are efficient

---

## 📋 Files Overview

| File | Purpose |
|------|---------|
| `frontend/android/app/google-services.json` | Firebase Android config |
| `frontend/android/app/src/main/AndroidManifest.xml` | Android permissions |
| `frontend/android/app/src/main/res/xml/network_security_config.xml` | Network security |
| `frontend/capacitor.config.ts` | Capacitor configuration |
| `.github/workflows/Build-APK.yml` | GitHub Actions workflow |

---

## 🔐 Security Notes

- **Supabase anon key** is a publishable key (safe to include in code)
- **Firebase config** is fetched from edge function (secrets are server-side)
- **SHA keys** must match between APK signing and Firebase Console
- **RLS policies** protect data at database level

---

**Version:** 1.0.0  
**Last Updated:** January 2026

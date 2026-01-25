# Fast Haazir - Production APK Build Guide

## 🎯 Overview

This guide explains how to build a **production-ready, signed APK** for Fast Haazir using GitHub Actions.

---

## 📋 Prerequisites

### 1. Firebase Setup (CRITICAL for OTP)

#### Add SHA Fingerprints to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → Project Settings → Your Apps → Android app
3. Add **SHA-1** and **SHA-256** fingerprints

**For Debug builds (testing):**
```bash
# Get debug keystore fingerprints
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**For Release builds (production):**
```bash
# Get release keystore fingerprints
keytool -list -v -keystore your-release-key.jks -alias your-alias
```

#### Download google-services.json

1. Firebase Console → Project Settings → Your Apps
2. Download `google-services.json`
3. Place it in: `frontend/android/app/google-services.json`
4. Commit to repository

### 2. Enable Firebase Phone Authentication

1. Firebase Console → Authentication → Sign-in method
2. Enable **Phone** provider
3. ✅ Enable **SafetyNet** (for Android)
4. ✅ Add test phone numbers ONLY for development

---

## 🔐 GitHub Secrets Setup

Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

Add these secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `KEYSTORE_BASE64` | Base64-encoded release keystore | See below |
| `KEYSTORE_PASSWORD` | Keystore password | Your password |
| `KEY_ALIAS` | Key alias name | Usually `upload` or `release` |
| `KEY_PASSWORD` | Key password | Your key password |

### Generate Keystore (First Time Only)

```bash
# Create a new release keystore
keytool -genkey -v -keystore fast-haazir-release.jks \
  -alias upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Convert to base64 for GitHub Secrets
base64 -i fast-haazir-release.jks -o keystore-base64.txt
```

Copy the contents of `keystore-base64.txt` to `KEYSTORE_BASE64` secret.

---

## 🚀 Build the APK

### Option 1: Manual Trigger (Recommended)

1. Go to **GitHub → Actions → Build Signed Android APK (Production)**
2. Click **Run workflow**
3. Set version name/code (optional)
4. Click **Run workflow**
5. Wait for build to complete (~5-10 minutes)
6. Download APK from **Artifacts**

### Option 2: Create a Release

1. Go to **GitHub → Releases → Create new release**
2. Create a tag (e.g., `v1.0.0`)
3. Publish release
4. APK will be automatically built and attached

---

## ✅ Verification Checklist

After building, verify these features work:

### Authentication
- [ ] Phone OTP works with REAL Pakistani numbers (+92)
- [ ] Email/Password login works
- [ ] Google Sign-In works (if enabled)
- [ ] No test OTP codes exist

### Core Features
- [ ] Customer can browse restaurants
- [ ] Customer can add items to cart
- [ ] Customer can place orders
- [ ] Location picker works (GPS)
- [ ] Chat between customer & rider works
- [ ] Voice notes in chat work

### Roles
- [ ] Admin can login and access dashboard
- [ ] Rider can login and see deliveries
- [ ] Customer can login and place orders
- [ ] Business role is NOT accessible (removed)

### Real-time
- [ ] Order status updates live
- [ ] Chat messages appear instantly
- [ ] Admin can monitor chats silently

### Security
- [ ] No phone numbers visible in chat
- [ ] No hardcoded admin credentials
- [ ] RLS policies enforced

---

## 🔧 Troubleshooting

### OTP Not Working

1. **Check SHA fingerprints** are added to Firebase
2. **Check google-services.json** is in `android/app/`
3. **Check Firebase Phone Auth** is enabled
4. Try clearing app data and reinstalling

### Build Fails

1. Check GitHub Actions logs for specific error
2. Ensure all secrets are set correctly
3. Verify `google-services.json` exists

### Chat Not Working

1. Check Supabase RLS policies
2. Verify user is authenticated
3. Check network logs for errors

---

## 📱 App Permissions

The APK requires these permissions:

- `INTERNET` - Network access
- `ACCESS_FINE_LOCATION` - GPS for delivery
- `ACCESS_COARSE_LOCATION` - Approximate location
- `CAMERA` - Profile photos
- `POST_NOTIFICATIONS` - Push notifications
- `VIBRATE` - Haptic feedback
- `ACCESS_NETWORK_STATE` - Connectivity checks
- `WAKE_LOCK` - Background location updates

---

## 🌐 Supabase Configuration

The app connects to Supabase at:
- **Project ID**: `pmqkclhqvjfmcxzuoypa`
- **URL**: `https://pmqkclhqvjfmcxzuoypa.supabase.co`

### Edge Functions Available:
- `calculate-distance` - Road-based distance calculation
- `get-firebase-config` - Firebase config delivery
- `create-order-api` - Order creation
- `assign-rider-api` - Rider assignment
- `notify-rider` - Push notifications
- `send-push-notification` - Broadcast notifications

---

## 📞 Support

For issues:
1. Check GitHub Actions logs
2. Check Supabase Edge Function logs
3. Check Firebase Console for auth errors

---

**Version**: 1.0.0  
**Last Updated**: January 2026

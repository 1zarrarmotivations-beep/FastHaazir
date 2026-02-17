# Testing vs Production APK Guide

## 🚨 Important: Release APK Issue

**Problem**: Release APK requires Play Store distribution for Play Integrity to work properly.

**Solution for Testing**: Use Debug APK with real numbers enabled.

---

## 📱 Recommended APK for Testing:

**Use**: `app-debug-recaptcha.apk`

**Why**:
- ✅ Works without Play Store
- ✅ Real phone numbers supported (with App Check OFF)
- ✅ Google Sign-In works
- ✅ All features enabled

---

## ⚙️ Firebase Console Settings for Testing:

### Step 1: Turn OFF App Check Enforcement

**Option A - Via App Check Dashboard:**
1. Link: https://console.firebase.google.com/project/fast-haazir-786/appcheck
2. Apps tab → Android app
3. Click 3 dots menu → "Manage enforcement"
4. Turn OFF enforcement
5. Save

**Option B - Via Authentication Settings:**
1. Link: https://console.firebase.google.com/project/fast-haazir-786/authentication/settings
2. Find "App Check" section
3. UNCHECK "Enforce App Check for phone authentication"
4. Save

### Step 2: Keep Testing Numbers (Optional)

Testing numbers ko rakhna better hai:
- Phone: `+923365476414`
- Code: `123456`

Yeh guaranteed working hai.

---

## 🧪 Testing Workflow:

### For Development/Testing:
```
1. Use: app-debug-recaptcha.apk
2. App Check: OFF
3. Test numbers: Enabled
4. Real numbers: Will work (with App Check OFF)
```

### For Play Store Upload:
```
1. Use: app-release-recaptcha.apk
2. Upload to Play Store (Internal Testing track)
3. App Check: ON (automatically works after Play Store)
4. Test numbers: Remove (optional)
```

---

## ✅ Current Working Setup:

**APK**: `app-debug-recaptcha.apk`

**Firebase Settings**:
- App Check Enforcement: OFF
- Testing phone: +923365476414 (code: 123456)
- Play Integrity: Registered (will work after Play Store)

**Login Methods**:
- ✅ Phone OTP (test number): Working
- ✅ Phone OTP (real numbers): Will work with App Check OFF
- ✅ Google Sign-In: Will work with App Check OFF
- ✅ Email/Password: Always works

---

## 🎯 Next Steps:

### For Testing Now:
1. Firebase Console → Turn OFF App Check enforcement
2. Install `app-debug-recaptcha.apk`
3. Test with real phone numbers
4. Test Google Sign-In

### For Production (Play Store):
1. Keep `app-release-recaptcha.apk` ready
2. Upload to Play Store (Internal Testing first)
3. Turn ON App Check enforcement
4. Test from Play Store download
5. Everything will work automatically

---

## 📞 Expected Behavior After App Check OFF:

**Phone OTP**:
- Test number (+923365476414): ✅ Works (code: 123456)
- Real numbers: ✅ Works (real SMS will come)

**Google Sign-In**:
- ✅ Native picker will show
- ✅ Login will work

**Email/Password**:
- ✅ Always works

---

## 🔐 Security Note:

**App Check OFF** is safe for:
- ✅ Development
- ✅ Testing
- ✅ Internal team testing

**App Check ON** required for:
- ⚠️ Production (Play Store)
- ⚠️ Public release
- ⚠️ Preventing abuse

---

## 📋 Troubleshooting:

**If real numbers still not working**:
1. Verify App Check is OFF in Firebase Console
2. Clear app data and cache
3. Uninstall and reinstall app
4. Wait 5 minutes (Firebase settings propagation)
5. Try again

**If Google Sign-In still failing**:
1. Verify App Check is OFF
2. Check internet connection
3. Update Google Play Services
4. Restart phone
5. Try again

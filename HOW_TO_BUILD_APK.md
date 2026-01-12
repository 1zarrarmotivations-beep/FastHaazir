# 📱 How to Build Fast Haazir APK File

## Step-by-Step Guide to Create Android APK

---

## 🎯 **QUICK START (5 Steps)**

### **Step 1: Build the Web App**
```bash
cd /app/frontend
yarn build
```
This creates the production build in the `dist/` folder.

---

### **Step 2: Add Android Platform (First Time Only)**
```bash
npx cap add android
```
This creates the `android/` folder with the native Android project.

---

### **Step 3: Sync Code to Android**
```bash
npx cap sync android
```
This copies your web app to the Android project.

---

### **Step 4: Open Android Studio**
```bash
npx cap open android
```
This opens the project in Android Studio.

---

### **Step 5: Build APK in Android Studio**

**Option A: Debug APK (for testing)**
1. In Android Studio: **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for build to complete (2-5 minutes)
3. Click "locate" link in the notification
4. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

**Option B: Release APK (for distribution)**
1. In Android Studio: **Build** → **Generate Signed Bundle / APK**
2. Select **APK** → Click **Next**
3. Create or select a keystore
4. Enter keystore details
5. Select **release** build variant
6. Click **Finish**
7. APK location: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🛠️ **DETAILED INSTRUCTIONS**

### **Prerequisites**

Before building, ensure you have:
- ✅ **Node.js 20+** installed
- ✅ **Java JDK 17+** installed
- ✅ **Android Studio** installed
- ✅ **Android SDK** installed (via Android Studio)

**Install Android Studio:**
1. Download from: https://developer.android.com/studio
2. Install with default settings
3. Open Android Studio → SDK Manager → Install Android SDK 33+

---

### **Full Build Process**

#### **1. Prepare Your App**

```bash
# Navigate to frontend directory
cd /app/frontend

# Install dependencies (if not already done)
yarn install

# Build for production
yarn build
```

**Expected output:**
```
✓ built in 15.23s
dist/index.html                   0.52 kB
dist/assets/index-abc123.js       850.42 kB
```

---

#### **2. Initialize Capacitor (First Time)**

```bash
# Add Android platform
npx cap add android
```

**This creates:**
```
/app/frontend/android/
├── app/
│   ├── src/
│   ├── build.gradle
│   └── ...
├── gradle/
└── build.gradle
```

---

#### **3. Configure Android App**

Edit `/app/frontend/android/app/build.gradle`:

```gradle
android {
    namespace "com.fasthaazir.app"
    compileSdk 34
    
    defaultConfig {
        applicationId "com.fasthaazir.app"
        minSdk 22
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }
}
```

---

#### **4. Sync Web Code to Android**

```bash
# Sync changes
npx cap sync android
```

**This copies:**
- Your built web app from `dist/` to `android/app/src/main/assets/public/`
- Plugin configurations
- Native code changes

---

#### **5. Open in Android Studio**

```bash
# Open Android Studio
npx cap open android
```

**Wait for:**
- Gradle sync to complete (2-5 minutes first time)
- Indexing to finish
- "Build" option to become available

---

#### **6. Build APK**

### **Method 1: Debug APK (Quick Testing)**

**Via Android Studio:**
1. Click **Build** menu
2. Select **Build Bundle(s) / APK(s)**
3. Click **Build APK(s)**
4. Wait for build (progress bar at bottom)
5. Click **locate** link in notification
6. Find APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

**Via Command Line:**
```bash
cd /app/frontend/android
./gradlew assembleDebug
```

**APK Location:**
```
/app/frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

---

### **Method 2: Release APK (Production)**

**Step 1: Create Keystore (First Time Only)**

```bash
cd /app/frontend/android/app

keytool -genkey -v -keystore fasthaazir-release.keystore \
  -alias fasthaazir \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Enter details when prompted:**
```
Enter keystore password: [create strong password]
Re-enter new password: [same password]
What is your first and last name? [Your name]
What is your name of your organizational unit? [Fast Haazir]
What is the name of your organization? [Your company]
What is the name of your City or Locality? [Quetta]
What is the name of your State or Province? [Balochistan]
What is the two-letter country code? [PK]
Is CN=..., OU=..., O=..., L=..., ST=..., C=... correct? [yes]
```

**Step 2: Configure Signing**

Create `/app/frontend/android/key.properties`:
```properties
storePassword=your_keystore_password
keyPassword=your_key_password
keyAlias=fasthaazir
storeFile=fasthaazir-release.keystore
```

**Step 3: Update build.gradle**

Edit `/app/frontend/android/app/build.gradle`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Step 4: Build Release APK**

**Via Android Studio:**
1. **Build** → **Generate Signed Bundle / APK**
2. Select **APK** → **Next**
3. Select keystore file: `fasthaazir-release.keystore`
4. Enter passwords
5. Select **release** variant
6. Click **Finish**

**Via Command Line:**
```bash
cd /app/frontend/android
./gradlew assembleRelease
```

**APK Location:**
```
/app/frontend/android/app/build/outputs/apk/release/app-release.apk
```

---

## 📦 **AFTER BUILDING**

### **Install APK on Device**

**Method 1: USB Connection**
```bash
# Connect phone via USB
# Enable Developer Options + USB Debugging on phone

# Install APK
adb install /app/frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

**Method 2: Transfer File**
1. Copy APK to your phone via USB/Email/Drive
2. Open APK file on phone
3. Allow "Install from unknown sources"
4. Tap "Install"

---

### **Test the APK**

**On Real Device:**
1. Install APK
2. Open Fast Haazir app
3. Test login with phone OTP
4. Test all features:
   - Browse restaurants
   - Place order
   - Camera (profile photo)
   - Location (GPS)
   - Push notifications
   - Chat system

---

## 🚀 **QUICK BUILD SCRIPT**

I've added convenient commands to `package.json`:

```bash
# Build web + sync + open Android Studio
yarn mobile:android

# Just build web + sync
yarn mobile:build
```

---

## 📱 **APK FILE DETAILS**

**Debug APK:**
- Size: ~50-80 MB
- Signed with debug key
- Use for: Testing only
- Not for: Google Play Store

**Release APK:**
- Size: ~30-50 MB (optimized)
- Signed with your release key
- Use for: Production, Google Play Store
- Minified and optimized

---

## ⚠️ **IMPORTANT NOTES**

### **1. Keystore Security**
- ⚠️ **NEVER** lose your keystore file
- ⚠️ **NEVER** share your keystore passwords
- ⚠️ **BACKUP** keystore file securely
- Without keystore, you cannot update your app on Play Store

### **2. Version Management**
Update version in `android/app/build.gradle`:
```gradle
versionCode 2      // Increment for each release
versionName "1.0.1" // Semantic versioning
```

### **3. Permissions**
Fast Haazir uses these permissions (auto-added):
- Camera
- Location (GPS)
- Internet
- Storage
- Notifications

---

## 🔧 **TROUBLESHOOTING**

### **Problem: Gradle Sync Failed**
```bash
cd /app/frontend/android
./gradlew clean
./gradlew build
```

### **Problem: Build Failed - SDK Not Found**
1. Open Android Studio
2. File → Project Structure → SDK Location
3. Set Android SDK path
4. Install SDK 33+ from SDK Manager

### **Problem: App Crashes on Launch**
1. Check logs: `adb logcat | grep FastHaazir`
2. Verify all plugins installed: `npx cap sync`
3. Rebuild: `yarn build && npx cap sync`

### **Problem: White Screen**
1. Clear Android cache:
   ```bash
   cd /app/frontend/android
   ./gradlew clean
   ```
2. Rebuild web app: `yarn build`
3. Sync: `npx cap sync android`

---

## 📊 **BUILD TIME ESTIMATES**

| Task | Time |
|------|------|
| `yarn build` | 15-30 seconds |
| `npx cap add android` | 2-3 minutes (first time) |
| `npx cap sync` | 10-20 seconds |
| Gradle sync | 2-5 minutes (first time) |
| Debug APK build | 1-3 minutes |
| Release APK build | 3-5 minutes |

---

## ✅ **FINAL CHECKLIST**

Before distributing your APK:

- [ ] Tested on multiple Android devices
- [ ] All features working (camera, GPS, push)
- [ ] No crashes or errors
- [ ] Version number updated
- [ ] App icon and splash screen set
- [ ] Keystore backed up securely
- [ ] Release APK signed properly

---

## 🎉 **SUCCESS!**

Your Fast Haazir APK is ready!

**What you can do now:**
1. ✅ Install on your Android device
2. ✅ Share with testers
3. ✅ Upload to Google Play Store
4. ✅ Distribute via your website

**APK Location:**
```
Debug: /app/frontend/android/app/build/outputs/apk/debug/app-debug.apk
Release: /app/frontend/android/app/build/outputs/apk/release/app-release.apk
```

---

## 📱 **NEXT: iOS APP**

To build for iPhone (requires Mac):
```bash
yarn build
npx cap add ios
npx cap sync ios
npx cap open ios
# Build in Xcode
```

---

**Need help? Check `/app/MOBILE_APP_GUIDE.md` for more details!** 🚀

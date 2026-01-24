# Fast Haazir - Android Build Guide

## 🚀 Quick Start

### GitHub Actions (Recommended)
The repository includes automated workflows for building APK and AAB files.

1. **Debug Build** (Every push to main):
   - Go to Actions → "Build Android APK & AAB"
   - Download artifacts: `fast-haazir-debug-apk`, `fast-haazir-release-apk`, `fast-haazir-release-aab`

2. **Signed Release Build**:
   - Go to Actions → "Build Signed APK & AAB (Release)"
   - Click "Run workflow"
   - Optionally set version code/name

### Local Build

```bash
# Navigate to frontend
cd frontend

# Install dependencies
yarn install

# Build web assets
yarn build

# Sync to Android
npx cap sync android

# Open in Android Studio
npx cap open android
```

## 📦 Build Outputs

| Output | Path | Use Case |
|--------|------|----------|
| Debug APK | `android/app/build/outputs/apk/debug/` | Testing |
| Release APK | `android/app/build/outputs/apk/release/` | Direct distribution |
| Release AAB | `android/app/build/outputs/bundle/release/` | Play Store |

## 🔐 Signing Configuration

### For GitHub Actions (Signed Builds)
Set these secrets in your repository:

| Secret | Description |
|--------|-------------|
| `KEYSTORE_BASE64` | Base64 encoded keystore file |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias name |
| `KEY_PASSWORD` | Key password |
| `SUPABASE_PROJECT_ID` | Your Supabase project ID |
| `SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `SUPABASE_URL` | Your Supabase URL |

### Generate Keystore
```bash
keytool -genkey -v -keystore release-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias fasthaazir
```

### Encode Keystore for GitHub
```bash
base64 -i release-keystore.jks | pbcopy  # macOS
base64 release-keystore.jks | xclip      # Linux
```

## 🛠️ Requirements

- Node.js 20+
- Java 17 (Temurin recommended)
- Gradle 8.4
- Android SDK (for local builds)

## 📱 App Information

| Property | Value |
|----------|-------|
| App ID | `com.fasthaazir.app` |
| App Name | Fast Haazir |
| Min SDK | 22 (Android 5.1) |
| Target SDK | 34 (Android 14) |
| Compile SDK | 34 |

## 🔧 Troubleshooting

### Build fails with "SDK not found"
Create `frontend/android/local.properties`:
```
sdk.dir=/path/to/your/Android/sdk
```

### Gradle wrapper permission denied
```bash
chmod +x frontend/android/gradlew
```

### Out of memory during build
Add to `frontend/android/gradle.properties`:
```
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=512m
```

## 📋 Checklist Before Release

- [ ] Update version code/name in `android/app/build.gradle`
- [ ] Test on physical device
- [ ] Verify all permissions work (Location, Camera, Notifications)
- [ ] Check RTL layout (Urdu)
- [ ] Verify deep links work
- [ ] Sign APK/AAB with release keystore

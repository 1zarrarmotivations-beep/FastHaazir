# Firebase Console Setup - Phone & Google Login Fix

## ⚠️ IMPORTANT: Yeh steps Firebase Console mein manually karne hain

### Step 1: Testing Phone Number Add Karo (5 minutes)

1. **Link kholo**: https://console.firebase.google.com/project/fast-haazir-786/authentication/providers

2. **Phone provider** par click karo (list mein "Phone" dhundo)

3. **Neeche scroll karo** "Phone numbers for testing" section tak

4. **"Add phone number"** button click karo

5. **Details enter karo**:
   - Phone number: `+923365476414`
   - Test code: `123456`

6. **Save** click karo

7. ✅ **Done!** Ab app mein phone login karte waqt automatically `123456` OTP use hoga


### Step 2: Play Integrity Register Karo (Optional - Production ke liye)

1. **Link kholo**: https://console.firebase.google.com/project/fast-haazir-786/appcheck

2. **Apps** tab mein jao

3. **Android app** (com.fasthaazir.app) dhundo

4. **Play Integrity** option par click karo

5. **Register** button click karo

6. Wait karo confirmation ke liye

7. ✅ **Done!** Production mein phone auth work karega


### Step 3: Google Sign-In Web Client ID Verify Karo

1. **Link kholo**: https://console.firebase.google.com/project/fast-haazir-786/authentication/providers

2. **Google** provider par click karo

3. **Web SDK configuration** section mein **Web client ID** copy karo

4. Verify karo ke yeh ID hai: `285845112968-hka6a1e9cloia1p1pabcd01ejp6s5vld.apps.googleusercontent.com`

5. Agar different hai to capacitor.config.ts mein update karo


## 🎯 Testing Instructions

### Phone Login Test:
1. App kholo
2. "Continue with Phone" click karo
3. Apna number enter karo: `+923365476414`
4. "Send OTP" click karo
5. OTP field mein `123456` enter karo
6. ✅ Login ho jana chahiye!

### Google Login Test:
1. App kholo
2. "Continue with Google" click karo
3. Native Google account picker dikhega
4. Account select karo
5. ✅ Login ho jana chahiye!


## ❌ Agar Phir Bhi Error Aaye

### "App verification failed" error:
- Step 1 (Testing phone number) complete karo
- Ya Step 2 (Play Integrity) register karo

### "Google sign-in failed" error:
- Purana app completely uninstall karo
- Phone restart karo
- Naya APK install karo

### "Invalid phone number" error:
- Number format check karo: `+92` se start hona chahiye
- Example: `+923001234567`


## 📱 APK Files

**Testing ke liye**:
- `app-debug-recaptcha.apk`

**Play Store ke liye**:
- `app-release-recaptcha.apk`


## 🔧 Technical Details (Optional)

- **Web API Key**: AIzaSyDdz4AgqojNY_UMo1t6ahf5KCdJnEWxB0I
- **Android API Key**: AIzaSyB0dz4tCtu1M-1OOjK0tbiA7J5bzNzxN_M
- **reCAPTCHA Site Key**: 6LcGo1UsAAAAAArxWVwzZDTSqlONtzhnEcwgwUtb
- **Package Name**: com.fasthaazir.app
- **Debug SHA-1**: F8:34:A6:FE:41:AD:39:5C:7E:BE:62:7F:4F:56:74:08:24:E7:4D:30
- **Release SHA-1**: 9C:01:05:9C:6D:ED:61:45:CB:6D:F8:92:82:30:72:57:04:78:CD:BC

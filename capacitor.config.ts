import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fasthaazir.app',
  appName: 'Fast Haazir',
  webDir: 'frontend/dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    cleartext: true,
    // Use live server URL for hot-reload testing (comment out for production APK)
    // url: 'http://192.168.x.x:8080',
    // allowNavigation: ['fast-haazir-786.web.app']
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#FF6A00',
      sound: 'notification',
    },
    Geolocation: {
      // No extra config needed - permissions handled in AndroidManifest
    },
    Haptics: {
      // No extra config needed
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a0a1a',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
};

export default config;

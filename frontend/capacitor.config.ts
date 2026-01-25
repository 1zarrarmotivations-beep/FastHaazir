import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fasthaazir.app',
  appName: 'Fast Haazir',
  webDir: 'dist',
  
  // Server configuration for production APK
  server: {
    // Use HTTPS scheme for Android (required for modern Android security)
    androidScheme: 'https',
    iosScheme: 'https',
    // Allow cleartext for development - needed for some Firebase operations
    cleartext: true,
  },
  
  // Android-specific configuration
  android: {
    // Allow mixed content for API calls
    allowMixedContent: true,
    // Capture all navigations (keep in app)
    captureInput: true,
    // Enable WebView debugging for troubleshooting (set to false for release)
    webContentsDebuggingEnabled: true,
    // Build options
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK'
    }
  },
  
  // Plugin configurations
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#10b981',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#10b981'
    },
    // HTTP configuration for API calls
    CapacitorHttp: {
      enabled: true
    }
  },
  
  // Logging configuration - use 'debug' for troubleshooting, 'production' for release
  loggingBehavior: 'debug'
};

export default config;

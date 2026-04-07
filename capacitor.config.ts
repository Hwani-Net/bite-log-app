import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fishlog.diary",
  appName: "BiteLog",
  webDir: "out",
  server: {
    // Remote URL: loads from Firebase App Hosting (API routes keep working)
    url: "https://bite-log-backend--bite-log-app.us-central1.hosted.app",
    cleartext: false,
  },
  android: {
    backgroundColor: "#080d14",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#080d14",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#080d14",
    },
  },
};

export default config;

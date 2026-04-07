import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fishlog.diary",
  appName: "BiteLog",
  webDir: "out",
  server: {
    // Remote URL: loads from Firebase App Hosting (API routes keep working)
    url: "https://bite-log-app.web.app",
    cleartext: false,
  },
  android: {
    backgroundColor: "#0f1720",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#0f1720",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f1720",
    },
  },
};

export default config;

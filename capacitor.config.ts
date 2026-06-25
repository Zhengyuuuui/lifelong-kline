import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lifekline.destiny",
  appName: "人生K线",
  webDir: "dist",
  backgroundColor: "#030303",
  ios: {
    contentInset: "never",
  },
};

if (process.env.CAPACITOR_SERVER_URL) {
  config.server = {
    url: process.env.CAPACITOR_SERVER_URL,
    cleartext: false,
  };
}

export default config;

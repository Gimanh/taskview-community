import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.handscream.taskview.app',
  appName: 'TaskView',
  webDir: 'dist',
  zoomEnabled: false,
  android: {
    zoomEnabled: false,
  },
  ios: {
    zoomEnabled: false,
    webContentsDebuggingEnabled: true,
  },
  server: {
    hostname: 'app.taskview.tech',
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false,
    },
    CapacitorCookies: {
      enabled: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
}

export default config

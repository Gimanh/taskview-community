import type { CapacitorConfig } from '@capacitor/cli';

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
    },
    server: {
        hostname: 'taskview.handscream.com',
        //androidScheme: 'https://',
    },
    plugins: {
        "CapacitorUpdater": {
            "autoUpdate": false,
        }
    },
    // server: {
    //     url: 'http://192.168.0.2:3000',
    //     cleartext: true,
    // },
};

export default config;

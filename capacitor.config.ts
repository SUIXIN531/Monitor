import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.monitor.app',
  appName: '监控器',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0f172a',
      overlaysWebView: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#6366f1',
    },
  },
};

export default config;
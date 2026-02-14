import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.monitor.app',
  appName: '监控器',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
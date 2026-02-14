import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

interface SettingsContextType {
  alertThreshold: number; // Arbitrage spread threshold
  setAlertThreshold: (val: number) => void;
  
  // New Volatility Settings
  volatilityThreshold: number; // % change
  setVolatilityThreshold: (val: number) => void;
  volatilityWindow: number; // minutes
  setVolatilityWindow: (val: number) => void;

  notificationsEnabled: boolean;
  requestNotificationPermission: () => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default Arbitrage threshold is 1%
  const [alertThreshold, setAlertThresholdState] = useState<number>(1.0);
  
  // Default Volatility: 2% change in 5 minutes
  const [volatilityThreshold, setVolatilityThresholdState] = useState<number>(2.0);
  const [volatilityWindow, setVolatilityWindowState] = useState<number>(5);

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Load saved settings
    const savedArb = localStorage.getItem('arb_alert_threshold');
    if (savedArb) setAlertThresholdState(parseFloat(savedArb));

    const savedVolThreshold = localStorage.getItem('vol_alert_threshold');
    if (savedVolThreshold) setVolatilityThresholdState(parseFloat(savedVolThreshold));

    const savedVolWindow = localStorage.getItem('vol_alert_window');
    if (savedVolWindow) setVolatilityWindowState(parseInt(savedVolWindow, 10));

    // Check permission status
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await LocalNotifications.checkPermissions();
      if (result.display === 'granted') {
        setNotificationsEnabled(true);
      }
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  };

  const setAlertThreshold = (val: number) => {
    setAlertThresholdState(val);
    localStorage.setItem('arb_alert_threshold', val.toString());
  };

  const setVolatilityThreshold = (val: number) => {
    setVolatilityThresholdState(val);
    localStorage.setItem('vol_alert_threshold', val.toString());
  };

  const setVolatilityWindow = (val: number) => {
    setVolatilityWindowState(val);
    localStorage.setItem('vol_alert_window', val.toString());
  };

  const requestNotificationPermission = async () => {
    if (Capacitor.isNativePlatform()) {
       try {
         const result = await LocalNotifications.requestPermissions();
         if (result.display === 'granted') {
            setNotificationsEnabled(true);
            return true;
         }
       } catch (e) {
         console.error("Native permission error", e);
       }
       return false;
    }

    if (!('Notification' in window)) {
      alert("This browser does not support desktop notification");
      return false;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setNotificationsEnabled(true);
      return true;
    }
    return false;
  };

  return (
    <SettingsContext.Provider value={{ 
      alertThreshold, 
      setAlertThreshold,
      volatilityThreshold,
      setVolatilityThreshold,
      volatilityWindow,
      setVolatilityWindow,
      notificationsEnabled, 
      requestNotificationPermission 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
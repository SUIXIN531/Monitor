import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'zh';

const translations = {
  en: {
    appTitle: "Monitor",
    navLive: "Binance Live",
    heroTitle: "Spot vs. Perpetual Arbitrage",
    heroDesc: "Monitor real-time spreads between Spot prices and Perpetual Futures (USDT & Coin-Margined) on Binance. Identify Cash-and-Carry opportunities and funding rate yield strategies instantly using AI.",
    monitorAssets: "Monitor Assets:",
    marketData: "Binance Market Data",
    spotPrice: "Spot Price",
    markPrice: "Mark Price",
    spread: "Spread",
    funding: "Funding (8h)",
    analyzeBtn: "Analyze Arbitrage Opportunity",
    waitingData: "Waiting for Market Data...",
    aiInsight: "AI Insight",
    risk: "Risk",
    riskLow: "Low",
    riskMedium: "Medium",
    riskHigh: "High",
    estYield: "Est. Yield",
    refreshAnalysis: "Refresh Analysis",
    networkOffline: "Network Offline: Please check your internet connection.",
    connectionError: "Connection Error: Binance API may be unreachable.",
    uMargined: "USDT-M",
    coinMargined: "COIN-M",
    perpetual: "Perpetual",
    refreshTitle: "Reconnect / Refresh Data",
    toggleLang: "中文",
    borrowInfo: "Borrow Info (Iso. Margin)",
    dailyRate: "Daily Interest",
    yearlyRate: "APR",
    borrowLimit: "Limit",
    borrowable: "Borrowable",
    yes: "Yes",
    no: "No",
    // Navigation & Market Page
    navScanner: "Scanner",
    navMarket: "Market",
    marketTitle: "Real-time Prices",
    colCoin: "Coin",
    colPrice: "Price",
    colChange: "24h Change",
    searchPlaceholder: "Search coin...",
    // Settings
    settingsTitle: "Settings",
    alertSettings: "Arbitrage Alerts",
    volatilitySettings: "Market Volatility Alerts",
    enableNotifications: "Enable Notifications",
    notificationsEnabled: "Notifications Enabled",
    notificationsDisabled: "Notifications Disabled (Tap to enable)",
    spreadThreshold: "Spread Threshold (%)",
    spreadThresholdDesc: "Notify when arbitrage spread exceeds this value.",
    volatilityThreshold: "Price Change Threshold (%)",
    volatilityTimeWindow: "Time Window",
    volatilityDesc: "Notify when price changes by {percent}% within {minutes} mins.",
    minutes: "min",
    saveBtn: "Done",
    alertBody: "{symbol} spread reached {spread}%!",
    volAlertBody: "{symbol} moved {percent}% in last {minutes}m!",
    grantPermission: "Please grant notification permission in settings."
  },
  zh: {
    appTitle: "监控器",
    navLive: "币安实盘",
    heroTitle: "现货 vs 永续合约套利",
    heroDesc: "实时监控币安现货价格与永续合约（USDT & 币本位）价差。利用 AI 即时识别期现套利机会及资金费率策略。",
    monitorAssets: "监控资产：",
    marketData: "币安市场数据",
    spotPrice: "现货价格",
    markPrice: "标记价格",
    spread: "价差",
    funding: "资金费率 (8h)",
    analyzeBtn: "分析套利机会",
    waitingData: "等待市场数据...",
    aiInsight: "AI 洞察",
    risk: "风险",
    riskLow: "低",
    riskMedium: "中",
    riskHigh: "高",
    estYield: "预估收益",
    refreshAnalysis: "刷新分析",
    networkOffline: "网络断开：请检查您的互联网连接。",
    connectionError: "连接错误：无法连接到币安 API。",
    uMargined: "U本位",
    coinMargined: "币本位",
    perpetual: "永续合约",
    refreshTitle: "重连 / 刷新数据",
    toggleLang: "English",
    borrowInfo: "借贷信息 (逐仓杠杆)",
    dailyRate: "日利率",
    yearlyRate: "年化",
    borrowLimit: "额度",
    borrowable: "可借",
    yes: "是",
    no: "否",
    // Navigation & Market Page
    navScanner: "扫描器",
    navMarket: "行情",
    marketTitle: "实时币价",
    colCoin: "币种",
    colPrice: "价格",
    colChange: "24h 涨跌",
    searchPlaceholder: "搜索币种...",
    // Settings
    settingsTitle: "设置",
    alertSettings: "套利提醒",
    volatilitySettings: "行情波动提醒",
    enableNotifications: "开启通知",
    notificationsEnabled: "通知已开启",
    notificationsDisabled: "通知未开启 (点击开启)",
    spreadThreshold: "价差阈值 (%)",
    spreadThresholdDesc: "当套利价差超过此数值时提醒。",
    volatilityThreshold: "涨跌幅阈值 (%)",
    volatilityTimeWindow: "时间窗口",
    volatilityDesc: "当价格在 {minutes} 分钟内波动超过 {percent}% 时提醒。",
    minutes: "分",
    saveBtn: "完成",
    alertBody: "{symbol} 价差已达到 {spread}%！",
    volAlertBody: "{symbol} 在 {minutes} 分钟内波动 {percent}%！",
    grantPermission: "请在设置中授予通知权限。"
  }
};

interface LanguageContextType {
  language: Language;
  t: typeof translations.en;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, t: translations[language], toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
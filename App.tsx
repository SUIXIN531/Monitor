import React, { useState } from 'react';
import ArbitrageScanner from './components/ArbitrageScanner';
import MarketList from './components/MarketList';
import { LanguageIcon, HomeIcon, ChartBarIcon, Cog6ToothIcon, XMarkIcon, BellAlertIcon, BellSlashIcon } from '@heroicons/react/24/solid';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { 
    alertThreshold, setAlertThreshold, 
    notificationsEnabled, requestNotificationPermission,
    volatilityThreshold, setVolatilityThreshold,
    volatilityWindow, setVolatilityWindow
  } = useSettings();

  if (!isOpen) return null;

  const timeOptions = [1, 5, 15, 60];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto no-scrollbar">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Cog6ToothIcon className="w-6 h-6 text-indigo-400" />
          {t.settingsTitle}
        </h3>

        <div className="space-y-6">
          {/* Notification Permission */}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
            <button
              onClick={requestNotificationPermission}
              className={`w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${
                notificationsEnabled 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
              }`}
            >
              {notificationsEnabled ? (
                <>
                  <BellAlertIcon className="w-5 h-5" />
                  {t.notificationsEnabled}
                </>
              ) : (
                <>
                  <BellSlashIcon className="w-5 h-5" />
                  {t.notificationsDisabled}
                </>
              )}
            </button>
          </div>

          {/* Arbitrage Alert */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">{t.alertSettings}</h4>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-300">{t.spreadThreshold}</label>
              <span className="text-xl font-mono font-bold text-indigo-400">{alertThreshold.toFixed(1)}%</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="5.0" 
              step="0.1" 
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <p className="text-xs text-slate-500">
              {t.spreadThresholdDesc}
            </p>
          </div>

          <div className="border-t border-slate-700/50 my-4"></div>

          {/* Volatility Alert */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">{t.volatilitySettings}</h4>
            </div>

            {/* Volatility Threshold */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-medium text-slate-300">{t.volatilityThreshold}</label>
                    <span className="text-xl font-mono font-bold text-orange-400">{volatilityThreshold.toFixed(1)}%</span>
                </div>
                <input 
                    type="range" 
                    min="0.5" 
                    max="10.0" 
                    step="0.5" 
                    value={volatilityThreshold}
                    onChange={(e) => setVolatilityThreshold(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
            </div>

             {/* Volatility Time Window */}
             <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">{t.volatilityTimeWindow}</label>
                <div className="grid grid-cols-4 gap-2">
                    {timeOptions.map(m => (
                        <button
                            key={m}
                            onClick={() => setVolatilityWindow(m)}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                volatilityWindow === m
                                ? 'bg-orange-500 text-white border-orange-400'
                                : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                            }`}
                        >
                            {m}{t.minutes}
                        </button>
                    ))}
                </div>
            </div>

            <p className="text-xs text-slate-500">
              {t.volatilityDesc.replace('{percent}', volatilityThreshold.toFixed(1)).replace('{minutes}', volatilityWindow.toString())}
            </p>
          </div>

          <button 
            onClick={onClose}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors mt-2"
          >
            {t.saveBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { t, toggleLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'scanner' | 'market'>('scanner');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0f172a]/90 backdrop-blur-lg border-b border-slate-800 safe-area-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 md:h-16 items-center">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                </div>
                <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent truncate max-w-[150px] md:max-w-none">
                  {t.appTitle}
                </h1>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Settings Button */}
                <button
                   onClick={() => setIsSettingsOpen(true)}
                   className="p-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                   <Cog6ToothIcon className="w-5 h-5" />
                </button>

                {/* Language Toggle */}
                <button 
                  onClick={toggleLanguage}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-800 border border-slate-700 active:scale-95 text-xs font-semibold text-slate-300 transition-all"
                >
                  <LanguageIcon className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">{t.toggleLang}</span>
                </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'scanner' && <ArbitrageScanner />}
        {activeTab === 'market' && <MarketList />}
      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-lg border-t border-slate-800 z-50 safe-area-bottom">
        <div className="max-w-7xl mx-auto flex justify-around items-center h-16 px-2">
            <button 
                onClick={() => setActiveTab('scanner')}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                    activeTab === 'scanner' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                <HomeIcon className={`w-6 h-6 transition-transform ${activeTab === 'scanner' ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium">{t.navScanner}</span>
            </button>
            
            <button 
                onClick={() => setActiveTab('market')}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                    activeTab === 'market' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
                <ChartBarIcon className={`w-6 h-6 transition-transform ${activeTab === 'market' ? 'scale-110' : ''}`} />
                <span className="text-[10px] font-medium">{t.navMarket}</span>
            </button>
        </div>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </LanguageProvider>
  );
};

export default App;
import React, { useEffect, useState, useRef } from 'react';
import { CoinData, ArbAnalysis, ConnectionStatus } from '../types';
import BinanceStreamManager, { fetchBorrowData } from '../services/binanceService';
import { analyzeArbitrage } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { ArrowPathIcon, SparklesIcon, SignalIcon, ExclamationTriangleIcon, BanknotesIcon, BellAlertIcon } from '@heroicons/react/24/solid';

interface ArbCardProps {
  symbol: string;
}

const formatPercent = (val: number | undefined) => {
  if (val === undefined) return '0.00%';
  return `${(val * 100).toFixed(4)}%`;
};

const formatPrice = (val: number | undefined) => {
  if (val === undefined) return '---';
  
  let decimals = 2;
  // Dynamic precision matching Binance's typical display logic
  if (val < 0.0001) decimals = 8;      // PEPE, SHIB (High precision for micro-caps)
  else if (val < 1) decimals = 5;      // DOGE, TRX, ALGO
  else if (val < 25) decimals = 4;     // XRP, ADA, DOT, LINK (Mid-range often uses 3 or 4)
  else decimals = 2;                   // BTC, ETH, SOL, BNB (> $25 usually 2 decimals)

  return val.toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

const ArbCard: React.FC<ArbCardProps> = ({ symbol }) => {
  const { t, language } = useLanguage();
  const { alertThreshold, notificationsEnabled } = useSettings();
  
  const [data, setData] = useState<CoinData>({
    symbol,
    spot: null,
    uMargined: null,
    coinMargined: null,
    borrow: null
  });
  
  const [analysis, setAnalysis] = useState<ArbAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.CONNECTING);
  const [errorMsg, setErrorMsg] = useState<string>("");
  
  const managerRef = useRef<BinanceStreamManager | null>(null);
  const lastAlertTimeRef = useRef<number>(0);

  useEffect(() => {
    // Reset data when symbol changes
    setData({
      symbol,
      spot: null,
      uMargined: null,
      coinMargined: null,
      borrow: null
    });
    setAnalysis(null);
    setStatus(ConnectionStatus.CONNECTING);
    setErrorMsg("");

    // Initialize Websocket
    managerRef.current = new BinanceStreamManager(
        symbol, 
        (newData) => {
            setData(prev => ({ ...prev, ...newData }));
        },
        (newStatus, msg) => {
            setStatus(newStatus);
            if (msg) setErrorMsg(msg);
        }
    );

    // Fetch Borrow Data
    fetchBorrowData(symbol).then(borrowData => {
      setData(prev => ({ ...prev, borrow: borrowData }));
    });

    return () => {
      managerRef.current?.disconnect();
    };
  }, [symbol]);

  const handleAnalyze = async () => {
    if (!data.spot || !data.uMargined) return;
    setIsAnalyzing(true);
    const result = await analyzeArbitrage(data, language);
    setAnalysis({ symbol, ...result });
    setIsAnalyzing(false);
  };

  const handleRefresh = () => {
    setAnalysis(null);
    managerRef.current?.reconnect();
    // Refresh borrow data too
    fetchBorrowData(symbol).then(borrowData => {
        setData(prev => ({ ...prev, borrow: borrowData }));
    });
  };

  const calculateSpread = (spot: number | undefined, future: number | undefined) => {
    if (!spot || !future) return 0;
    return ((future - spot) / spot);
  };

  const uSpread = calculateSpread(data.spot?.price, data.uMargined?.markPrice);
  const coinSpread = calculateSpread(data.spot?.price, data.coinMargined?.markPrice);

  // Notification Logic
  useEffect(() => {
    if (!notificationsEnabled || !data.spot) return;

    // Convert decimal spread to percentage for comparison
    const maxCurrentSpread = Math.max(Math.abs(uSpread), Math.abs(coinSpread)) * 100;
    
    // Check threshold
    if (maxCurrentSpread >= alertThreshold) {
        const now = Date.now();
        // Rate limit: One alert per 5 minutes per coin
        if (now - lastAlertTimeRef.current > 5 * 60 * 1000) {
            lastAlertTimeRef.current = now;
            
            const message = t.alertBody
                .replace('{symbol}', symbol)
                .replace('{spread}', maxCurrentSpread.toFixed(2));

            // Browser Notification
            if (document.visibilityState === 'hidden' || true) {
                 new Notification(`${t.appTitle}: ${symbol} Alert`, {
                     body: message,
                     icon: 'https://cdn-icons-png.flaticon.com/512/1213/1213795.png',
                     tag: `arb-alert-${symbol}` // replace existing notification for same symbol
                 });
            }
        }
    }
  }, [uSpread, coinSpread, alertThreshold, notificationsEnabled, symbol, t]);

  const getFundingColor = (rate: number | undefined) => {
    if (!rate) return 'text-slate-400';
    return rate > 0 ? 'text-green-400' : 'text-red-400';
  };

  const getSpreadColor = (spread: number) => {
    const absSpreadPercent = Math.abs(spread) * 100;
    // Highlight strongly if above threshold
    if (absSpreadPercent >= alertThreshold) return 'text-yellow-400 animate-pulse font-extrabold';
    
    if (Math.abs(spread) < 0.0005) return 'text-slate-400'; // Neutral
    return spread > 0 ? 'text-emerald-400' : 'text-rose-400';
  };

  const getStatusColor = () => {
      if (status === ConnectionStatus.CONNECTED) return "text-emerald-500";
      if (status === ConnectionStatus.CONNECTING) return "text-yellow-500";
      return "text-red-500";
  };

  const getDetailedErrorMessage = () => {
      if (!navigator.onLine) {
          return t.networkOffline;
      }
      return errorMsg || t.connectionError;
  };

  const getRiskLabel = (level: string) => {
      if (level === 'Low') return t.riskLow;
      if (level === 'Medium') return t.riskMedium;
      if (level === 'High') return t.riskHigh;
      return level;
  };

  const isHighSpread = (Math.max(Math.abs(uSpread), Math.abs(coinSpread)) * 100) >= alertThreshold;

  return (
    <div className={`backdrop-blur-md border rounded-xl p-4 shadow-xl flex flex-col gap-3 relative overflow-hidden transition-all active:border-slate-600 ${
        isHighSpread ? 'bg-indigo-900/20 border-indigo-500/50 shadow-indigo-500/10' : 'bg-slate-800/80 border-slate-700/50'
    }`}>
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-700/50 pb-2.5">
        <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-base relative shrink-0">
                {symbol.substring(0, 1)}
                {/* Status Dot */}
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-800 flex items-center justify-center bg-slate-800`}>
                    <SignalIcon className={`w-2.5 h-2.5 ${getStatusColor()}`} />
                </div>
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white leading-none">{symbol}</h3>
                    <button 
                        onClick={handleRefresh}
                        className="p-1 rounded-full bg-slate-700/50 text-slate-400 hover:text-white active:bg-slate-600 transition-colors"
                        title={t.refreshTitle}
                    >
                        <ArrowPathIcon className={`w-3 h-3 ${status === ConnectionStatus.CONNECTING ? 'animate-spin' : ''}`} />
                    </button>
                    {isHighSpread && (
                        <BellAlertIcon className="w-4 h-4 text-yellow-400 animate-bounce" />
                    )}
                </div>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">Binance Spot</p>
            </div>
        </div>
        <div className="text-right">
             <div className="text-[10px] text-slate-500 uppercase tracking-wide">{t.spotPrice}</div>
             <div className="text-lg font-mono font-bold text-white tracking-tight leading-none">
                ${formatPrice(data.spot?.price)}
             </div>
        </div>
      </div>

      {/* Error Message Banner */}
      {status === ConnectionStatus.ERROR && (
          <div className="bg-red-500/10 border border-red-500/20 rounded px-2 py-1.5 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs text-red-200 leading-tight">{getDetailedErrorMessage()}</span>
          </div>
      )}

      {/* Grid Data - Reduced gap for mobile */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* USDT-M Futures */}
        <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-700/30 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-1.5">
                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded tracking-wide">{t.uMargined}</span>
            </div>
            <div className="space-y-0.5">
                <div className="flex justify-between items-baseline">
                    <span className="text-[10px] text-slate-500">{t.markPrice}</span>
                    <span className="font-mono text-xs text-slate-200">{formatPrice(data.uMargined?.markPrice)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="text-[10px] text-slate-500">{t.spread}</span>
                    <span className={`font-mono text-xs font-bold ${getSpreadColor(uSpread)}`}>
                        {formatPercent(uSpread)}
                    </span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="text-[10px] text-slate-500">{t.funding}</span>
                    <span className={`font-mono text-[10px] ${getFundingColor(data.uMargined?.fundingRate)}`}>
                        {formatPercent(data.uMargined?.fundingRate)}
                    </span>
                </div>
            </div>
        </div>

        {/* COIN-M Futures */}
        <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-700/30 flex flex-col justify-between">
             <div className="flex justify-between items-start mb-1.5">
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded tracking-wide">{t.coinMargined}</span>
            </div>
            <div className="space-y-0.5">
                <div className="flex justify-between items-baseline">
                    <span className="text-[10px] text-slate-500">{t.markPrice}</span>
                    <span className="font-mono text-xs text-slate-200">{formatPrice(data.coinMargined?.markPrice)}</span>
                </div>
                 <div className="flex justify-between items-baseline">
                    <span className="text-[10px] text-slate-500">{t.spread}</span>
                    <span className={`font-mono text-xs font-bold ${getSpreadColor(coinSpread)}`}>
                        {formatPercent(coinSpread)}
                    </span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="text-[10px] text-slate-500">{t.funding}</span>
                    <span className={`font-mono text-[10px] ${getFundingColor(data.coinMargined?.fundingRate)}`}>
                        {formatPercent(data.coinMargined?.fundingRate)}
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* Borrow Info Section */}
      <div className="bg-slate-900/40 rounded-lg p-2.5 border border-slate-700/30">
          <div className="flex items-center gap-1.5 mb-2">
              <BanknotesIcon className="w-3 h-3 text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-200">{t.borrowInfo}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
              <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-500">{t.dailyRate}</span>
                  <span className="font-mono text-slate-300 text-xs">
                    {data.borrow ? `${(data.borrow.dailyInterestRate * 100).toFixed(4)}%` : '--'}
                  </span>
              </div>
              <div className="flex flex-col gap-0.5 items-end">
                  <span className="text-[10px] text-slate-500">{t.yearlyRate}</span>
                  <span className="font-mono text-slate-300 text-xs">
                    {data.borrow ? `${(data.borrow.yearlyInterestRate * 100).toFixed(2)}%` : '--'}
                  </span>
              </div>
              <div className="flex flex-col gap-0.5 items-end">
                  <span className="text-[10px] text-slate-500">{t.borrowable}</span>
                  <span className={`font-bold text-xs ${data.borrow?.isBorrowable ? 'text-emerald-400' : 'text-red-400'}`}>
                      {data.borrow ? (data.borrow.isBorrowable ? t.yes : t.no) : '--'}
                  </span>
              </div>
          </div>
      </div>

      {/* AI Analysis Section */}
      <div className="mt-1 min-h-[110px]">
        {!analysis ? (
             <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !data.spot}
                className="w-full h-full min-h-[100px] flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 hover:border-indigo-500 active:bg-indigo-500/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {isAnalyzing ? (
                    <ArrowPathIcon className="w-5 h-5 text-indigo-400 animate-spin" />
                ) : (
                    <>
                        <SparklesIcon className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                        <span className="text-xs text-slate-400 group-hover:text-indigo-300 font-medium">
                          {data.spot ? t.analyzeBtn : t.waitingData}
                        </span>
                    </>
                )}
             </button>
        ) : (
            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-lg p-3 border border-indigo-500/30">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="text-xs font-bold text-indigo-200 flex items-center gap-1">
                        <SparklesIcon className="w-3 h-3 text-indigo-400" />
                        {t.aiInsight}
                    </h4>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                        analysis.riskLevel === 'Low' ? 'border-green-500/30 text-green-300 bg-green-500/10' :
                        analysis.riskLevel === 'Medium' ? 'border-yellow-500/30 text-yellow-300 bg-yellow-500/10' :
                        'border-red-500/30 text-red-300 bg-red-500/10'
                    }`}>
                        {getRiskLabel(analysis.riskLevel)}
                    </span>
                </div>
                <p className="text-xs text-slate-300 mb-2 leading-relaxed line-clamp-4">
                    {analysis.recommendation}
                </p>
                <div className="flex justify-between items-center text-xs border-t border-indigo-500/20 pt-2">
                    <span className="text-[10px] text-slate-400">{t.estYield}</span>
                    <span className="font-mono text-emerald-300 font-bold text-xs">{analysis.estimatedYield}</span>
                </div>
                <button 
                    onClick={() => setAnalysis(null)}
                    className="mt-2 w-full text-[10px] text-slate-500 active:text-slate-300 underline py-1"
                >
                    {t.refreshAnalysis}
                </button>
            </div>
        )}
      </div>

    </div>
  );
};

export default ArbCard;
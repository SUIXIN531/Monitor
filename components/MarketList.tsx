import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { MagnifyingGlassIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, BellAlertIcon } from '@heroicons/react/24/solid';

interface TickerData {
  s: string; // symbol
  c: string; // close price
  o: string; // open price
}

interface PricePoint {
  price: number;
  time: number;
}

const STABLE_COINS = ['USDC', 'FDUSD', 'DAI', 'USDe', 'TUSD', 'EUR'];
const CRYPTO_LIST = [
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'SHIB', 'DOT', 
  'TRX', 'LINK', 'MATIC', 'LTC', 'BCH', 'UNI', 'NEAR', 'APT', 'FIL', 'ATOM',
  'SUI', 'PEPE', 'WLD', 'ORDI'
];

const ALL_COINS = [...STABLE_COINS, ...CRYPTO_LIST];

const MarketList: React.FC = () => {
  const { t } = useLanguage();
  const { volatilityThreshold, volatilityWindow, notificationsEnabled } = useSettings();
  const [tickers, setTickers] = useState<Record<string, TickerData>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [activeAlerts, setActiveAlerts] = useState<Record<string, boolean>>({});

  // Refs for tracking history without re-rendering
  const priceHistoryRef = useRef<Record<string, PricePoint[]>>({});
  const lastAlertTimeRef = useRef<Record<string, number>>({});
  
  // Refs for settings to allow access inside WebSocket callback without reconnecting
  const settingsRef = useRef({
    volatilityThreshold,
    volatilityWindow,
    notificationsEnabled,
    t // Include translation function if needed, though usually stable
  });

  // Sync refs with state/props
  useEffect(() => {
    settingsRef.current = {
        volatilityThreshold,
        volatilityWindow,
        notificationsEnabled,
        t
    };
  }, [volatilityThreshold, volatilityWindow, notificationsEnabled, t]);

  useEffect(() => {
    // Construct stream names for miniTicker
    const streams = ALL_COINS.map(coin => `${coin.toLowerCase()}usdt@miniTicker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      setStatus('connecting');
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // message format: { stream: 'btcusdt@miniTicker', data: { ...tickerData } }
          if (message.data) {
            const data = message.data;
            const symbol = data.s;
            const currentPrice = parseFloat(data.c);
            const now = Date.now();

            setTickers(prev => ({
              ...prev,
              [symbol]: data
            }));

            // Access latest settings from ref
            const { volatilityThreshold, volatilityWindow, notificationsEnabled, t } = settingsRef.current;

            // Volatility Logic
            if (notificationsEnabled && !isNaN(currentPrice)) {
                // Initialize array if needed
                if (!priceHistoryRef.current[symbol]) {
                    priceHistoryRef.current[symbol] = [];
                }

                const history = priceHistoryRef.current[symbol];
                
                // Add current price
                history.push({ price: currentPrice, time: now });

                // Prune old history (keep data for window + 1 minute buffer)
                const windowMs = volatilityWindow * 60 * 1000;
                const cutoff = now - windowMs - 60000; 
                
                // Simple performance optimization: only shift if first element is too old
                if (history[0] && history[0].time < cutoff) {
                     // Keep array clean
                     while(history.length > 0 && history[0].time < cutoff) {
                         history.shift();
                     }
                }

                // Check for volatility trigger
                // Find the price point closest to (now - windowMs)
                const targetTime = now - windowMs;
                // Since array is sorted by time, we can just find the first element >= targetTime
                const comparePoint = history.find(p => p.time >= targetTime);

                if (comparePoint) {
                    const priceChange = Math.abs((currentPrice - comparePoint.price) / comparePoint.price) * 100;
                    
                    if (priceChange >= volatilityThreshold) {
                        const lastAlert = lastAlertTimeRef.current[symbol] || 0;
                        // Rate limit: Don't alert again for this symbol within the window period
                        if (now - lastAlert > windowMs) {
                            lastAlertTimeRef.current[symbol] = now;
                            
                            // Trigger Alert
                            const rawSymbol = symbol.replace('USDT', '');
                            const msg = t.volAlertBody
                                .replace('{symbol}', rawSymbol)
                                .replace('{percent}', priceChange.toFixed(2))
                                .replace('{minutes}', volatilityWindow.toString());

                            if (document.visibilityState === 'hidden' || true) {
                                new Notification(`${t.appTitle}: ${rawSymbol} Volatility!`, {
                                    body: msg,
                                    icon: 'https://cdn-icons-png.flaticon.com/512/1213/1213795.png',
                                    tag: `vol-alert-${symbol}`
                                });
                            }

                            // Update visual state for a moment
                            setActiveAlerts(prev => ({ ...prev, [rawSymbol]: true }));
                            setTimeout(() => {
                                setActiveAlerts(prev => {
                                    const next = { ...prev };
                                    delete next[rawSymbol];
                                    return next;
                                });
                            }, 5000);
                        }
                    }
                }
            }
          }
        } catch (e) {
          console.error("Parse error", e);
        }
      };

      ws.onerror = (e) => {
        console.error("WebSocket error", e);
        setStatus('error');
      };

      ws.onclose = () => {
        if (ws) {
            setStatus('connecting');
            // Simple reconnect logic
            reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      const socket = ws;
      ws = null; // Prevent reconnect loop
      clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, []); // Empty dependency array ensures connection only happens once on mount

  const formatPrice = (priceStr: string, isStable: boolean) => {
    const price = parseFloat(priceStr);
    if (isNaN(price)) return '---';
    
    // Stablecoins need 4 decimals to see de-pegging details (e.g. 0.9998)
    if (isStable) return price.toFixed(4);

    // Dynamic precision for others
    if (price < 1) return price.toFixed(6);
    if (price < 10) return price.toFixed(4);
    if (price < 1000) return price.toFixed(2);
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getChangePercent = (current: string, open: string) => {
    const c = parseFloat(current);
    const o = parseFloat(open);
    if (isNaN(c) || isNaN(o) || o === 0) return 0;
    return ((c - o) / o) * 100;
  };

  const filteredCoins = useMemo(() => {
    return ALL_COINS.filter(coin => 
      coin.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <div className="pb-24">
      {/* Search Bar */}
      <div className="sticky top-14 md:top-16 z-30 bg-[#0f172a]/95 backdrop-blur py-3 px-4 border-b border-slate-800">
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-slate-500" />
            </div>
            <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-xl leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-indigo-500 transition-colors sm:text-sm"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* Connection Status (if not connected) */}
      {status !== 'connected' && (
        <div className="px-4 py-2">
            <div className={`text-xs text-center py-1 rounded ${status === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                {status === 'error' ? 'Connection Error' : 'Connecting to Binance...'}
            </div>
        </div>
      )}

      {/* Coin List */}
      <div className="px-3 sm:px-6 lg:px-8 py-2">
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-800/80 border-b border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-4">{t.colCoin}</div>
                <div className="col-span-4 text-right">{t.colPrice}</div>
                <div className="col-span-4 text-right">{t.colChange}</div>
            </div>
            
            <div className="divide-y divide-slate-700/50">
                {filteredCoins.map(coin => {
                    const symbol = `${coin}USDT`;
                    const data = tickers[symbol];
                    const price = data ? data.c : undefined;
                    const change = data ? getChangePercent(data.c, data.o) : 0;
                    const isPositive = change >= 0;
                    const isStable = STABLE_COINS.includes(coin);
                    const isAlerting = activeAlerts[coin];

                    return (
                        <div key={coin} className={`grid grid-cols-12 gap-2 px-4 py-4 items-center transition-colors ${
                            isAlerting ? 'bg-orange-500/20' : 'hover:bg-slate-700/30'
                        }`}>
                            <div className="col-span-4 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border shrink-0 ${
                                    isStable 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                }`}>
                                    {coin[0]}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold text-slate-200">{coin}</span>
                                        {isAlerting && <BellAlertIcon className="w-3 h-3 text-orange-400 animate-bounce" />}
                                    </div>
                                    <span className="text-[10px] text-slate-500">USDT</span>
                                </div>
                            </div>
                            <div className="col-span-4 text-right">
                                <div className={`font-mono font-medium ${!price ? 'text-slate-600' : 'text-slate-200'}`}>
                                    {price ? `$${formatPrice(price, isStable)}` : '---'}
                                </div>
                            </div>
                            <div className="col-span-4 flex justify-end">
                                {data ? (
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold w-20 justify-center ${
                                        isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                    }`}>
                                        {isPositive ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                                        {Math.abs(change).toFixed(2)}%
                                    </div>
                                ) : (
                                    <div className="w-16 h-6 bg-slate-700/50 rounded animate-pulse"></div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        
        {filteredCoins.length === 0 && (
            <div className="text-center py-12 text-slate-500">
                No coins found matching "{searchTerm}"
            </div>
        )}
      </div>
    </div>
  );
};

export default MarketList;
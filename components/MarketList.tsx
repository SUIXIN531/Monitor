import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
  MagnifyingGlassIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon, 
  BellAlertIcon,
  PencilSquareIcon,
  CheckIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PlusIcon
} from '@heroicons/react/24/solid';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

interface TickerData {
  s: string; // symbol
  c: string; // close price
  o: string; // open price
}

interface PricePoint {
  price: number;
  time: number;
}

// Updated Default Coins list to include requested stablecoins at the top
const DEFAULT_COINS = [
  'USD1', 'U', 'USDC', 'FDUSD', 'XUSD', 'USDe', 'TUSD', 'RLUSD', 'PYUSD', 'DAI', 'BUSD',
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 
  'SHIB', 'DOT', 'TRX', 'LINK', 'MATIC', 'LTC', 'BCH', 'UNI', 'NEAR', 'APT', 
  'FIL', 'ATOM', 'SUI', 'PEPE', 'WLD', 'ORDI'
];

// Define which coins are stablecoins for formatting (4 decimal places)
const STABLE_COINS = [
  'USD1', 'U', 'USDC', 'FDUSD', 'XUSD', 'USDe', 'TUSD', 'RLUSD', 'PYUSD', 'DAI', 'BUSD', 'EUR'
];

const MarketList: React.FC = () => {
  const { t } = useLanguage();
  const { volatilityThreshold, volatilityWindow, notificationsEnabled } = useSettings();
  
  // State for user-managed coin list
  const [coins, setCoins] = useState<string[]>(() => {
    const saved = localStorage.getItem('market_coins');
    // If saved exists, use it. If the default list has grown significantly (e.g. new update), 
    // you might want to merge, but for now we prioritize user customization if it exists.
    // However, since we just added critical coins, if the user hasn't customized much, 
    // they might miss them. For this specific update request, we will rely on defaults 
    // if the saved list doesn't include the new priority coins? 
    // No, standard behavior is to respect local storage. 
    // Users can add them manually or clear cache to see new defaults.
    return saved ? JSON.parse(saved) : DEFAULT_COINS;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [newCoinInput, setNewCoinInput] = useState('');
  
  const [tickers, setTickers] = useState<Record<string, TickerData>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [activeAlerts, setActiveAlerts] = useState<Record<string, boolean>>({});

  // Refs for tracking history without re-rendering
  const priceHistoryRef = useRef<Record<string, PricePoint[]>>({});
  const lastAlertTimeRef = useRef<Record<string, number>>({});
  
  const settingsRef = useRef({
    volatilityThreshold,
    volatilityWindow,
    notificationsEnabled,
    t
  });

  useEffect(() => {
    settingsRef.current = {
        volatilityThreshold,
        volatilityWindow,
        notificationsEnabled,
        t
    };
  }, [volatilityThreshold, volatilityWindow, notificationsEnabled, t]);

  // Persist coins to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('market_coins', JSON.stringify(coins));
  }, [coins]);

  // Memoize the sorted list of coins for WS dependency to avoid reconnecting on reorder
  const wsCoinsString = useMemo(() => {
    return [...coins].sort().join(',');
  }, [coins]);

  useEffect(() => {
    if (coins.length === 0) return;

    // Construct stream names for miniTicker
    const streams = coins.map(coin => `${coin.toLowerCase()}usdt@miniTicker`).join('/');
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
          if (message.data) {
            const data = message.data;
            const symbol = data.s;
            const currentPrice = parseFloat(data.c);
            const now = Date.now();

            setTickers(prev => ({
              ...prev,
              [symbol]: data
            }));

            const { volatilityThreshold, volatilityWindow, notificationsEnabled, t } = settingsRef.current;

            if (notificationsEnabled && !isNaN(currentPrice)) {
                if (!priceHistoryRef.current[symbol]) {
                    priceHistoryRef.current[symbol] = [];
                }

                const history = priceHistoryRef.current[symbol];
                history.push({ price: currentPrice, time: now });

                const windowMs = volatilityWindow * 60 * 1000;
                const cutoff = now - windowMs - 60000; 
                
                if (history[0] && history[0].time < cutoff) {
                     while(history.length > 0 && history[0].time < cutoff) {
                         history.shift();
                     }
                }

                const targetTime = now - windowMs;
                const comparePoint = history.find(p => p.time >= targetTime);

                if (comparePoint) {
                    const priceChange = Math.abs((currentPrice - comparePoint.price) / comparePoint.price) * 100;
                    
                    if (priceChange >= volatilityThreshold) {
                        const lastAlert = lastAlertTimeRef.current[symbol] || 0;
                        if (now - lastAlert > windowMs) {
                            lastAlertTimeRef.current[symbol] = now;
                            
                            const rawSymbol = symbol.replace('USDT', '');
                            const msg = t.volAlertBody
                                .replace('{symbol}', rawSymbol)
                                .replace('{percent}', priceChange.toFixed(2))
                                .replace('{minutes}', volatilityWindow.toString());

                            if (Capacitor.isNativePlatform()) {
                                LocalNotifications.schedule({
                                    notifications: [{
                                        title: `${t.appTitle}: ${rawSymbol} Volatility!`,
                                        body: msg,
                                        id: Math.floor(Math.random() * 1000000),
                                        schedule: { at: new Date(Date.now() + 100) }
                                    }]
                                }).catch(err => console.error("Notif error", err));
                            } else if (document.visibilityState === 'hidden' || true) {
                                new Notification(`${t.appTitle}: ${rawSymbol} Volatility!`, {
                                    body: msg,
                                    icon: 'https://cdn-icons-png.flaticon.com/512/1213/1213795.png',
                                    tag: `vol-alert-${symbol}`
                                });
                            }

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
            reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      const socket = ws;
      ws = null; 
      clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, [wsCoinsString]); // Only reconnect if the SET of coins changes, not the order.

  const formatPrice = (priceStr: string, isStable: boolean) => {
    const price = parseFloat(priceStr);
    if (isNaN(price)) return '---';
    if (isStable) return price.toFixed(4);
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

  // Editing Functions
  const moveCoin = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === coins.length - 1) return;
    
    const newCoins = [...coins];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newCoins[index], newCoins[targetIndex]] = [newCoins[targetIndex], newCoins[index]];
    setCoins(newCoins);
  };

  const removeCoin = (coinToRemove: string) => {
    setCoins(coins.filter(c => c !== coinToRemove));
  };

  const addCoin = () => {
    const formatted = newCoinInput.trim().toUpperCase();
    if (!formatted) return;
    if (coins.includes(formatted)) {
      alert('Coin already in list');
      return;
    }
    setCoins([formatted, ...coins]); // Add to top
    setNewCoinInput('');
  };

  const filteredCoins = useMemo(() => {
    // In edit mode, show all so user can reorder them
    if (isEditing) return coins;
    // In view mode, filter by search
    return coins.filter(coin => 
      coin.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [coins, searchTerm, isEditing]);

  return (
    <div className="pb-24">
      {/* Header / Controls */}
      <div className="sticky top-14 md:top-16 z-30 bg-[#0f172a]/95 backdrop-blur py-3 px-4 border-b border-slate-800 flex flex-col gap-3">
        <div className="flex items-center gap-2">
            {!isEditing ? (
                <div className="relative flex-1">
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
            ) : (
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        className="block w-full px-3 py-2 border border-slate-700 rounded-xl leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-emerald-500 transition-colors sm:text-sm"
                        placeholder="Add Coin (e.g. PEOPLE)"
                        value={newCoinInput}
                        onChange={(e) => setNewCoinInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCoin()}
                    />
                    <button 
                        onClick={addCoin}
                        className="p-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-xl hover:bg-emerald-600/30"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
            
            <button
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-xl border transition-colors ${
                    isEditing 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
            >
                {isEditing ? <CheckIcon className="w-5 h-5" /> : <PencilSquareIcon className="w-5 h-5" />}
            </button>
        </div>
        
        {isEditing && (
            <div className="text-[10px] text-slate-500 px-1 text-center">
                Use arrows to reorder. Changes saved automatically.
            </div>
        )}
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
            {!isEditing && (
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-800/80 border-b border-slate-700 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="col-span-4">{t.colCoin}</div>
                    <div className="col-span-4 text-right">{t.colPrice}</div>
                    <div className="col-span-4 text-right">{t.colChange}</div>
                </div>
            )}
            
            <div className="divide-y divide-slate-700/50">
                {filteredCoins.map((coin, index) => {
                    const symbol = `${coin}USDT`;
                    const data = tickers[symbol];
                    const price = data ? data.c : undefined;
                    const change = data ? getChangePercent(data.c, data.o) : 0;
                    const isPositive = change >= 0;
                    const isStable = STABLE_COINS.includes(coin);
                    const isAlerting = activeAlerts[coin];

                    if (isEditing) {
                        return (
                            <div key={coin} className="flex items-center justify-between px-4 py-3 bg-slate-800/30">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-sm text-slate-400 w-6 text-center">{index + 1}</span>
                                    <span className="font-bold text-slate-200">{coin}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => moveCoin(index, 'up')}
                                        disabled={index === 0}
                                        className="p-1.5 rounded-lg bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronUpIcon className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => moveCoin(index, 'down')}
                                        disabled={index === coins.length - 1}
                                        className="p-1.5 rounded-lg bg-slate-700 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronDownIcon className="w-4 h-4" />
                                    </button>
                                    <div className="w-2"></div>
                                    <button 
                                        onClick={() => removeCoin(coin)}
                                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    }

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
        
        {!isEditing && filteredCoins.length === 0 && (
            <div className="text-center py-12 text-slate-500">
                No coins found matching "{searchTerm}"
            </div>
        )}
      </div>
    </div>
  );
};

export default MarketList;
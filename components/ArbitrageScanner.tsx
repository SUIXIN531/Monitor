import React, { useState } from 'react';
import ArbCard from './ArbCard';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '../contexts/LanguageContext';

const AVAILABLE_COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'DOGE', 'ADA', 'AVAX', 'TRX', 'DOT'];

const ArbitrageScanner: React.FC = () => {
  const [selectedCoins, setSelectedCoins] = useState<string[]>(['BTC', 'ETH', 'SOL']);
  const { t } = useLanguage();

  const toggleCoin = (coin: string) => {
    if (selectedCoins.includes(coin)) {
      setSelectedCoins(selectedCoins.filter(c => c !== coin));
    } else {
      setSelectedCoins([...selectedCoins, coin]);
    }
  };

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 md:py-8 pb-24">
        {/* Intro - Compact on mobile */}
        <div className="mb-4 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{t.heroTitle}</h2>
            <p className="text-sm md:text-base text-slate-400 max-w-3xl leading-relaxed">
                {t.heroDesc}
            </p>
        </div>

        {/* Coin Selector - Horizontal Scroll for Mobile */}
        <div className="mb-6 flex flex-col gap-2">
             <span className="text-xs font-medium text-slate-500 flex items-center uppercase tracking-wider pl-1">
                <PlusIcon className="w-3.5 h-3.5 mr-1"/> {t.monitorAssets}
            </span>
            <div className="flex overflow-x-auto pb-2 no-scrollbar gap-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
                {AVAILABLE_COINS.map(coin => (
                    <button
                        key={coin}
                        onClick={() => toggleCoin(coin)}
                        className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm active:scale-95 ${
                            selectedCoins.includes(coin)
                            ? 'bg-indigo-500 text-white border-indigo-400 shadow-indigo-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                    >
                        {coin}
                    </button>
                ))}
            </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {selectedCoins.map(coin => (
                <ArbCard key={coin} symbol={coin} />
            ))}
            {selectedCoins.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                    Select a coin above to start monitoring
                </div>
            )}
        </div>
    </div>
  );
};

export default ArbitrageScanner;
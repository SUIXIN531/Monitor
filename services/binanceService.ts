import { CoinData, ConnectionStatus, BorrowData } from '../types';

type DataCallback = (data: Partial<CoinData>) => void;
type StatusCallback = (status: ConnectionStatus, message?: string) => void;

export const fetchBorrowData = async (symbol: string): Promise<BorrowData | null> => {
  try {
    // Use allorigins proxy to bypass CORS for client-side demo
    const targetUrl = `https://www.binance.com/bapi/margin/v1/public/isolated-margin/pair/vip-spec?symbol=${symbol}USDT`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    
    const res = await fetch(proxyUrl);
    const json = await res.json();
    
    if (json.success && json.data && json.data.length > 0) {
      // Use the first entry (typically VIP 0 / standard user)
      const spec = json.data[0];
      
      const dailyRate = parseFloat(spec.dailyInterestRate);
      const limit = parseFloat(spec.borrowLimit);
      
      return {
        dailyInterestRate: dailyRate,
        yearlyInterestRate: dailyRate * 365,
        borrowLimit: limit,
        isBorrowable: limit > 0
      };
    }
    return null;
  } catch (e) {
    console.warn(`Failed to fetch borrow data for ${symbol}`, e);
    return null;
  }
};

class BinanceStreamManager {
  private sockets: WebSocket[] = [];
  private callback: DataCallback | null = null;
  private statusCallback: StatusCallback | null = null;
  private coinSymbol: string = '';

  constructor(coinSymbol: string, callback: DataCallback, statusCallback?: StatusCallback) {
    this.coinSymbol = coinSymbol.toLowerCase();
    this.callback = callback;
    this.statusCallback = statusCallback;
    this.connect();
  }

  public reconnect() {
    this.disconnect();
    // Small delay to ensure sockets are fully closed before reconnecting
    setTimeout(() => {
        this.connect();
    }, 200);
  }

  private connect() {
    this.statusCallback?.(ConnectionStatus.CONNECTING);
    this.sockets = [];

    const streams = [
        { 
            url: `wss://stream.binance.com:9443/ws/${this.coinSymbol}usdt@ticker`, 
            type: 'Spot',
            handler: (msg: any) => ({
                spot: { price: parseFloat(msg.c), lastUpdated: Date.now() }
            })
        },
        { 
            url: `wss://fstream.binance.com/ws/${this.coinSymbol}usdt@markPrice`, 
            type: 'USDT-M',
            handler: (msg: any) => ({
                uMargined: {
                    price: parseFloat(msg.p),
                    markPrice: parseFloat(msg.p),
                    fundingRate: parseFloat(msg.r),
                    nextFundingTime: msg.T,
                    lastUpdated: Date.now()
                }
            })
        },
        { 
            url: `wss://dstream.binance.com/ws/${this.coinSymbol}usd_perp@markPrice`, 
            type: 'COIN-M',
            handler: (msg: any) => ({
                coinMargined: {
                    price: parseFloat(msg.p),
                    markPrice: parseFloat(msg.p),
                    fundingRate: parseFloat(msg.r),
                    nextFundingTime: msg.T,
                    lastUpdated: Date.now()
                }
            })
        }
    ];

    let connectedCount = 0;

    streams.forEach(stream => {
        try {
            const ws = new WebSocket(stream.url);
            
            ws.onopen = () => {
                connectedCount++;
                // If at least one connects, we are "Connected"
                if (connectedCount === 1) {
                    this.statusCallback?.(ConnectionStatus.CONNECTED);
                }
            };

            ws.onerror = (e) => {
                // If the internet is offline, the browser will trigger this.
                // We report generic error for this specific stream.
                console.error(`WebSocket error for ${stream.type}:`, e);
                this.statusCallback?.(ConnectionStatus.ERROR, `${stream.type} Stream Error`);
            };

            ws.onmessage = (event) => {
                if (this.callback) {
                    try {
                        const msg = JSON.parse(event.data);
                        this.callback(stream.handler(msg));
                    } catch (err) {
                        console.error("Error parsing message", err);
                    }
                }
            };

            this.sockets.push(ws);
        } catch (e) {
            console.error(`Failed to initialize ${stream.type} socket`, e);
            this.statusCallback?.(ConnectionStatus.ERROR, `Failed to init ${stream.type}`);
        }
    });
  }

  public disconnect() {
    this.statusCallback?.(ConnectionStatus.DISCONNECTED);
    this.sockets.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    });
    this.sockets = [];
  }
}

export default BinanceStreamManager;
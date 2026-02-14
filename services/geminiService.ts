import { GoogleGenAI, Type } from "@google/genai";
import { CoinData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeArbitrage = async (data: CoinData, lang: 'en' | 'zh' = 'en'): Promise<any> => {
  const spotPrice = data.spot?.price || 0;
  const uFuturePrice = data.uMargined?.markPrice || 0;
  const uFunding = data.uMargined?.fundingRate || 0;
  const coinFuturePrice = data.coinMargined?.markPrice || 0;
  const coinFunding = data.coinMargined?.fundingRate || 0;
  
  const borrowRateDaily = data.borrow?.dailyInterestRate || 0;
  const borrowRateYearly = data.borrow?.yearlyInterestRate || 0;
  const isBorrowable = data.borrow?.isBorrowable || false;

  const langInstruction = lang === 'zh' 
    ? "Provide the response in Simplified Chinese. For the 'riskLevel' field, keep the value strictly as 'Low', 'Medium', or 'High' (in English) so the code logic works, but you can explain risks in Chinese in the recommendation." 
    : "Provide the response in English.";

  const prompt = `
    Analyze the arbitrage opportunity for ${data.symbol} on Binance.
    
    Market Data:
    - Spot Price: ${spotPrice}
    - USDT-M Futures Price: ${uFuturePrice} (Funding Rate: ${(uFunding * 100).toFixed(4)}%)
    - Coin-M Futures Price: ${coinFuturePrice} (Funding Rate: ${(coinFunding * 100).toFixed(4)}%)
    
    Borrow Data (for Reverse Arbitrage):
    - Borrowable: ${isBorrowable ? 'Yes' : 'No'}
    - Daily Borrow Interest: ${(borrowRateDaily * 100).toFixed(4)}%
    - Annualized Borrow Interest: ${(borrowRateYearly * 100).toFixed(2)}%
    
    Task:
    1. Check for **Cash-and-Carry** (Long Spot, Short Future):
       - Profit Source: Positive Funding Rate + (Future Price > Spot Price).
       - Cost: Trading fees (ignore for rough est).
       
    2. Check for **Reverse Cash-and-Carry** (Short Spot, Long Future):
       - Profit Source: Negative Funding Rate (Shorts pay Longs) + (Spot Price > Future Price).
       - Cost: **Borrow Interest Rate**.
       - CRITICAL: If calculating yield for Reverse Arb, you MUST subtract the Annualized Borrow Interest (${(borrowRateYearly * 100).toFixed(2)}%) from the gross yield.
       - If not borrowable, this strategy is impossible.

    Analyze the best strategy.
    
    ${langInstruction}
    
    Output JSON format with fields:
    - recommendation: (String, short summary)
    - strategy: (String, detailed steps, mention if Reverse or Regular)
    - riskLevel: (String, EXACTLY 'Low', 'Medium', or 'High')
    - estimatedYield: (String, e.g. "15% APR" or "Net -2% (Loss)")
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendation: { type: Type.STRING },
            strategy: { type: Type.STRING },
            riskLevel: { type: Type.STRING },
            estimatedYield: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Error analyzing arbitrage:", error);

    // Improved error handling for location/region issues (Error 412)
    const errorMessage = error?.message || JSON.stringify(error);
    const isLocationError = errorMessage.includes("User location is not supported") || 
                            errorMessage.includes("412") || 
                            errorMessage.includes("FAILED_PRECONDITION");

    if (isLocationError) {
      return {
        recommendation: lang === 'zh' 
          ? "当前 IP 地区不支持 Gemini API，请开启 VPN (如美国节点) 后重试。" 
          : "Gemini API is not available in your region. Please use a VPN (e.g., US) and try again.",
        strategy: "Region restricted.",
        riskLevel: "High", // Displays as red/alert
        estimatedYield: "Error"
      };
    }

    return {
      recommendation: lang === 'zh' ? "分析失败" : "Analysis failed",
      strategy: lang === 'zh' ? "无法连接到 AI 服务。" : "Could not generate strategy due to API error.",
      riskLevel: "Unknown",
      estimatedYield: "N/A"
    };
  }
};
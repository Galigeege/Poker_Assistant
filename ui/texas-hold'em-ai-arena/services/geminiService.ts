import { GoogleGenAI } from "@google/genai";
import { Card, Player } from "../types";

// In a real app, this would be initialized safely. 
// For the prototype, we assume the key is available or we mock the response if missing.
const apiKey = process.env.API_KEY || 'demo-key'; 
const ai = new GoogleGenAI({ apiKey });

export const getGeminiAdvice = async (
  heroCards: Card[],
  communityCards: Card[],
  potSize: number,
  players: Player[],
  history: string[]
): Promise<{ suggestion: string; reasoning: string; confidence: number }> => {
  
  // If no key is actually present in the demo environment, return mock data
  if (apiKey === 'demo-key') {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          suggestion: "CHECK",
          reasoning: "The board is disconnected. Your hand has showdown value but is vulnerable to aggression. Checking keeps the pot small.",
          confidence: 75
        });
      }, 800);
    });
  }

  const prompt = `
    You are a world-class Poker GTO solver.
    Context: Texas Hold'em.
    Hero Hand: ${JSON.stringify(heroCards)}
    Board: ${JSON.stringify(communityCards)}
    Pot: ${potSize}
    Players: ${JSON.stringify(players.map(p => ({ name: p.name, stack: p.chips, action: p.action })))}
    Action History: ${history.join(' -> ')}

    Provide a short strategic recommendation for the Hero.
    Return JSON format: { "suggestion": "FOLD" | "CHECK" | "CALL" | "RAISE", "reasoning": "string", "confidence": number (0-100) }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API Error", error);
    return {
      suggestion: "Thinking...",
      reasoning: "AI is analyzing the complex board texture...",
      confidence: 50
    };
  }
};

export const getHandAnalysis = async (handId: string, summary: string) => {
   // Simulating a post-game analysis
   return `In this hand, the pre-flop raise was standard. However, on the turn, the donk bet into two opponents was risky given the wet board texture. Gemini suggests a check-raise line here 60% of the time to balance your range.`;
};

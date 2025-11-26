import { GoogleGenAI, Type } from "@google/genai";
import { ZoyaCard } from "../types";
import { v4 as uuidv4 } from 'uuid';

// Initialize Gemini
// 注意：在 Vite 中不能用 process.env，需要用 import.meta.env，并且要以 VITE_ 前缀暴露
const GEMINI_API_KEY =
  // 优先使用 Vite 推荐的方式
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env &&
    ((import.meta as any).env.VITE_GEMINI_API_KEY ||
      (import.meta as any).env.VITE_API_KEY)) ||
  // 兜底：如果运行环境（比如 AI Studio）自己注入了 process.env，则尽量兼容
  // @ts-ignore
  (typeof process !== "undefined" &&
    (process.env?.GEMINI_API_KEY || process.env?.API_KEY)) ||
  "";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const MODEL_NAME = "gemini-2.0-flash";

// 1. 批量生成卡片 (Generate Deck)
export const generateDeckContent = async (
  topic: string, 
  count: number = 10, 
  language: string = "English"
): Promise<ZoyaCard[]> => {
  const prompt = `Create a list of ${count} flashcards for studying "${topic}". 
  The 'front' should be the Term Name (术语名称).
  
  For the content, provide three distinct sections:
  1. 'layman' (大白话): A simple explanation in Chinese, including key English terms in parentheses.
  2. 'example' (现实例子): A real-world scenario in Chinese, including key English terms in parentheses.
  3. 'definition' (专业定义): A strict, professional theoretical definition in pure English.
  
  Ensure the content is high quality and accurate.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              layman: { type: Type.STRING },
              example: { type: Type.STRING },
              definition: { type: Type.STRING },
            },
            required: ["front", "layman", "example", "definition"],
          },
        },
      },
    });

    const rawData = JSON.parse(response.text || "[]");
    
    return rawData.map((item: any) => ({
      id: uuidv4(),
      term: item.front,
      roots: "N/A",
      synonyms: [],
      layman: item.layman,
      example: item.example,
      sentences: [],
      definition: item.definition
    }));

  } catch (error) {
    console.error("Gemini generation error:", error);
    throw error;
  }
};

// 2. 单张卡片详情生成 (Auto-Fill AI)
export const generateCardDetails = async (term: string): Promise<Partial<ZoyaCard>> => {
  const prompt = `Generate detailed educational flashcard content for the term: "${term}".
  
  Requirements:
  1. ChineseTranslation: Provide a concise Chinese translation of the term (e.g., "机会成本" for "Opportunity Cost").
  2. Roots: Etymology or word origin (e.g., Latin/Greek roots).
  3. Synonyms: 2-3 related terms.
  4. Layman: A clear, witty explanation in Chinese, embedding key English keywords in parentheses ().
  5. Example: A vivid, real-world scenario in Chinese, embedding key English keywords in parentheses ().
  6. Definition: A professional, academic definition in English.
  7. Sentences: 2 English example sentences using the term.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chineseTranslation: { type: Type.STRING },
            roots: { type: Type.STRING },
            synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
            layman: { type: Type.STRING },
            example: { type: Type.STRING },
            definition: { type: Type.STRING },
            sentences: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["chineseTranslation", "roots", "synonyms", "layman", "example", "definition", "sentences"],
        },
      },
    });

    if (!response.text) throw new Error("No response from AI");
    
    return JSON.parse(response.text);

  } catch (error) {
    console.error("Gemini single card generation error:", error);
    throw error;
  }
};

export const enhanceCardExplanation = async (term: string, context: string): Promise<string> => {
   try {
     const response = await ai.models.generateContent({
       model: MODEL_NAME,
       contents: `Provide a clear, simple, one-sentence explanation or mnemonic for the term "${term}" in the context of "${context}".`,
     });
     return response.text || "No explanation available.";
   } catch (error) {
     return "Could not generate explanation.";
   }
};
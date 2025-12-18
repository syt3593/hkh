
import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "../types";

export async function analyzeFoodImage(
  base64Image: string, 
  additionalContext: string,
  modelName: string = "gemini-3-pro-preview"
): Promise<{
  items: Omit<FoodItem, 'id' | 'consumedPercentage'>[];
  description: string;
  insight: string;
}> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this food image with high precision.
    1. Identify ALL distinct food items.
    2. For EACH item, estimate weight and nutrients.
    3. provide a summary 'description' of the meal.
    4. Provide a 'insight': A one-sentence health tip based on this meal's nutritional profile (e.g., "High in protein, great for muscle recovery" or "Consider adding some greens to balance the carbs").
    
    ${additionalContext ? `USER CONTEXT: "${additionalContext}". Use this to adjust for hidden ingredients or cooking methods.` : ''}

    Return the data in the specified JSON format.
  `;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image.split(',')[1] || base64Image
    }
  };
  
  const textPart = { text: prompt };

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                estimatedWeightGrams: { type: Type.NUMBER },
                nutrients: {
                  type: Type.OBJECT,
                  properties: {
                    calories: { type: Type.NUMBER },
                    protein: { type: Type.NUMBER },
                    carbs: { type: Type.NUMBER },
                    fat: { type: Type.NUMBER },
                    fiber: { type: Type.NUMBER },
                    sugar: { type: Type.NUMBER }
                  },
                  required: ["calories", "protein", "carbs", "fat", "fiber", "sugar"]
                }
              },
              required: ["name", "estimatedWeightGrams", "nutrients"]
            }
          },
          description: { type: Type.STRING },
          insight: { type: Type.STRING }
        },
        required: ["items", "description", "insight"]
      }
    }
  });

  const jsonStr = response.text || "{}";
  return JSON.parse(jsonStr);
}

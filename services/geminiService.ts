import { GoogleGenAI, Type } from "@google/genai";

// Fix: Use process.env.API_KEY directly as per guidelines and avoid import.meta.env TS error
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper: Exponential Backoff Retry for Rate Limits
// Increased default retries to 5 and initial delay to 4000ms to handle 30s+ wait times
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 5, delay = 4000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for common rate limit (429) or temporary server errors (503)
    // Also check for "RESOURCE_EXHAUSTED" which is the specific Gemini Quota error
    const msg = error?.message || '';
    const isRateLimit = 
        error?.status === 429 || 
        msg.includes('429') || 
        msg.includes('Too Many Requests') ||
        msg.includes('Quota exceeded') ||
        msg.includes('RESOURCE_EXHAUSTED');
        
    const isServerOverload = error?.status === 503 || msg.includes('503');

    if ((isRateLimit || isServerOverload) && retries > 0) {
      console.warn(`Gemini API Limit hit (Retries left: ${retries}). Waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    
    // If we ran out of retries and it's a rate limit, throw a specific message
    if (isRateLimit) {
        throw new Error("Gemini AI Quota Exceeded. Please try again later.");
    }
    
    throw error;
  }
}

export const summarizeEmail = async (emailBody: string): Promise<{ summary: string; intent: string; priority: number }> => {
  try {
    return await retryWithBackoff(async () => {
        const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an executive assistant. 
        1. Summarize the following email conversation (under 100 words).
        2. Categorize the intent (Meeting, Action, FYI, Newsletter, Urgent, Spam).
        3. Assign a priority score (1-10).

Conversation:
${emailBody}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                intent: { 
                    type: Type.STRING, 
                    enum: ["Meeting", "Action", "FYI", "Newsletter", "Urgent", "Spam"] 
                },
                priority: { type: Type.INTEGER }
            },
            required: ["summary", "intent", "priority"]
            }
        }
        });

        const text = response.text;
        if (text) {
            return JSON.parse(text);
        }
        throw new Error("Empty response");
    });
  } catch (error: any) {
    console.error("Gemini Summarize Error:", error);
    // Return a friendly error in the summary field
    return {
        summary: error.message || "Could not generate summary due to high traffic.",
        intent: "FYI",
        priority: 1
    };
  }
};

export const generateDraftReply = async (emailBody: string, shortInstruction: string): Promise<string> => {
  try {
    return await retryWithBackoff(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are a professional email assistant. Draft a reply to the following email based on my instruction.\n\nIncoming Email:\n${emailBody}\n\nMy Instruction:\n${shortInstruction}\n\nDraft Reply:`,
        });
        return response.text || "Could not generate draft.";
    });
  } catch (error: any) {
    console.error("Gemini Draft Error:", error);
    return error.message || "Error generating draft (High Traffic).";
  }
};

export const improveWriting = async (currentDraft: string): Promise<string> => {
  try {
    return await retryWithBackoff(async () => {
        const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Improve the grammar, tone, and clarity of the following email draft. Keep it professional but concise.\n\nDraft:\n${currentDraft}`,
        });
        return response.text || currentDraft;
    });
  } catch (error) {
    console.error("Gemini Improve Error:", error);
    return currentDraft;
  }
};
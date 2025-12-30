// import { GoogleGenAI, Type } from "@google/genai";

// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 5, delay = 4000): Promise<T> {
//   try {
//     return await fn();
//   } catch (error: any) {

//     const msg = error?.message || '';
//     const isRateLimit = 
//         error?.status === 429 || 
//         msg.includes('429') || 
//         msg.includes('Too Many Requests') ||
//         msg.includes('Quota exceeded') ||
//         msg.includes('RESOURCE_EXHAUSTED');
        
//     const isServerOverload = error?.status === 503 || msg.includes('503');

//     if ((isRateLimit || isServerOverload) && retries > 0) {
//       console.warn(`Gemini API Limit hit (Retries left: ${retries}). Waiting ${delay}ms...`);
//       await new Promise(resolve => setTimeout(resolve, delay));
//       return retryWithBackoff(fn, retries - 1, delay * 2);
//     }
    
//     if (isRateLimit) {
//         throw new Error("Gemini AI Quota Exceeded. Please try again later.");
//     }
    
//     throw error;
//   }
// }

// export const summarizeEmail = async (emailBody: string): Promise<{ summary: string; intent: string; priority: number }> => {
//   try {
//     return await retryWithBackoff(async () => {
//         const response = await ai.models.generateContent({
//         model: 'gemini-2.5-flash',
//         contents: `You are an executive assistant. Lets think step by step.
//         1. Summarize the following email conversation (under 100 words) in bullet points.
//         2. Categorize the intent (Meeting, Action, FYI, Newsletter, Urgent, Spam).
//         3. Assign a priority score (1-10).

// Conversation:
// ${emailBody}`,
//         config: {
//             responseMimeType: "application/json",
//             responseSchema: {
//             type: Type.OBJECT,
//             properties: {
//                 summary: { type: Type.STRING },
//                 intent: { 
//                     type: Type.STRING, 
//                     enum: ["Meeting", "Action", "FYI", "Newsletter", "Urgent", "Spam"] 
//                 },
//                 priority: { type: Type.INTEGER }
//             },
//             required: ["summary", "intent", "priority"]
//             }
//         }
//         });

//         const text = response.text;
//         if (text) {
//             return JSON.parse(text);
//         }
//         throw new Error("Empty response");
//     });
//   } catch (error: any) {
//     console.error("Gemini Summarize Error:", error);
//     // Return a friendly error in the summary field
//     return {
//         summary: error.message || "Could not generate summary due to high traffic.",
//         intent: "FYI",
//         priority: 1
//     };
//   }
// };

// export const generateDraftReply = async (emailBody: string, shortInstruction: string): Promise<string> => {
//   try {
//     return await retryWithBackoff(async () => {
//         const response = await ai.models.generateContent({
//             model: 'gemini-2.5-flash',
//             contents: `You are a professional email assistant. Draft a reply to the following email based on my instruction.
//             Then review it from 3 perspectives:
//             1. Recipient clarity
//             2. Risk / ambiguity
//             3. Professional tone

//             Revise and provide the final version.
//             \n\nIncoming Email:\n${emailBody}\n\nMy Instruction:\n${shortInstruction}\n\nDraft Reply:`,
//         });
//         return response.text || "Could not generate draft.";
//     });
//   } catch (error: any) {
//     console.error("Gemini Draft Error:", error);
//     return error.message || "Error generating draft (High Traffic).";
//   }
// };

// export const improveWriting = async (currentDraft: string): Promise<string> => {
//   try {
//     return await retryWithBackoff(async () => {
//         const response = await ai.models.generateContent({
//         model: 'gemini-2.5-flash',
//         contents: `Improve the grammar, tone, and clarity of the following email draft. Keep it professional but concise.\n\nDraft:\n${currentDraft}`,
//         });
//         return response.text || currentDraft;
//     });
//   } catch (error) {
//     console.error("Gemini Improve Error:", error);
//     return currentDraft;
//   }
// };

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper: Exponential Backoff Retry for Rate Limits
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const msg = error?.message || '';
    const isRateLimit = 
        error?.status === 429 || 
        msg.includes('429') || 
        msg.includes('Too Many Requests') ||
        msg.includes('Quota exceeded') ||
        msg.includes('RESOURCE_EXHAUSTED');
        
    if (isRateLimit && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export interface SummaryResult {
  summary: string;
  intent: 'Meeting' | 'Action' | 'FYI' | 'Newsletter' | 'Urgent' | 'Spam' | string;
  priority: number;
}

/**
 * Summarizes an email thread and classifies it.
 */
export const summarizeEmail = async (threadText: string): Promise<SummaryResult> => {
  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Summarize the following email thread and classify its intent and priority (1-10). 
      Return the result in JSON format with fields: "summary", "intent", "priority".
      
      THREAD:
      ${threadText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: 'A concise 2-3 sentence summary of the thread.' },
            intent: { type: Type.STRING, description: 'One word classification: Meeting, Action, FYI, Newsletter, Urgent, or Spam.' },
            priority: { type: Type.NUMBER, description: 'A priority score from 1 to 10.' }
          },
          required: ['summary', 'intent', 'priority']
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}') as SummaryResult;
    } catch (e) {
      console.error("Failed to parse summary JSON", e);
      return {
        summary: "Could not generate summary.",
        intent: "FYI",
        priority: 5
      };
    }
  });
};

/**
 * Generates a draft reply based on instructions and the context of the incoming email (body and optional AI summary).
 */
export const generateDraftReply = async (subject: string, instructions: string, incomingBody?: string, summary?: string): Promise<string> => {
  return retryWithBackoff(async () => {
    let context = '';
    
    if (summary) {
      context += `PREVIOUS CONVERSATION SUMMARY:\n${summary}\n\n`;
    }
    
    if (incomingBody) {
      context += `INCOMING EMAIL CONTENT:\n${incomingBody.substring(0, 2000)}\n\n`;
    }
    
    const prompt = `Write a professional email reply.
    ${context}
    SUBJECT: ${subject}
    USER INSTRUCTIONS FOR THIS REPLY: ${instructions}
    
    The reply should be concise, professional, and directly address the key points identified in the conversation summary and body. 
    Only return the draft body of the email.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate draft.";
  });
};

/**
 * Improves writing quality, fixing grammar and tone.
 */
export const improveWriting = async (text: string): Promise<string> => {
  return retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Improve the following email text. Fix grammar, improve clarity, and make the tone professional yet concise. 
      Only return the improved text, no explanations.
      
      TEXT:
      ${text}`,
    });

    return response.text || text;
  });
};
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateQuizQuestions(
  text: string,
  apiKey: string,
  count: number = 5,
) {
  const genAI = new GoogleGenerativeAI(apiKey);

  // ⚡ FIX: Back to "gemini-2.0-flash" because we know your key has access to it.
  // The 404s on other models mean your key is likely in the "Experimental" program.
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: { responseMimeType: "application/json" },
  });

  const prompt = `
    You are a teacher. Create a quiz with ${count} multiple-choice questions based ONLY on the following text.
    
    Return a raw JSON object with this exact schema:
    {
      "questions": [
        {
          "question": "The question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "The correct option text (must match one of the options exactly)",
          "explanation": "Why this answer is correct"
        }
      ]
    }

    TEXT CONTENT:
    ${text.substring(0, 10000)}
  `;

  try {
    console.log("🤖 Asking Gemini 2.0 Flash...");
    const result = await model.generateContent(prompt);

    if (!result.response) {
      throw new Error("No response from AI");
    }

    const textResponse = result.response.text();
    console.log("✅ Gemini Responded!");
    return JSON.parse(textResponse).questions;
  } catch (error: any) {
    console.error("Gemini API Error Details:", error);

    // Detailed error handling
    if (error.message.includes("429")) {
      throw new Error(
        "Rate limit exceeded. Please wait 60 seconds and try again.",
      );
    }

    throw error;
  }
}

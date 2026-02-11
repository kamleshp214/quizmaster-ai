import OpenAI from "openai";

export type QuizType = "mcq" | "tf" | "fib";

export async function generateQuizQuestionsOpenAI(
  text: string,
  apiKey: string,
  count: number = 5,
  type: QuizType = "mcq",
) {
  const groq = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  // Strict Instructions based on type
  let systemPrompt = "You are a strict exam creator. Output valid JSON only.";
  let userPrompt = `Create a quiz with ${count} questions based on the text below.`;

  if (type === "mcq") {
    userPrompt += "\nType: Multiple Choice. Provide 4 distinct options.";
  } else if (type === "tf") {
    userPrompt +=
      "\nType: True/False. The 'options' array MUST be exactly ['True', 'False'].";
  } else if (type === "fib") {
    userPrompt +=
      "\nType: Fill-in-the-Blank. The 'question' must contain '______' representing the missing word. The 'options' array must be EMPTY []. The 'answer' must be the single missing word.";
  }

  userPrompt += `
    \nJSON Schema:
    {
      "questions": [
        {
          "question": "Question text",
          "options": ["Option A", "Option B"] (or [] for FIB),
          "answer": "Correct Answer",
          "explanation": "Why this is correct"
        }
      ]
    }
    
    TEXT CONTENT:
    ${text.substring(0, 15000)}
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower temperature = stricter adherence to format
    });

    return JSON.parse(completion.choices[0].message.content!).questions;
  } catch (error) {
    console.error("Groq Error:", error);
    throw new Error("Failed to generate quiz. Check API Key or Text content.");
  }
}

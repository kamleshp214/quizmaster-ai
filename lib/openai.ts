import OpenAI from "openai";

export type QuizType = "mcq" | "tf" | "fib" | "mix";

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

  // ⚡ STRICT INSTRUCTIONS
  let instructions = "";
  if (type === "mix") {
    instructions = `
      STRICTLY ALTERNATE QUESTION TYPES:
      1. Multiple Choice (MCQ)
      2. True/False (TF)
      3. Fill-in-the-Blank (FIB)
      ...repeat pattern.
    `;
  } else if (type === "mcq") {
    instructions = "ALL questions must be Multiple Choice (MCQ).";
  } else if (type === "tf") {
    instructions =
      "ALL questions must be True/False (TF). Options: ['True', 'False'].";
  } else if (type === "fib") {
    instructions =
      "ALL questions must be Fill-in-the-Blank (FIB). Question text MUST include '______'. Options: [].";
  }

  const prompt = `
    Create a quiz with ${count} questions based on the text below.
    ${instructions}

    RETURN VALID JSON ONLY. NO MARKDOWN.
    
    Schema:
    {
      "questions": [
        {
          "question": "The question text",
          "options": ["A", "B", "C", "D"] (Or ["True", "False"], or [] for FIB),
          "answer": "The exact correct string",
          "explanation": "Why the answer is correct",
          "type": "mcq" | "tf" | "fib"
        }
      ]
    }

    TEXT:
    ${text.substring(0, 15000)}
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a JSON-only API." },
        { role: "user", content: prompt },
      ],
      model: "llama-3.1-8b-instant",
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const parsed = JSON.parse(completion.choices[0].message.content!);

    // 🛡️ DATA SANITIZATION
    return parsed.questions.map((q: any) => ({
      ...q,
      type: q.type.toLowerCase(),
      // Ensure options exist for MCQ/TF, and are empty for FIB
      options:
        q.type.toLowerCase() === "fib" ? [] : q.options || ["True", "False"],
      // Ensure FIB answer is trimmed
      answer: q.answer.trim(),
    }));
  } catch (error) {
    console.error("Groq Error:", error);
    throw new Error("Failed to generate quiz. Try again.");
  }
}

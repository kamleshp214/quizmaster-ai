import OpenAI from "openai";

export type QuizType = "mcq" | "tf" | "fib" | "mix";
export type Difficulty = "easy" | "normal" | "hard";

export interface QuizResponse {
  subject: string;
  questions: {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
    simple_explanation: string;
    type: "mcq" | "tf" | "fib";
  }[];
}

export async function generateQuizQuestionsOpenAI(
  text: string,
  apiKey: string,
  count: number = 5,
  type: QuizType = "mcq",
  difficulty: Difficulty = "normal",
): Promise<QuizResponse> {
  const groq = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true, // Only if running client-side, but we are server-side
  });

  const prompt = `
    Role: System API.
    Task: Convert text into a strict JSON quiz.
    Count: ${count} questions.
    Difficulty: ${difficulty}.
    
    Structure Requirement:
    - If type is "mix", alternate: MCQ, TF, FIB.
    - If type is "fib", "options" must be empty [].
    - "simple_explanation" must be a simplified version of the "explanation".
    
    CRITICAL: Output PURE JSON only. Do not wrap in markdown blocks. Do not add conversational text.

    JSON Schema:
    {
      "subject": "Topic Name",
      "questions": [
        {
          "question": "Question text",
          "options": ["A", "B", "C", "D"],
          "answer": "Correct Answer",
          "explanation": "Academic explanation",
          "simple_explanation": "Child-friendly explanation",
          "type": "mcq"
        }
      ]
    }

    TEXT CONTENT:
    ${text.substring(0, 25000)}
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a backend processor. Return only raw JSON.",
        },
        { role: "user", content: prompt },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.2, // Lower temp = more stable JSON
    });

    let raw = completion.choices[0].message.content || "";

    // 🧹 SANITIZER: Robust JSON Extraction
    // 1. Remove Markdown code blocks
    raw = raw.replace(/```json/g, "").replace(/```/g, "");

    // 2. Find the first '{' and last '}'
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1) {
      raw = raw.substring(firstBrace, lastBrace + 1);
    } else {
      throw new Error("No JSON object found in response");
    }

    // 3. Parse
    const parsed = JSON.parse(raw);

    // 4. Validate & Normalize
    return {
      subject: parsed.subject || "General Knowledge",
      questions: parsed.questions.map((q: any) => ({
        ...q,
        type: q.type.toLowerCase(),
        // Fallback if simple_explanation is missing
        simple_explanation: q.simple_explanation || q.explanation,
        // Ensure options exist for MCQ/TF
        options:
          q.type.toLowerCase() === "fib" ? [] : q.options || ["True", "False"],
        // Stringify answer just in case
        answer: q.answer.toString().trim(),
      })),
    };
  } catch (error) {
    console.error("Groq Generation Error:", error);
    // Return a fallback error that the UI can handle gracefully
    throw new Error(
      "Failed to generate quiz. The content might be too complex or the AI is busy. Please try again.",
    );
  }
}

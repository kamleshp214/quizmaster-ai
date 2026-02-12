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
  difficulty: Difficulty = "normal"
): Promise<QuizResponse> {
  const groq = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true 
  });

  // Dynamic Prompt Construction based on User Selection
  let formatRules = "";
  if (type === "mcq") {
    formatRules = `- Strictly generate Multiple Choice Questions (MCQ).
    - Provide exactly 4 options per question.`;
  } else if (type === "tf") {
    formatRules = `- Strictly generate True/False questions.
    - Options MUST be exactly: ["True", "False"].`;
  } else if (type === "fib") {
    formatRules = `- Strictly generate Fill-in-the-Blank (FIB) questions.
    - Options MUST be an empty array [].`;
  } else {
    formatRules = `- Generate a mix of MCQ, True/False, and Fill-in-the-Blank questions.`;
  }

  const prompt = `
    Role: System API.
    Task: Create a ${difficulty} level quiz based on the text below.
    Format: JSON.
    Question Count: ${count}.
    
    STRICT FORMATTING RULES:
    ${formatRules}
    - "answer" must be the exact string value from the options (or the correct text for FIB).
    - "simple_explanation" must be a simplified, child-friendly version of the academic "explanation".
    - Do NOT include conversational text. Output ONLY the JSON object.

    JSON Schema:
    {
      "subject": "Topic Name",
      "questions": [
        {
          "question": "Question text",
          "options": ["Option A", "Option B", ...], 
          "answer": "Correct Answer",
          "explanation": "Detailed academic explanation",
          "simple_explanation": "Simple ELI5 explanation",
          "type": "${type === 'mix' ? 'mcq OR tf OR fib' : type}"
        }
      ]
    }

    CONTENT TO ANALYZE:
    ${text.substring(0, 25000)}
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a backend JSON API. Return only valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.3, // Slightly higher for creativity in questions, but logic is constrained by prompt
    });

    let raw = completion.choices[0].message.content || "";

    // 🧹 SANITIZER: Robust JSON Extraction
    raw = raw.replace(/```json/g, "").replace(/```/g, "");
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      raw = raw.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(raw);
    
    // 🛡️ Data Normalization Guard
    return {
      subject: parsed.subject || "General Knowledge",
      questions: parsed.questions.map((q: any) => ({
        question: q.question,
        // Enforce True/False options if the type is TF, regardless of what AI generated
        options: q.type === 'tf' || type === 'tf' ? ["True", "False"] : (q.options || []),
        answer: q.answer.toString().trim(),
        explanation: q.explanation || "No explanation provided.",
        simple_explanation: q.simple_explanation || q.explanation,
        type: (type === 'mix' ? q.type : type).toLowerCase()
      }))
    };

  } catch (error) {
    console.error("Groq Generation Error:", error);
    throw new Error("Failed to generate quiz. The content might be too complex or the AI is busy. Please try again.");
  }
}

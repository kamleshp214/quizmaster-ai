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

// ─── FIX #3: shuffle so correct answer isn't always Option A ─────────────────
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function generateQuizQuestionsOpenAI(
  text: string,
  apiKey: string,
  count: number = 5,
  type: QuizType = "mcq",
  difficulty: Difficulty = "normal"
): Promise<QuizResponse> {

  // ─── FIX #1 & #2: correct model, no deprecated model, proper syntax ─────────
  const groq = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true,
  });

  // Dynamic format rules
  let formatRules = "";
  if (type === "mcq") {
    formatRules = `- Strictly generate Multiple Choice Questions (MCQ).
    - Provide exactly 4 options per question.
    - Do NOT always put the correct answer as the first option. Vary its position.`;
  } else if (type === "tf") {
    formatRules = `- Strictly generate True/False questions.
    - Options MUST be exactly: ["True", "False"].`;
  } else if (type === "fib") {
    formatRules = `- Strictly generate Fill-in-the-Blank (FIB) questions.
    - Options MUST be an empty array [].`;
  } else {
    formatRules = `- Generate a mix of MCQ, True/False, and Fill-in-the-Blank questions.
    - For MCQ questions, provide exactly 4 options.
    - For True/False questions, options MUST be exactly ["True", "False"].
    - For Fill-in-the-Blank questions, options MUST be an empty array [].`;
  }

  const prompt = `
    Role: System API.
    Task: Create a ${difficulty} level quiz based on the text below.
    Format: JSON only.
    Question Count: ${count}.
    
    STRICT FORMATTING RULES:
    ${formatRules}
    - "answer" must be the exact string value from the options (or the correct word for FIB).
    - "simple_explanation" must be a simplified, child-friendly version of "explanation".
    - Do NOT include any conversational text. Output ONLY the JSON object.
    - Do NOT wrap the JSON in markdown code fences.
    
    JSON Schema:
    {
      "subject": "Topic Name",
      "questions": [
        {
          "question": "Question text here",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "Correct Answer Text",
          "explanation": "Detailed academic explanation",
          "simple_explanation": "Simple ELI5 explanation",
          "type": "${type === "mix" ? "mcq OR tf OR fib" : type}"
        }
      ]
    }
    
    CONTENT TO ANALYZE:
    ${text.substring(0, 25000)}
  `;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a strict backend JSON API. Return ONLY valid JSON with no markdown, no code fences, no explanation text before or after the JSON object.",
        },
        { role: "user", content: prompt },
      ],
      model: "llama-3.3-70b-versatile", // ─── FIX #1: updated model
      temperature: 0.3,                  // ─── FIX #4: lowered from 0.7 for reliable JSON
    });

    let raw = completion.choices[0].message.content || "";

    // ─── JSON Sanitizer ───────────────────────────────────────────────────────
    raw = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      raw = raw.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(raw);

    // ─── Data Normalization + FIX #3: shuffle options ────────────────────────
    return {
      subject: parsed.subject || "General Knowledge",
      questions: parsed.questions.map((q: any) => {
        const qType = (type === "mix" ? q.type : type).toLowerCase();

        // Determine options — shuffle MCQ/mix so answer isn't always first
        let options: string[];
        if (qType === "tf") {
          options = ["True", "False"];
        } else if (qType === "fib") {
          options = [];
        } else {
          // Shuffle MCQ options so correct answer position is randomized
          options = shuffleArray(q.options || []);
        }

        return {
          question: q.question,
          options,
          answer: q.answer.toString().trim(),
          explanation: q.explanation || "No explanation provided.",
          simple_explanation: q.simple_explanation || q.explanation,
          type: qType,
        };
      }),
    };
  } catch (error) {
    console.error("Groq Generation Error:", error);
    throw new Error(
      "Failed to generate quiz. The content might be too complex or the AI is busy. Please try again."
    );
  }
}

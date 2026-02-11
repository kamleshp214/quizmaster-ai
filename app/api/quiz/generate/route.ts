import { NextRequest, NextResponse } from "next/server";
import { getPdfText } from "@/lib/pdf-loader";
import { generateQuizQuestionsOpenAI } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const apiKey = formData.get("apiKey") as string;
    const quizType = (formData.get("quizType") as any) || "mcq";

    if (!file || !apiKey) {
      return NextResponse.json(
        { error: "File and API Key are required" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Extract Text
    let text = "";
    try {
      text = await getPdfText(buffer);
    } catch (e) {
      return NextResponse.json({ error: "PDF Parse Failed" }, { status: 500 });
    }

    // 2. Generate
    try {
      const questions = await generateQuizQuestionsOpenAI(
        text,
        apiKey,
        5,
        quizType,
      );
      return NextResponse.json({ questions });
    } catch (error: any) {
      console.error("AI Error:", error);
      return NextResponse.json(
        { error: "AI Generation Failed. Check your Groq Key." },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

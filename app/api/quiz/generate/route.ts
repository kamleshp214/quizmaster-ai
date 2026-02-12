import { NextRequest, NextResponse } from "next/server";
import { getPdfText } from "@/lib/pdf-loader";
import { getYoutubeTranscript } from "@/lib/youtube";
import { generateQuizQuestionsOpenAI } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const apiKey = formData.get("apiKey") as string;
    const quizType = (formData.get("quizType") as any) || "mcq";
    const difficulty = (formData.get("difficulty") as any) || "normal"; // <--- NEW
    const amount = parseInt(formData.get("amount") as string) || 5;
    const file = formData.get("file") as File | null;
    const youtubeUrl = formData.get("youtubeUrl") as string | null;

    if (!apiKey)
      return NextResponse.json({ error: "API Key required" }, { status: 400 });

    // 1. Extract Text
    let text = "";
    try {
      if (file) {
        text = await getPdfText(Buffer.from(await file.arrayBuffer()));
      } else if (youtubeUrl) {
        text = await getYoutubeTranscript(youtubeUrl);
      } else {
        return NextResponse.json(
          { error: "No content provided." },
          { status: 400 },
        );
      }
    } catch (e: any) {
      return NextResponse.json(
        { error: "Failed to read content." },
        { status: 500 },
      );
    }

    if (!text || text.length < 50)
      return NextResponse.json(
        { error: "Content too short." },
        { status: 400 },
      );

    // 2. Generate
    try {
      // Pass difficulty here
      const result = await generateQuizQuestionsOpenAI(
        text,
        apiKey,
        amount,
        quizType,
        difficulty,
      );
      return NextResponse.json(result); // Returns { subject, questions }
    } catch (error: any) {
      console.error(error);
      return NextResponse.json(
        { error: "AI Generation Failed." },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

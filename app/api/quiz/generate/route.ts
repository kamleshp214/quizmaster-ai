import { NextRequest, NextResponse } from "next/server";
import { getPdfText } from "@/lib/pdf-loader";
import { getYoutubeTranscript } from "@/lib/youtube";
import { generateQuizQuestionsOpenAI } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const apiKey = formData.get("apiKey") as string;
    const quizType = (formData.get("quizType") as any) || "mcq";
    const amount = parseInt(formData.get("amount") as string) || 5;

    // Sources
    const file = formData.get("file") as File | null;
    const youtubeUrl = formData.get("youtubeUrl") as string | null;

    if (!apiKey)
      return NextResponse.json({ error: "API Key required" }, { status: 400 });

    let text = "";

    // 1. Extract Text
    try {
      if (file) {
        const buffer = Buffer.from(await file.arrayBuffer());
        text = await getPdfText(buffer);
      } else if (youtubeUrl) {
        text = await getYoutubeTranscript(youtubeUrl);
      } else {
        return NextResponse.json(
          { error: "Please upload a file or enter a URL." },
          { status: 400 },
        );
      }
    } catch (e: any) {
      console.error("Extraction Error:", e);
      return NextResponse.json(
        {
          error:
            "Failed to read content. Ensure the PDF has text (not images) or the Video has captions.",
        },
        { status: 500 },
      );
    }

    // 🔒 GATEKEEPER: Prevent Hallucinations
    if (!text || text.length < 100) {
      return NextResponse.json(
        {
          error:
            "The document text is too short or empty. If this is a scanned PDF, please use an OCR tool first.",
        },
        { status: 400 },
      );
    }

    // 2. Generate
    try {
      console.log(
        `Generating ${amount} questions from ${text.length} chars of text...`,
      );
      const questions = await generateQuizQuestionsOpenAI(
        text,
        apiKey,
        amount,
        quizType,
      );
      return NextResponse.json({ questions });
    } catch (error: any) {
      console.error("AI Error:", error);
      return NextResponse.json(
        { error: "AI Generation Failed. Please check your API Key." },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

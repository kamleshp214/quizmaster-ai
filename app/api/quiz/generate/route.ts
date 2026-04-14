import { NextRequest, NextResponse } from "next/server";
import { getPdfText } from "@/lib/pdf-loader";
import { getYoutubeTranscript } from "@/lib/youtube";
import { generateQuizQuestionsOpenAI } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const apiKey     = formData.get("apiKey")     as string;
    const quizType   = (formData.get("quizType")  as any) || "mcq";
    const difficulty = (formData.get("difficulty") as any) || "normal"; // ─── FIX #6
    const amount     = parseInt(formData.get("amount") as string) || 5;
    const file       = formData.get("file")       as File   | null;
    const youtubeUrl = formData.get("youtubeUrl") as string | null;
    const topic      = formData.get("topic")      as string | null; // ─── FIX #5

    // Guard: API key required
    if (!apiKey) {
      return NextResponse.json(
        { error: "API Key required" },
        { status: 400 }
      );
    }

    // ─── Step 1: Extract text from whichever source was provided ─────────────
    let text = "";
    try {
      if (file) {
        // PDF mode
        text = await getPdfText(Buffer.from(await file.arrayBuffer()));

      } else if (youtubeUrl && youtubeUrl.trim() !== "") {
        // YouTube mode
        text = await getYoutubeTranscript(youtubeUrl);

      } else if (topic && topic.trim() !== "") {
        // ─── FIX #5: Topic mode was missing — now properly handled ───────────
        text = `
          The following is a study topic that a student wants to be quizzed on.
          Generate questions that test understanding of this topic comprehensively.
          Topic: ${topic.trim()}
        `;

      } else {
        return NextResponse.json(
          { error: "No content provided. Please upload a PDF, paste a YouTube link, or enter a topic." },
          { status: 400 }
        );
      }
    } catch (e: any) {
      console.error("Content extraction error:", e);
      return NextResponse.json(
        { error: "Failed to read content. Please check your file or link and try again." },
        { status: 500 }
      );
    }

    // Guard: extracted text must be meaningful
    if (!text || text.trim().length < 30) {
      return NextResponse.json(
        { error: "Content is too short to generate a quiz. Please provide more text." },
        { status: 400 }
      );
    }

    // ─── Step 2: Generate quiz with all settings ──────────────────────────────
    try {
      const result = await generateQuizQuestionsOpenAI(
        text,
        apiKey,
        amount,
        quizType,
        difficulty  // ─── FIX #6: difficulty now actually passed through
      );
      return NextResponse.json(result);

    } catch (error: any) {
      console.error("Generation error:", error);
      return NextResponse.json(
        { error: "AI Generation Failed. Please check your API key and try again." },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Server Error. Please try again." },
      { status: 500 }
    );
  }
}

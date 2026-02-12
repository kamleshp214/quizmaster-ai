import { NextRequest, NextResponse } from "next/server";
import { getPdfText } from "@/lib/pdf-loader";
import { getYoutubeTranscript } from "@/lib/youtube";
import { generateQuizQuestionsOpenAI } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const apiKey = formData.get("apiKey") as string;
    const quizType = (formData.get("quizType") as any) || "mcq";
    const difficulty = (formData.get("difficulty") as any) || "normal"; 
    const amount = parseInt(formData.get("amount") as string) || 5;
    
    // Inputs
    const file = formData.get("file") as File | null;
    const youtubeUrl = formData.get("youtubeUrl") as string | null;
    const topic = formData.get("topic") as string | null; // <--- NEW: Extract Topic

    if (!apiKey)
      return NextResponse.json({ error: "API Key required" }, { status: 400 });

    // 1. Extract or Formulate Text
    let text = "";
    let isTopicMode = false;

    try {
      if (file) {
        text = await getPdfText(Buffer.from(await file.arrayBuffer()));
      } else if (youtubeUrl) {
        text = await getYoutubeTranscript(youtubeUrl);
      } else if (topic) {
        // NEW: Formulate a context block telling the AI to use its internal knowledge
        text = `Please generate a comprehensive and accurate quiz strictly about the following topic: "${topic}". Rely entirely on your internal knowledge base to create factual, relevant, and challenging questions covering key concepts related to this subject.`;
        isTopicMode = true;
      } else {
        return NextResponse.json(
          { error: "No document, link, or topic provided." },
          { status: 400 },
        );
      }
    } catch (e: any) {
      return NextResponse.json(
        { error: "Failed to process input source." },
        { status: 500 },
      );
    }

    // NEW: Only enforce the 50-character minimum if we are parsing a Document or YouTube video.
    if (!isTopicMode && (!text || text.length < 50)) {
      return NextResponse.json(
        { error: "Source content is too short to generate a meaningful quiz." },
        { status: 400 },
      );
    }

    // 2. Generate Quiz
    try {
      const result = await generateQuizQuestionsOpenAI(
        text,
        apiKey,
        amount,
        quizType,
        difficulty,
      );
      
      // Override the generated subject name if the user provided a direct topic
      if (isTopicMode && topic) {
         result.subject = topic;
      }

      return NextResponse.json(result);
    } catch (error: any) {
      console.error(error);
      return NextResponse.json(
        { error: "AI Generation Failed. The model might be overloaded." },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

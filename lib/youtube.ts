import { YoutubeTranscript } from "youtube-transcript";

export async function getYoutubeTranscript(url: string) {
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(url);

    // Combine all lines into one text
    const text = transcriptItems
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " "); // Clean whitespace

    return text;
  } catch (error) {
    console.error("YouTube Error:", error);
    throw new Error(
      "Failed to fetch YouTube transcript. Ensure the video has captions.",
    );
  }
}

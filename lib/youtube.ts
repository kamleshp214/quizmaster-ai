/**
 * lib/youtube.ts
 *
 * Uses YouTube's internal InnerTube API (/youtubei/v1/player) to fetch
 * transcripts. This approach works from Vercel serverless — HTML scraping
 * gets blocked by YouTube, but this POST API does not.
 */

// ─── Extract video ID from any YouTube URL format ────────────────────────────
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ─── Fetch player response via InnerTube API ─────────────────────────────────
// This POST API is what YouTube's own web client uses internally.
// It returns the full player response including caption track URLs.
async function fetchPlayerResponseInnerTube(videoId: string): Promise<any> {
  const response = await fetch(
    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20240101.00.00",
        "Origin": "https://www.youtube.com",
        "Referer": `https://www.youtube.com/watch?v=${videoId}`,
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20240101.00.00",
            hl: "en",
            gl: "US",
          },
        },
        videoId,
        contentCheckOk: true,
        racyCheckOk: true,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      `YouTube InnerTube API returned ${response.status}. The video may be unavailable.`
    );
  }

  return response.json();
}

// ─── Pick the best available caption track ───────────────────────────────────
function extractCaptionUrl(playerResponse: any): string | null {
  try {
    const tracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!tracks || tracks.length === 0) return null;

    // Prefer manually added English, then auto-generated English, then any
    const preferred = ["en", "en-US", "en-GB"];
    const track =
      tracks.find((t: any) => preferred.includes(t.languageCode) && t.kind !== "asr") ||
      tracks.find((t: any) => preferred.includes(t.languageCode)) ||
      tracks.find((t: any) => t.languageCode?.startsWith("en")) ||
      tracks[0];

    return track?.baseUrl ?? null;
  } catch {
    return null;
  }
}

// ─── Fetch caption JSON3 and convert to plain text ───────────────────────────
async function fetchAndParseCaptions(captionUrl: string): Promise<string> {
  const response = await fetch(captionUrl + "&fmt=json3", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download captions (status ${response.status}).`);
  }

  const data = await response.json();
  const events: any[] = data?.events ?? [];
  const segments: string[] = [];

  for (const event of events) {
    if (!event.segs) continue;
    const line = event.segs
      .map((seg: any) => seg.utf8 ?? "")
      .join("")
      .replace(/\n/g, " ")
      .trim();
    if (line) segments.push(line);
  }

  return segments.join(" ").replace(/\s+/g, " ").trim();
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function getYoutubeTranscript(url: string): Promise<string> {
  // 1. Extract video ID
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error(
      "Invalid YouTube URL. Supported formats: youtube.com/watch?v=..., youtu.be/..., youtube.com/shorts/..."
    );
  }

  // 2. Call InnerTube API for player response
  let playerResponse: any;
  try {
    playerResponse = await fetchPlayerResponseInnerTube(videoId);
  } catch (err: any) {
    throw new Error(`Could not contact YouTube: ${err.message}`);
  }

  // 3. Check playability status
  const status = playerResponse?.playabilityStatus?.status;
  const reason = playerResponse?.playabilityStatus?.reason ?? "";

  if (status === "LOGIN_REQUIRED") {
    throw new Error(
      "This video is age-restricted or requires sign-in. Please use a different video."
    );
  }
  if (status === "UNPLAYABLE" || status === "ERROR") {
    throw new Error(
      `This video is unavailable: ${reason || "unknown reason"}.`
    );
  }
  if (status === "PRIVATE_VIDEO") {
    throw new Error("This video is private. Please use a public video.");
  }
  if (status === "LIVE_STREAM_OFFLINE") {
    throw new Error("This is a live stream. Please use a regular video.");
  }

  // 4. Get caption URL from response
  const captionUrl = extractCaptionUrl(playerResponse);
  if (!captionUrl) {
    const title =
      playerResponse?.videoDetails?.title ?? `Video ID: ${videoId}`;
    throw new Error(
      `No captions found for "${title}". ` +
      `Please use a video that has English captions or auto-generated subtitles. ` +
      `Tip: Most educational videos, TED Talks, and popular YouTube channels have auto-generated captions.`
    );
  }

  // 5. Fetch and parse transcript
  let transcript: string;
  try {
    transcript = await fetchAndParseCaptions(captionUrl);
  } catch (err: any) {
    throw new Error(`Could not fetch transcript text: ${err.message}`);
  }

  if (!transcript || transcript.length < 50) {
    throw new Error(
      "The transcript is too short to generate a meaningful quiz. Please try a longer video."
    );
  }

  return transcript;
}

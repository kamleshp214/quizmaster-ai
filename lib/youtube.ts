/**
 * lib/youtube.ts
 * 
 * Fetches YouTube transcripts without any npm package.
 * Uses native fetch with real browser headers — works on Vercel serverless.
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

// ─── Fetch YouTube page and parse ytInitialPlayerResponse ────────────────────
async function fetchPlayerResponse(videoId: string): Promise<any> {
  const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `YouTube returned status ${response.status}. The video may be private or unavailable.`
    );
  }

  const html = await response.text();

  // Extract the JSON blob YouTube embeds in every watch page
  const match = html.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;/s);
  if (!match) {
    throw new Error(
      "Could not parse YouTube player data. Try a different video."
    );
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    throw new Error("Failed to parse YouTube player response JSON.");
  }
}

// ─── Pick the best available caption track (prefers English) ─────────────────
function extractCaptionUrl(playerResponse: any): string | null {
  try {
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) return null;

    const preferred = ["en", "en-US", "en-GB"];
    const track =
      captionTracks.find((t: any) => preferred.includes(t.languageCode)) ||
      captionTracks.find((t: any) => t.languageCode?.startsWith("en")) ||
      captionTracks[0];

    return track?.baseUrl ?? null;
  } catch {
    return null;
  }
}

// ─── Fetch caption JSON and convert to plain text ────────────────────────────
async function fetchAndParseCaptions(captionUrl: string): Promise<string> {
  const response = await fetch(captionUrl + "&fmt=json3", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to download caption data from YouTube.");
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
  // 1. Validate and extract video ID
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error(
      "Invalid YouTube URL. Supported formats:\n" +
        "• youtube.com/watch?v=...\n" +
        "• youtu.be/...\n" +
        "• youtube.com/shorts/..."
    );
  }

  // 2. Fetch player response from YouTube
  let playerResponse: any;
  try {
    playerResponse = await fetchPlayerResponse(videoId);
  } catch (err: any) {
    throw new Error(`Could not load YouTube video: ${err.message}`);
  }

  // 3. Check playability
  const status = playerResponse?.playabilityStatus?.status;
  if (status === "LOGIN_REQUIRED") {
    throw new Error(
      "This video is age-restricted or requires sign-in. Please use a different video."
    );
  }
  if (status === "UNPLAYABLE" || status === "ERROR") {
    throw new Error("This video is unavailable or has been removed.");
  }
  if (status === "PRIVATE_VIDEO") {
    throw new Error("This video is private. Please use a public video.");
  }

  // 4. Get caption URL
  const captionUrl = extractCaptionUrl(playerResponse);
  if (!captionUrl) {
    const title =
      playerResponse?.videoDetails?.title ?? `Video ID: ${videoId}`;
    throw new Error(
      `No captions found for "${title}".\n` +
        `Please use a video with English captions enabled.\n` +
        `Tip: Educational videos, TED Talks, and most popular channels have auto-generated captions.`
    );
  }

  // 5. Fetch and parse transcript text
  let transcript: string;
  try {
    transcript = await fetchAndParseCaptions(captionUrl);
  } catch (err: any) {
    throw new Error(`Could not fetch transcript: ${err.message}`);
  }

  if (!transcript || transcript.length < 50) {
    throw new Error(
      "The transcript is too short to generate a meaningful quiz. Please try a longer video."
    );
  }

  return transcript;
}

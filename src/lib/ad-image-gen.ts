// Real AI image generation for Image Ad concepts (OpenAI DALL·E 3). Only
// called when a consultant explicitly clicks "Generate Image" on a specific
// ad concept — never automatically, and never with a fabricated fallback
// image if it fails. If no API key is configured, or the call errors, the
// caller gets an honest error message instead of a placeholder.

export interface AdImageResult {
  ok: boolean;
  dataUrl?: string;
  error?: string;
}

export type AdImageSize = "1024x1024" | "1792x1024" | "1024x1792";

export async function generateAdImage(apiKey: string, prompt: string, size: AdImageSize = "1024x1024"): Promise<AdImageResult> {
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, error: "No OpenAI API key configured. Add one in Settings → AI Image Generation." };
  }
  if (!prompt || !prompt.trim()) {
    return { ok: false, error: "No image description to generate from." };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt.trim(),
        n: 1,
        size,
        response_format: "b64_json",
      }),
    });

    if (!res.ok) {
      let message = `Image generation failed (HTTP ${res.status}).`;
      try {
        const body = await res.json();
        if (body?.error?.message) message = body.error.message;
      } catch {
        // ignore — keep the generic status-based message
      }
      return { ok: false, error: message };
    }

    const body = await res.json();
    const b64 = body?.data?.[0]?.b64_json;
    if (!b64) {
      return { ok: false, error: "OpenAI returned no image data." };
    }
    return { ok: true, dataUrl: `data:image/png;base64,${b64}` };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "Image generation timed out. Try again." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Image generation failed — network error." };
  } finally {
    clearTimeout(timeout);
  }
}

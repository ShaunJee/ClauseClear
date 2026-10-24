import { createGoogleGenerativeAI } from "@ai-sdk/google";

const PREFERRED_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-preview-02-05",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

// In-memory cache of resolved model per API key to prevent extra network roundtrips
const modelCache = new Map<string, string>();

/**
 * Dynamically resolves the best available Gemini model supported by the provided API key.
 * Queries Google's ModelService so accounts automatically get the right active model.
 */
export async function resolveActiveGeminiModel(apiKey: string): Promise<string> {
  const cleanKey = apiKey.trim();
  if (modelCache.has(cleanKey)) {
    return modelCache.get(cleanKey)!;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`,
      { cache: "no-store" }
    );

    if (res.ok) {
      const data = await res.json();
      const models: any[] = data.models || [];
      const supportedNames = models
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""));

      for (const pref of PREFERRED_MODELS) {
        if (supportedNames.includes(pref)) {
          modelCache.set(cleanKey, pref);
          return pref;
        }
      }

      // If no preferred match, pick any available model supporting generateContent
      if (supportedNames.length > 0) {
        const fallback = supportedNames[0];
        modelCache.set(cleanKey, fallback);
        return fallback;
      }
    }
  } catch (err) {
    console.warn("Failed to query Google ModelService, falling back to gemini-3.5-flash-lite:", err);
  }

  // Sensible default prioritized for speed
  return "gemini-3.5-flash-lite";
}

/**
 * Creates a Google provider instance configured for the given API key.
 */
export function getGoogleProvider(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey: apiKey.trim() });
}

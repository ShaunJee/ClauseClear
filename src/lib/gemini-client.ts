import { createGoogleGenerativeAI } from "@ai-sdk/google";

const PREFERRED_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-4-argon",
  "gemini-2.5-pro",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

// In-memory cache of resolved model per API key to prevent extra network roundtrips
const modelCache = new Map<string, string>();

/**
 * Dynamically resolves the best available Gemini model supported by the provided API key.
 * Queries Google's ModelService so accounts automatically get the right active model.
 */
export async function resolveActiveGeminiModel(
  apiKey: string,
  preferredModel?: string
): Promise<string> {
  const cleanKey = apiKey.trim();
  const userChoice = preferredModel || "gemini-3.5-flash";
  const cacheKey = `${cleanKey}:${userChoice}`;

  if (modelCache.has(cacheKey)) {
    return modelCache.get(cacheKey)!;
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

      // 1. If preferred model is supported, pick it
      if (supportedNames.includes(userChoice)) {
        modelCache.set(cacheKey, userChoice);
        return userChoice;
      }

      // 2. Fall back down priority list
      for (const pref of PREFERRED_MODELS) {
        if (supportedNames.includes(pref)) {
          modelCache.set(cacheKey, pref);
          return pref;
        }
      }

      // If no preferred match, pick any available model supporting generateContent
      if (supportedNames.length > 0) {
        const fallback = supportedNames[0];
        modelCache.set(cacheKey, fallback);
        return fallback;
      }
    }
  } catch (err) {
    console.warn("Failed to query Google ModelService, falling back to chosen model:", err);
  }

  // Sensible default prioritized for speed and legal accuracy
  return userChoice;
}

/**
 * Creates a Google provider instance configured for the given API key.
 */
export function getGoogleProvider(apiKey: string) {
  return createGoogleGenerativeAI({ apiKey: apiKey.trim() });
}

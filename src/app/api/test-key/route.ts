import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { resolveActiveGeminiModel, getGoogleProvider } from "../../../lib/gemini-client";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { apiKey, model: requestedModel } = body;

    const keyToTest = apiKey?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!keyToTest) {
      return NextResponse.json(
        { ok: false, error: "No API key was provided to test." },
        { status: 400 }
      );
    }

    // Dynamically resolve the model supported by the user's key/account
    const modelId = await resolveActiveGeminiModel(keyToTest, requestedModel);
    const googleProvider = getGoogleProvider(keyToTest);

    const result = await generateText({
      model: googleProvider(modelId),
      prompt: "Respond with the single word: OK",
      temperature: 0,
      maxTokens: 5,
    });

    if (result && result.text) {
      return NextResponse.json({
        ok: true,
        model: modelId,
        message: `Successfully connected to Google Gemini (${modelId}).`,
      });
    }

    return NextResponse.json({
      ok: false,
      error: "Unexpected response from Gemini API.",
    });
  } catch (error: any) {
    const errorMsg =
      error?.message || error?.error?.message || "Invalid or unauthorized Gemini API key.";
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 400 });
  }
}

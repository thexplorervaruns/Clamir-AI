import dotenv from "dotenv";

dotenv.config();

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.5-flash";

/**
 * Calls OpenRouter using standard HTTP fetch and the OpenAI-compatible chat completions format.
 * Uses model "google/gemini-2.5-flash".
 */
export async function callOpenRouterChat({
  prompt,
  messages,
  systemInstruction,
  temperature = 0.2,
  jsonMode = false,
}) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.startsWith("{{")) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured on the server. Set OPENROUTER_API_KEY in your server environment."
    );
  }

  const finalMessages = [];
  if (systemInstruction && String(systemInstruction).trim()) {
    finalMessages.push({
      role: "system",
      content: String(systemInstruction).trim(),
    });
  }

  if (Array.isArray(messages) && messages.length > 0) {
    for (const m of messages) {
      if (m && m.content) {
        finalMessages.push({
          role: m.role === "assistant" || m.role === "system" ? m.role : "user",
          content: String(m.content),
        });
      }
    }
  } else if (prompt && String(prompt).trim()) {
    finalMessages.push({
      role: "user",
      content: String(prompt).trim(),
    });
  } else {
    throw new Error("Prompt or messages array is required for OpenRouter completion.");
  }

  const requestBody = {
    model: DEFAULT_OPENROUTER_MODEL,
    messages: finalMessages,
    temperature,
  };

  if (jsonMode) {
    requestBody.response_format = { type: "json_object" };
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "Clamir AI Simulation Engine",
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errMsg =
      data?.error?.message ||
      data?.message ||
      `OpenRouter API returned HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const result = data.choices?.[0]?.message?.content;
  if (!result || typeof result !== "string") {
    throw new Error("OpenRouter returned an empty completion response.");
  }

  return {
    content: result.trim(),
    model: data.model || DEFAULT_OPENROUTER_MODEL,
    usage: data.usage || null,
  };
}

/**
 * Express / Serverless HTTP handler for POST /api/ai/generate
 */
export async function handleAiGenerateRequest(req, res) {
  try {
    const { prompt, messages, systemInstruction, temperature, jsonMode } = req.body || {};
    const completion = await callOpenRouterChat({
      prompt,
      messages,
      systemInstruction,
      temperature: typeof temperature === "number" ? temperature : 0.2,
      jsonMode: Boolean(jsonMode),
    });
    res.json({
      ok: true,
      result: completion.content,
      model: completion.model,
      usage: completion.usage,
    });
  } catch (err) {
    res.status(502).json({
      ok: false,
      error: err instanceof Error ? err.message : "OpenRouter AI generation failed.",
    });
  }
}

export default handleAiGenerateRequest;

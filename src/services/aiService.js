const inFlightRequests = new Map();

/**
 * Centralized frontend AI service.
 * Routes all AI completions through the secure backend endpoint (/api/ai/generate)
 * which calls OpenRouter (model: "google/gemini-2.5-flash") using server-side OPENROUTER_API_KEY.
 */
export async function generateAIResponse({
  prompt,
  messages,
  systemInstruction,
  temperature = 0.2,
  jsonMode = false,
  authToken = "",
}) {
  const dedupeKey = JSON.stringify({
    prompt,
    messages,
    systemInstruction,
    jsonMode,
  });

  if (inFlightRequests.has(dedupeKey)) {
    return inFlightRequests.get(dedupeKey);
  }

  const requestPromise = (async () => {
    const headers = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt,
        messages,
        systemInstruction,
        temperature,
        jsonMode,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(
        data?.error || `AI service request failed with status ${response.status}`
      );
    }

    return data.result;
  })();

  inFlightRequests.set(dedupeKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(dedupeKey);
  }
}

/**
 * Simulation service for executing evidence-based simulations with real-time web research
 * and OpenRouter (google/gemini-2.5-flash).
 */
export async function runDirectSimulation({ simulation, personas = [], authToken = "" }) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch("/api/simulation/run", {
    method: "POST",
    headers,
    body: JSON.stringify({
      simulation,
      personas,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data?.error || "Simulation execution failed.");
  }

  return data.results;
}

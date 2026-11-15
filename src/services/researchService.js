/**
 * Real-time web research service backed by Firecrawl and Spider on the server.
 */
export async function performWebResearch({ queries = [], urls = [], authToken = "" }) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch("/api/research/search", {
    method: "POST",
    headers,
    body: JSON.stringify({
      queries: Array.isArray(queries) ? queries : [queries],
      urls: Array.isArray(urls) ? urls : [],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    throw new Error(data?.error || "Real-time web research request failed.");
  }

  return data;
}

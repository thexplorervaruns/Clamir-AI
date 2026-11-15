import dotenv from "dotenv";

dotenv.config();

const AUTHORITATIVE_DOMAINS = [
  ".gov",
  ".edu",
  ".org",
  "arxiv.org",
  "nature.com",
  "science.org",
  "ieee.org",
  "acm.org",
  "statista.com",
  "pewresearch.org",
  "oecd.org",
  "worldbank.org",
  "bls.gov",
  "census.gov",
  "gartner.com",
  "mckinsey.com",
  "hbr.org",
  "reuters.com",
  "bloomberg.com",
];

function scoreAuthority(url = "") {
  const lower = String(url).toLowerCase();
  for (const dom of AUTHORITATIVE_DOMAINS) {
    if (lower.includes(dom)) return "High (Institutional / Official / Research)";
  }
  return "Standard Web Source";
}

function normalizeUrl(url = "") {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return String(url).trim();
  }
}

/**
 * Search and extract real-time web content via Firecrawl API.
 * Never fakes a response if Firecrawl fails or is unconfigured.
 */
export async function searchWithFirecrawl(query, limit = 5) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey || apiKey.startsWith("{{")) {
    return {
      provider: "Firecrawl",
      configured: false,
      ok: false,
      error: "FIRECRAWL_API_KEY is not configured on the server.",
      sources: [],
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);

    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: String(query).trim(),
        limit,
        scrapeOptions: {
          formats: ["markdown"],
        },
      }),
    });
    clearTimeout(timeout);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        provider: "Firecrawl",
        configured: true,
        ok: false,
        error: data?.error || `Firecrawl HTTP ${response.status}`,
        sources: [],
      };
    }

    const rawItems = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.results)
      ? data.results
      : [];

    const sources = rawItems
      .filter((item) => item && (item.url || item.metadata?.sourceURL))
      .map((item) => {
        const url = item.url || item.metadata?.sourceURL || "";
        const rawText =
          item.markdown ||
          item.content ||
          item.description ||
          item.snippet ||
          "";
        return {
          provider: "Firecrawl",
          title:
            item.title ||
            item.metadata?.title ||
            url,
          url,
          publishedDate:
            item.metadata?.publishedTime ||
            item.metadata?.date ||
            item.publishedDate ||
            null,
          authorityTier: scoreAuthority(url),
          excerpt: String(rawText)
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 1400),
          retrievedAt: new Date().toISOString(),
        };
      });

    return {
      provider: "Firecrawl",
      configured: true,
      ok: true,
      error: null,
      sources,
    };
  } catch (err) {
    return {
      provider: "Firecrawl",
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : "Firecrawl request failed.",
      sources: [],
    };
  }
}

/**
 * Scrape a specific URL with Firecrawl API (/v1/scrape).
 */
export async function scrapeUrlWithFirecrawl(targetUrl) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey || apiKey.startsWith("{{")) {
    return { ok: false, error: "FIRECRAWL_API_KEY is not configured." };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: targetUrl,
        formats: ["markdown"],
      }),
    });
    clearTimeout(timeout);

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.data) {
      return {
        ok: false,
        error: data?.error || `Firecrawl scrape HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      title: data.data?.metadata?.title || targetUrl,
      publishedDate: data.data?.metadata?.publishedTime || null,
      extractedContent: String(data.data?.markdown || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 2500),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Firecrawl scrape failed.",
    };
  }
}

/**
 * Crawl / search via Spider API (https://api.spider.cloud/search and /scrape).
 * Never fakes a response if Spider is unconfigured or unavailable.
 */
export async function searchWithSpider(query, limit = 4) {
  const apiKey = process.env.SPIDER_API_KEY;
  if (!apiKey || apiKey.startsWith("{{")) {
    return {
      provider: "Spider",
      configured: false,
      ok: false,
      error: "SPIDER_API_KEY is not configured in server environment (optional secondary crawler).",
      sources: [],
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch("https://api.spider.cloud/search", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        search: String(query).trim(),
        num: limit,
        fetch_page_content: true,
      }),
    });
    clearTimeout(timeout);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        provider: "Spider",
        configured: true,
        ok: false,
        error: data?.error || `Spider HTTP ${response.status}`,
        sources: [],
      };
    }

    const items = Array.isArray(data?.content)
      ? data.content
      : Array.isArray(data)
      ? data
      : [];

    const sources = items
      .filter((item) => item && item.url)
      .map((item) => ({
        provider: "Spider",
        title: item.title || item.url,
        url: item.url,
        publishedDate: item.date || item.published_at || null,
        authorityTier: scoreAuthority(item.url),
        excerpt: String(item.content || item.description || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 1400),
        retrievedAt: new Date().toISOString(),
      }));

    return {
      provider: "Spider",
      configured: true,
      ok: true,
      error: null,
      sources,
    };
  } catch (err) {
    return {
      provider: "Spider",
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : "Spider request failed.",
      sources: [],
    };
  }
}

/**
 * Performs multi-query real-time web research using Firecrawl and Spider,
 * deduplicates sources, prioritizes authoritative domains, and produces
 * a transparent verification summary.
 */
export async function performRealTimeWebResearch({ queries = [], urlsToScrape = [] }) {
  const cleanQueries = Array.from(
    new Set(
      (Array.isArray(queries) ? queries : [queries])
        .map((q) => String(q || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 3);

  const providerDiagnostics = [];
  const rawSources = [];

  for (const q of cleanQueries) {
    const [fcRes, spRes] = await Promise.all([
      searchWithFirecrawl(q, 4),
      searchWithSpider(q, 3),
    ]);

    providerDiagnostics.push({
      query: q,
      firecrawl: {
        configured: fcRes.configured,
        ok: fcRes.ok,
        count: fcRes.sources.length,
        error: fcRes.error,
      },
      spider: {
        configured: spRes.configured,
        ok: spRes.ok,
        count: spRes.sources.length,
        error: spRes.error,
      },
    });

    rawSources.push(...fcRes.sources, ...spRes.sources);
  }

  // Also scrape any explicit URLs attached by the user via Firecrawl
  for (const targetUrl of (Array.isArray(urlsToScrape) ? urlsToScrape : []).slice(0, 2)) {
    if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
      const scraped = await scrapeUrlWithFirecrawl(targetUrl);
      if (scraped.ok) {
        rawSources.push({
          provider: "Firecrawl Scrape",
          title: scraped.title,
          url: targetUrl,
          publishedDate: scraped.publishedDate,
          authorityTier: scoreAuthority(targetUrl),
          excerpt: scraped.extractedContent,
          retrievedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Deduplicate by normalized URL and remove empty excerpts
  const seenUrls = new Set();
  const dedupedSources = [];
  for (const src of rawSources) {
    const norm = normalizeUrl(src.url);
    if (!norm || seenUrls.has(norm) || !src.excerpt) continue;
    seenUrls.add(norm);
    dedupedSources.push(src);
  }

  // Sort so High Authority (Institutional/Official/Research) sources appear first
  dedupedSources.sort((a, b) => {
    const aHigh = a.authorityTier.startsWith("High") ? 1 : 0;
    const bHigh = b.authorityTier.startsWith("High") ? 1 : 0;
    return bHigh - aHigh;
  });

  const anyServiceSucceeded = providerDiagnostics.some(
    (d) => d.firecrawl.ok || d.spider.ok
  );

  return {
    executedAt: new Date().toISOString(),
    queriesExecuted: cleanQueries,
    anyServiceSucceeded,
    totalSourcesRetrieved: dedupedSources.length,
    highAuthorityCount: dedupedSources.filter((s) =>
      s.authorityTier.startsWith("High")
    ).length,
    sources: dedupedSources.slice(0, 10),
    diagnostics: providerDiagnostics,
  };
}

/**
 * Express / Serverless HTTP handler for POST /api/research/search
 */
export async function handleResearchSearchRequest(req, res) {
  try {
    const { query, queries, urls } = req.body || {};
    const queryList = Array.isArray(queries)
      ? queries
      : query
      ? [query]
      : [];

    if (queryList.length === 0 && (!Array.isArray(urls) || urls.length === 0)) {
      res.status(400).json({
        ok: false,
        error: "At least one search query or URL is required.",
      });
      return;
    }

    const research = await performRealTimeWebResearch({
      queries: queryList,
      urlsToScrape: urls || [],
    });

    res.json({
      ok: true,
      ...research,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : "Web research failed.",
    });
  }
}

export default handleResearchSearchRequest;

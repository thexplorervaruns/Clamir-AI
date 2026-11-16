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
    const timeout = setTimeout(() => controller.abort(), 8000);

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
          onlyMainContent: true,
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
            .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
            .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
            .replace(/#{1,6}\s+/g, "")
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
    const timeout = setTimeout(() => controller.abort(), 7500);
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
        onlyMainContent: true,
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
 * Extracts text content from a public HTTP/HTTPS URL using Firecrawl first
 * and falling back to safe direct HTML fetch if Firecrawl is unconfigured.
 */
export async function extractUrlContentSafely(targetUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(String(targetUrl || "").trim());
  } catch {
    return { ok: false, status: 400, error: "Invalid URL format." };
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { ok: false, status: 400, error: "Only HTTP and HTTPS URLs are permitted." };
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.endsWith(".local") ||
    host === "169.254.169.254"
  ) {
    return {
      ok: false,
      status: 403,
      error: "Access to internal or private network addresses is blocked.",
    };
  }

  const fcScrape = await scrapeUrlWithFirecrawl(parsedUrl.toString());
  if (fcScrape.ok && fcScrape.extractedContent) {
    return {
      ok: true,
      url: parsedUrl.toString(),
      title: fcScrape.title || parsedUrl.hostname,
      extractedContent: fcScrape.extractedContent.slice(0, 2500),
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "ClemirAI-Research-Bot/1.0 (+https://clemir.ai)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        ok: false,
        status: 400,
        error: `Target URL returned HTTP ${res.status}. You can paste its text into a TXT/MD file instead.`,
      };
    }

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : parsedUrl.hostname;
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!stripped) {
      return {
        ok: false,
        status: 400,
        error: "No readable text found on that page. Please copy and upload as TXT/MD.",
      };
    }

    return {
      ok: true,
      url: parsedUrl.toString(),
      title,
      extractedContent: stripped.slice(0, 2500),
    };
  } catch (err) {
    return {
      ok: false,
      status: 400,
      error:
        err instanceof Error && err.name === "AbortError"
          ? "Request timed out fetching the URL."
          : "Could not fetch URL from server. Try pasting its text into a TXT/MD file.",
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
    const timeout = setTimeout(() => controller.abort(), 7000);
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
 * Lightweight HTML/entity stripper for public web fallback extraction.
 */
function stripHtmlEntities(text = "") {
  return String(text || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fallback real-time public web search using DuckDuckGo and Wikipedia APIs
 * so live web research remains functional in any hosted browser/server environment
 * even when paid crawler keys are unconfigured or rate-limited.
 */
export async function searchWithPublicWeb(query, limit = 5) {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) {
    return { provider: "Public Web", ok: false, sources: [], error: "Empty query" };
  }

  const sources = [];

  // 1. DuckDuckGo HTML search + Instant Answer API in parallel
  const ddgHtmlPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ClemirAI-Research/1.0)",
          Accept: "text/html",
        },
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const html = await res.text();

      const extracted = [];
      const resultBlocks = html.split(/class="result__body"/g).slice(1, limit + 2);
      for (const block of resultBlocks) {
        const linkMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
        if (!linkMatch) continue;
        let targetUrl = linkMatch[1] || "";
        const uddgMatch = targetUrl.match(/[?&]uddg=([^&]+)/);
        if (uddgMatch) {
          try {
            targetUrl = decodeURIComponent(uddgMatch[1]);
          } catch {
            // keep original
          }
        }
        if (targetUrl.startsWith("//")) {
          targetUrl = `https:${targetUrl}`;
        }
        if (!/^https?:\/\//i.test(targetUrl)) continue;
        const title = stripHtmlEntities(linkMatch[2]);
        const excerpt = stripHtmlEntities(snippetMatch ? snippetMatch[1] : "");
        if (!title || !excerpt) continue;

        extracted.push({
          provider: "Web Search",
          title,
          url: targetUrl,
          publishedDate: null,
          authorityTier: scoreAuthority(targetUrl),
          excerpt: excerpt.slice(0, 1200),
          retrievedAt: new Date().toISOString(),
        });
      }
      return extracted;
    } catch {
      return [];
    }
  })();

  const wikiPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        cleanQuery
      )}&srlimit=3&format=json&origin=*`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "ClemirAI-Research/1.0" },
      });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const data = await res.json().catch(() => ({}));
      const items = Array.isArray(data?.query?.search) ? data.query.search : [];
      return items
        .map((item) => {
          const title = String(item.title || "").trim();
          const excerpt = stripHtmlEntities(item.snippet || "");
          if (!title || !excerpt) return null;
          const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
            title.replace(/\s+/g, "_")
          )}`;
          return {
            provider: "Wikipedia Reference",
            title: `${title} — Wikipedia`,
            url: articleUrl,
            publishedDate: item.timestamp || null,
            authorityTier: "High (Institutional / Official / Research)",
            excerpt: excerpt.slice(0, 1000),
            retrievedAt: new Date().toISOString(),
          };
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  })();

  const ddgInstantPromise = (async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
        cleanQuery
      )}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return [];
      const data = await res.json().catch(() => ({}));
      const out = [];
      if (data?.AbstractText && data?.AbstractURL) {
        out.push({
          provider: "Web Knowledge Graph",
          title: data.Heading || cleanQuery,
          url: data.AbstractURL,
          publishedDate: null,
          authorityTier: scoreAuthority(data.AbstractURL),
          excerpt: String(data.AbstractText).trim().slice(0, 1200),
          retrievedAt: new Date().toISOString(),
        });
      }
      return out;
    } catch {
      return [];
    }
  })();

  const [ddgHtmlSources, ddgInstantSources, wikiSources] = await Promise.all([
    ddgHtmlPromise,
    ddgInstantPromise,
    wikiPromise,
  ]);

  sources.push(...ddgHtmlSources, ...ddgInstantSources, ...wikiSources);

  return {
    provider: "Public Web",
    configured: true,
    ok: sources.length > 0,
    error: sources.length > 0 ? null : "No public web sources returned for this query.",
    sources: sources.slice(0, limit),
  };
}

/**
 * Performs multi-query real-time web research using Firecrawl, Spider, and automatic
 * public web fallback, deduplicates sources, prioritizes authoritative domains, and produces
 * a transparent verification summary.
 */
export async function performRealTimeWebResearch({
  query,
  queries = [],
  urlsToScrape = [],
  maxResultsPerQuery = 4,
} = {}) {
  const inputQueries = [
    ...(Array.isArray(queries) ? queries : queries ? [queries] : []),
    ...(query ? [query] : []),
  ];

  const cleanQueries = Array.from(
    new Set(
      inputQueries
        .map((q) => String(q || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 3);

  const providerDiagnostics = [];
  const rawSources = [];

  const queryResults = await Promise.all(
    cleanQueries.map(async (q) => {
      const [fcRes, spRes] = await Promise.all([
        searchWithFirecrawl(q, maxResultsPerQuery),
        searchWithSpider(q, Math.min(3, maxResultsPerQuery)),
      ]);

      let publicFallback = null;
      const querySources = [...fcRes.sources, ...spRes.sources];
      if (fcRes.sources.length === 0 && spRes.sources.length === 0) {
        publicFallback = await searchWithPublicWeb(q, maxResultsPerQuery + 1);
        querySources.push(...publicFallback.sources);
      }

      return {
        diag: {
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
          publicWeb: publicFallback
            ? {
                configured: true,
                ok: publicFallback.ok,
                count: publicFallback.sources.length,
                error: publicFallback.error,
              }
            : undefined,
        },
        querySources,
      };
    })
  );

  for (const item of queryResults) {
    providerDiagnostics.push(item.diag);
    rawSources.push(...item.querySources);
  }

  // Also scrape any explicit URLs attached by the user in parallel
  const validUrls = (Array.isArray(urlsToScrape) ? urlsToScrape : [])
    .filter((u) => u && /^https?:\/\//i.test(u))
    .slice(0, 2);

  if (validUrls.length > 0) {
    const scrapedList = await Promise.all(
      validUrls.map(async (targetUrl) => {
        const scraped = await extractUrlContentSafely(targetUrl);
        return scraped.ok
          ? {
              provider: "URL Extract",
              title: scraped.title,
              url: targetUrl,
              publishedDate: null,
              authorityTier: scoreAuthority(targetUrl),
              excerpt: scraped.extractedContent,
              retrievedAt: new Date().toISOString(),
            }
          : null;
      })
    );
    for (const s of scrapedList) {
      if (s) rawSources.push(s);
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

  const anyServiceSucceeded =
    dedupedSources.length > 0 ||
    providerDiagnostics.some((d) => d.firecrawl.ok || d.spider.ok || d.publicWeb?.ok);

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

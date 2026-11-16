export interface WebResearchSource {
  provider: string;
  title: string;
  url: string;
  publishedDate: string | null;
  authorityTier: string;
  excerpt: string;
  retrievedAt: string;
}

export function searchWithFirecrawl(query: string, limit?: number): Promise<{
  provider: string;
  configured: boolean;
  ok: boolean;
  error: string | null;
  sources: WebResearchSource[];
}>;

export function scrapeUrlWithFirecrawl(targetUrl: string): Promise<{
  ok: boolean;
  error?: string;
  title?: string;
  publishedDate?: string | null;
  extractedContent?: string;
}>;

export function searchWithSpider(query: string, limit?: number): Promise<{
  provider: string;
  configured: boolean;
  ok: boolean;
  error: string | null;
  sources: WebResearchSource[];
}>;

export function searchWithPublicWeb(query: string, limit?: number): Promise<{
  provider: string;
  configured?: boolean;
  ok: boolean;
  error: string | null;
  sources: WebResearchSource[];
}>;

export function performRealTimeWebResearch(params?: {
  query?: string;
  queries?: string[];
  urlsToScrape?: string[];
  maxResultsPerQuery?: number;
}): Promise<{
  executedAt: string;
  queriesExecuted: string[];
  anyServiceSucceeded: boolean;
  totalSourcesRetrieved: number;
  highAuthorityCount: number;
  sources: WebResearchSource[];
  diagnostics: Array<{
    query: string;
    firecrawl: {
      configured: boolean;
      ok: boolean;
      count: number;
      error: string | null;
    };
    spider: {
      configured: boolean;
      ok: boolean;
      count: number;
      error: string | null;
    };
    publicWeb?: {
      configured: boolean;
      ok: boolean;
      count: number;
      error: string | null;
    };
  }>;
}>;

export function handleResearchSearchRequest(req: any, res: any): Promise<any>;

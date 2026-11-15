export function performRealTimeWebResearch(params: {
  query?: string;
  queries?: string[];
  maxResultsPerQuery?: number;
}): Promise<{
  queries: string[];
  providersUsed: string[];
  providerErrors: string[];
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
    content: string;
    publishedDate: string | null;
    provider: string;
    credibilityTier: 'official-institutional' | 'research-news' | 'industry-web';
  }>;
  verificationSummary: {
    totalUniqueSources: number;
    authoritativeSourcesCount: number;
    multiSourceConfirmed: boolean;
    gapsIdentified: string[];
    evidenceStatus: 'verified-multi-source' | 'single-source-partial' | 'no-external-sources-found';
  };
  retrievedAt: string;
}>;

export function scrapeUrlWithFirecrawl(url: string): Promise<{
  url: string;
  title: string;
  content: string;
  provider: string;
}>;

export function handleResearchSearchRequest(req: any, res: any): Promise<any>;

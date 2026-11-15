export interface WebResearchSource {
  provider: string;
  title: string;
  url: string;
  publishedDate: string | null;
  authorityTier: string;
  excerpt: string;
  retrievedAt: string;
}

export declare function performWebResearch(params: {
  queries?: string[];
  urls?: string[];
  authToken?: string;
}): Promise<{
  ok: boolean;
  executedAt: string;
  queriesExecuted: string[];
  anyServiceSucceeded: boolean;
  totalSourcesRetrieved: number;
  highAuthorityCount: number;
  sources: WebResearchSource[];
}>;

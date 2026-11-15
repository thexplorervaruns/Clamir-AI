export function callOpenRouterChat(params: {
  messages: Array<{ role: string; content: string }>;
  prompt?: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  responseFormatJson?: boolean;
}): Promise<{
  content: string;
  model: string;
  usage: any;
  raw: any;
}>;

export function handleAiGenerateRequest(req: any, res: any): Promise<any>;

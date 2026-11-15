export function cleanNaturalAssistantText(rawText: string): string;

export function callOpenRouterChat(params: {
  messages?: Array<{ role: string; content: string }>;
  prompt?: string;
  systemInstruction?: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
  responseFormatJson?: boolean;
  cleanText?: boolean;
}): Promise<{
  content: string;
  model: string;
  usage: any;
  raw: any;
}>;

export function generateSmartAssistantResponse(params: {
  userMessage: string;
  history?: Array<{ role: string; content: string }>;
  simulation?: any;
  persona?: any;
  webSources?: Array<any>;
  customNote?: string;
}): Promise<{
  reply: string;
  model: string;
}>;

export function handleAiGenerateRequest(req: any, res: any): Promise<any>;

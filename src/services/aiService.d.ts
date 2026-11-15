export declare function generateAIResponse(params: {
  prompt?: string;
  messages?: { role: string; content: string }[];
  systemInstruction?: string;
  temperature?: number;
  jsonMode?: boolean;
  authToken?: string;
}): Promise<string>;

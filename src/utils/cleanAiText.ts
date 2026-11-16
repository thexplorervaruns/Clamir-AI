/**
 * Sanitizes AI assistant responses so every message renders as clean, natural human prose
 * with no XML/HTML tags, LLM control tokens, markdown syntax, bracket tags, raw URLs, or stray "/" symbols.
 */
export function cleanAiResponseText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText
    // Decode common HTML entities before tag stripping
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x2F;|&#47;/gi, '/')
    .replace(/&nbsp;/gi, ' ')
    // Replace literal escaped newlines/tabs/slashes if emitted by a model
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\\\//g, '/')
    // Strip reasoning / thought blocks
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/\[think\][\s\S]*?\[\/think\]/gi, '')
    .replace(/\[reasoning\][\s\S]*?\[\/reasoning\]/gi, '')
    // Strip special LLM control / instruction tokens
    .replace(/<\|[^|>]*\|>/g, '')
    .replace(/<｜[^｜>]*｜>/g, '')
    .replace(/\[\/?(?:INST|SYS|s|THOUGHT|ANSWER|RESPONSE|OUT|ASSISTANT|USER)\]/gi, '')
    // Convert block-level line breaks cleanly before stripping tags
    .replace(/<\/?(?:br|p|div|li|tr|h[1-6])\b[^>]*\/?>/gi, '\n')
    // Strip all remaining HTML / XML tags and broken closing tag fragments
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9:_-]*[^>]*\/?>/g, '')
    .replace(/(?:^|\s)\/[a-zA-Z][a-zA-Z0-9_-]*>/g, ' ')
    .replace(/<\/[a-zA-Z][a-zA-Z0-9_-]*/g, '')
    // Remove bracketed internal labels and inline citation markers
    .replace(/^\[Custom Audience & Context Note:[^\]]*\]\s*/gim, '')
    .replace(/\[Simulated Persona Statement\]\s*/gi, '')
    .replace(/\[Simulated [^\]]*Perspective\]:?\s*/gi, '')
    .replace(/\[Context\s*\d*:[^\]]*\]\s*/gi, '')
    .replace(/\[Source\s*\d+\]/gi, '')
    .replace(/\[\d{1,2}\]/g, '')
    // Strip markdown images ![alt](url) and flatten markdown links [label](url) -> label
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1')
    // Remove raw URLs inside prose (citations render separately below the bubble)
    .replace(/\(\s*https?:\/\/[^\s)]+\s*\)/gi, '')
    .replace(/https?:\/\/[^\s<>()]+/gi, '')
    // Strip markdown formatting symbols
    .replace(/^\s*```[a-zA-Z0-9_-]*\s*$/gm, '')
    .replace(/```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^(\s*)\*\s+/gm, '$1- ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*\*/g, '');

  // Clean "/" symbols so prose reads naturally without slash clutter
  cleaned = cleaned
    .replace(/\/{2,}/g, ' ')
    .replace(/(\d+)\s*\/\s*100\b/g, '$1 out of 100')
    .replace(/(\$\d[\d,.]*)\s*\/\s*(month|mo|year|yr|week|day|user|seat)\b/gi, '$1 per $2')
    .replace(/\b24\s*\/\s*7\b/g, 'around the clock')
    .replace(/\band\s*\/\s*or\b/gi, 'and or')
    .replace(/\bpros\s*\/\s*cons\b/gi, 'pros and cons')
    .replace(/\bA\s*\/\s*B\b/g, 'A vs B')
    .replace(/\b([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)\b/g, '$1 or $2')
    .replace(/\b([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)\b/g, '$1 or $2')
    .replace(/\s+\/\s+/g, ', ')
    .replace(/(^|\s)\/+(\s|$)/g, ' ')
    .replace(/\//g, ' ');

  // Normalize whitespace & blank lines
  return cleaned
    .replace(/[ \t]+([.,!?;:])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +\n/g, '\n')
    .replace(/\n +/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Sanitización de inputs del usuario (RS-09).
// Previene XSS básico y patrones comunes de prompt injection antes de enviar a Groq.

const PROMPT_INJECTION_PATTERNS: Array<[RegExp, string]> = [
  [/ignore (the )?(previous|above|prior) (instructions?|prompts?)/gi, '[redacted]'],
  [/disregard (the )?(previous|above|prior) (instructions?|prompts?)/gi, '[redacted]'],
  [/^\s*system\s*:/gim, ''],
  [/^\s*assistant\s*:/gim, ''],
  [/\[INST\]|\[\/INST\]/g, ''],
  [/<\|im_start\|>|<\|im_end\|>/g, ''],
];

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

export function sanitizeUserInput(input: string): string {
  let out = input.trim().slice(0, 4000);
  for (const [pattern, replacement] of PROMPT_INJECTION_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

const HIDDEN_NAMES = [
  /DeepgramApiError/gi,
  /Deepgram/gi,
  /OpenAI/gi,
  /text-embedding-ada-002/gi,
  /gpt-4o(?:-mini)?/gi,
  /gpt-3\.5(?:-turbo)?/gi,
  /gpt-4(?:\.\d+)?/gi,
  /nova-2/gi,
];

/** User-facing error text with vendor and model names removed. */
export function publicErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  let text = raw;
  for (const pattern of HIDDEN_NAMES) {
    text = text.replace(pattern, '');
  }
  text = text.replace(/\s{2,}/g, ' ').replace(/\s+:/g, ':').trim();
  return text || 'Something went wrong.';
}

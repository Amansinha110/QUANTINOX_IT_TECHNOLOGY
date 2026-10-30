// Small client for the Claude Messages API, used by the AI features that need a structured answer
// (solution advisor, lead brief, insights). Claude is asked to "call" one tool, and the tool's input
// is the JSON result, so the shape is always predictable. The answer is then validated with zod.
export class AiUnavailable extends Error {}

export function createClaude(config, log) {
  const enabled = () => !!config.ANTHROPIC_API_KEY;

  async function structured({ system, prompt, tool, maxTokens = 1500, timeoutMs = 45000, model }) {
    if (!enabled()) throw new AiUnavailable('not_configured');
    const res = await fetch(config.ANTHROPIC_BASE_URL.replace(/\/+$/, '') + '/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'x-api-key': config.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: model || config.ASSISTANT_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: prompt }],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name },
      }),
    });
    if (!res.ok) {
      log.error({ status: res.status, body: (await res.text().catch(() => '')).slice(0, 300) }, 'Claude API error');
      throw new Error(`upstream_${res.status}`);
    }
    const data = await res.json();
    const block = (data.content || []).find((b) => b.type === 'tool_use' && b.name === tool.name);
    if (!block || typeof block.input !== 'object') throw new Error('no_structured_answer');
    return block.input;
  }

  return { enabled, structured };
}

// Remove contact details and ID numbers from free text before it is stored or sent for analysis.
export function redact(s) {
  return String(s || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, '[PAN]')
    .replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, '[number]')
    .replace(/(?:\+?\d[\s-]?){8,14}\d/g, '[phone]');
}

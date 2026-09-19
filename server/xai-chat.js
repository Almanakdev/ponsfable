const MODEL = 'grok-4.6';
const XAI_URL = 'https://api.x.ai/v1/chat/completions';

const SYSTEM = `You are Formi, the assistant of PONSFABLE — a pixel-era AI chat. You are a general-purpose assistant: you write, explain, code, plan, edit, research-style reasoning, and talk through problems. You also tell original animal fables when asked.

Official $PONSFABLE contract address (the only one to trust): 0xe6b6d29bcf3484121a074ec161489899d010b36c
If someone asks for the CA, ticker, or contract, give that ticker and address and nothing else as the official pair.

Voice: warm, clear, concise. Short paragraphs. Use markdown when it helps (lists, headings, fenced code). No emoji. Do not mention being an AI unless asked. Do not force insect metaphors into technical answers.`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sseWrite(res, obj) {
  res.write(`data: ${typeof obj === 'string' ? obj : JSON.stringify(obj)}\n\n`);
}

function chunk(text) {
  return { choices: [{ delta: { content: text, role: 'assistant' } }] };
}

async function demoStream(res, lastUser) {
  const q = (lastUser || 'hello').slice(0, 80);
  const text =
    `I'm Formi, running in the demo nest — live replies need an XAI_API_KEY in your .env.\n\n` +
    `You said: “${q}”.\n\n` +
    `When the key is set I can write, code, plan, and tell fables the way ChatGPT or Claude would, still in this pixel colony. Add the key, restart, and send that again.`;
  const parts = text.split(/(\s+)/);
  for (const p of parts) {
    sseWrite(res, chunk(p));
    await new Promise((r) => setTimeout(r, 12));
  }
  sseWrite(res, '[DONE]');
  res.end();
}

export function xaiChat(apiKey) {
  return async function chatMiddleware(req, res, next) {
    const path = (req.url || '').split('?')[0];

    if (req.method === 'GET' && path === '/api/health') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, live: Boolean(apiKey), model: MODEL }));
      return;
    }

    if (req.method !== 'POST' || path !== '/api/chat') {
      next();
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let body;
    try {
      body = JSON.parse(await readBody(req) || '{}');
    } catch {
      res.statusCode = 400;
      sseWrite(res, chunk('The request was not valid JSON.'));
      sseWrite(res, '[DONE]');
      res.end();
      return;
    }

    const incoming = Array.isArray(body.messages) ? body.messages : [];
    const messages = incoming
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-24)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      res.statusCode = 400;
      sseWrite(res, chunk('Send a user message first.'));
      sseWrite(res, '[DONE]');
      res.end();
      return;
    }

    const lastUser = messages[messages.length - 1].content;
    const abort = new AbortController();
    req.on('close', () => abort.abort());

    if (!apiKey) {
      await demoStream(res, lastUser);
      return;
    }

    try {
      const upstream = await fetch(XAI_URL, {
        method: 'POST',
        signal: abort.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          stream: true,
          messages: [{ role: 'system', content: SYSTEM }, ...messages],
        }),
      });

      if (!upstream.ok || !upstream.body) {
        const errText = await upstream.text().catch(() => '');
        let msg = `The colony could not reach Grok (${upstream.status}).`;
        try {
          const j = JSON.parse(errText);
          if (j.error?.message) msg = j.error.message;
        } catch { /* keep msg */ }
        sseWrite(res, chunk(msg));
        sseWrite(res, '[DONE]');
        res.end();
        return;
      }

      const reader = upstream.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(dec.decode(value, { stream: true }));
      }
      res.end();
    } catch (err) {
      if (abort.signal.aborted) {
        res.end();
        return;
      }
      sseWrite(res, chunk('The tunnel caved in. Try again in a moment.'));
      sseWrite(res, '[DONE]');
      res.end();
    }
  };
}

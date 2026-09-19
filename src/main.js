(() => {
'use strict';

const KEY = 'ponsfable.chats.v1';
const CA = '0xe6b6d29bcf3484121a074ec161489899d010b36c';
const CA_SHORT = CA.slice(0, 6) + '…' + CA.slice(-4);
const STARTERS = [
  ['Write', 'Draft a calm email declining a meeting.'],
  ['Code', 'Explain this bug: sort mutates the array in place.'],
  ['Plan', 'Make a 3-day weekend plan for a rainy city.'],
  ['Fable', 'Tell a short ant fable about not chasing every pump.'],
];

const $ = (id) => document.getElementById(id);
const clock = $('clock');
const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false }); };
tick(); setInterval(tick, 1000);

function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 40))); } catch { /* quota */ } }
function titleFrom(text) {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > 36 ? t.slice(0, 35) + '…' : (t || 'New chat');
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function md(src) {
  const raw = String(src || '');
  const fences = [];
  let text = raw.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    fences.push(`<pre><code class="lang-${esc(lang)}">${esc(code.replace(/\n$/, ''))}</code></pre>`);
    return `\u0000F${fences.length - 1}\u0000`;
  });
  text = esc(text);
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/^\- (.+)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  text = text.split(/\n{2,}/).map((block) => {
    if (/^\s*</.test(block)) return block;
    return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
  }).join('');
  return text.replace(/\u0000F(\d+)\u0000/g, (_, i) => fences[+i]);
}

let chats = load();
let currentId = chats[0]?.id || null;
let live = false;
let ctl = null;

async function copyCa(btn) {
  try {
    await navigator.clipboard.writeText(CA);
    if (btn) {
      const was = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = was; }, 1400);
    }
  } catch { if (btn) btn.textContent = 'Blocked'; }
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-copy-ca]');
  if (btn) copyCa(btn);
});
const caShort = $('caShort');
if (caShort) caShort.textContent = CA_SHORT;
const railCa = $('railCa');
if (railCa) railCa.textContent = CA;

const thread = $('thread');
const listEl = $('chatList');
const prompt = $('prompt');
const sendBtn = $('sendBtn');
const stopBtn = $('stopBtn');
const demoBanner = $('demoBanner');
const barStatus = $('barStatus');
const rail = $('rail');
const scrim = $('scrim');

function current() { return chats.find((c) => c.id === currentId) || null; }

function setBusy(on) {
  sendBtn.hidden = on;
  stopBtn.hidden = !on;
  prompt.disabled = on;
  barStatus.textContent = on ? 'Digging…' : (live ? 'Live' : 'Demo');
}

function resizePrompt() {
  prompt.style.height = 'auto';
  prompt.style.height = Math.min(prompt.scrollHeight, 180) + 'px';
}

function closeRail() {
  rail.classList.remove('is-open');
  scrim.hidden = true;
}

function renderList() {
  listEl.replaceChildren();
  if (!chats.length) {
    const p = document.createElement('div');
    p.className = 'rail-empty';
    p.textContent = 'No chats yet.';
    listEl.append(p);
    return;
  }
  chats.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rail-item' + (c.id === currentId ? ' is-on' : '');
    const t = document.createElement('span');
    t.textContent = c.title || 'New chat';
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'x';
    x.setAttribute('aria-label', 'Delete chat');
    x.textContent = '×';
    x.onclick = (e) => { e.stopPropagation(); removeChat(c.id); };
    b.append(t, x);
    b.onclick = () => { openChat(c.id); closeRail(); };
    listEl.append(b);
  });
}

function emptyState() {
  const wrap = document.createElement('div');
  wrap.className = 'thread-inner empty';
  const img = document.createElement('img');
  img.className = 'px';
  img.src = '/logo.png';
  img.width = 88; img.height = 88;
  img.alt = '';
  const h = document.createElement('h1');
  h.textContent = 'What shall we dig up?';
  const p = document.createElement('p');
  p.textContent = 'Ask Formi anything — write, code, plan, or tell a fable. Same kind of chat as Claude or ChatGPT, in a pixel nest.';
  const ca = document.createElement('div');
  ca.className = 'hero-ca';
  ca.innerHTML =
    '<span class="hero-ca__k">Contract address · $PONSFABLE</span>' +
    '<code class="hero-ca__v">' + CA + '</code>' +
    '<button class="btn btn--honey" type="button" data-copy-ca>Copy CA</button>';
  const grid = document.createElement('div');
  grid.className = 'starters';
  STARTERS.forEach(([k, v]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'starter';
    const lab = document.createElement('b'); lab.textContent = k;
    const tx = document.createElement('span'); tx.textContent = v;
    b.append(lab, tx);
    b.onclick = () => send(v);
    grid.append(b);
  });
  wrap.append(img, h, p, ca, grid);
  thread.replaceChildren(wrap);
}

function renderThread() {
  const chat = current();
  if (!chat || !chat.messages.length) { emptyState(); return; }
  const inner = document.createElement('div');
  inner.className = 'thread-inner';
  chat.messages.forEach((m, i) => inner.append(msgEl(m, i === chat.messages.length - 1)));
  thread.replaceChildren(inner);
  thread.scrollTop = thread.scrollHeight;
}

function msgEl(m, last) {
  const row = document.createElement('article');
  row.className = 'msg msg--' + (m.role === 'user' ? 'user' : 'ai');
  if (m.role !== 'user') {
    const av = document.createElement('img');
    av.className = 'px msg__av';
    av.src = '/logo.png';
    av.alt = '';
    row.append(av);
  }
  const col = document.createElement('div');
  const who = document.createElement('div');
  who.className = 'msg__who';
  who.textContent = m.role === 'user' ? 'You' : 'Formi';
  const body = document.createElement('div');
  body.className = 'msg__body';
  body.innerHTML = m.role === 'user' ? '<p>' + esc(m.content).replace(/\n/g, '<br>') + '</p>' : md(m.content);
  col.append(who, body);
  if (m.role !== 'user' && m.content && last) {
    const tools = document.createElement('div');
    tools.className = 'msg__tools';
    const copy = document.createElement('button');
    copy.type = 'button'; copy.textContent = 'Copy';
    copy.onclick = async () => {
      try { await navigator.clipboard.writeText(m.content); copy.textContent = 'Copied'; setTimeout(() => copy.textContent = 'Copy', 1200); }
      catch { copy.textContent = 'Blocked'; }
    };
    tools.append(copy);
    col.append(tools);
  }
  row.append(col);
  return row;
}

function persist() {
  chats.sort((a, b) => (b.updated || 0) - (a.updated || 0));
  save(chats);
  renderList();
}

function newChat() {
  currentId = null;
  renderList();
  emptyState();
  prompt.focus();
  closeRail();
}

function openChat(id) {
  currentId = id;
  renderList();
  renderThread();
}

function removeChat(id) {
  chats = chats.filter((c) => c.id !== id);
  if (currentId === id) currentId = chats[0]?.id || null;
  persist();
  if (currentId) renderThread(); else emptyState();
}

async function send(text) {
  const content = (text ?? prompt.value).trim();
  if (!content || ctl) return;
  prompt.value = '';
  resizePrompt();

  let chat = current();
  if (!chat) {
    chat = { id: uid(), title: titleFrom(content), updated: Date.now(), messages: [] };
    chats.unshift(chat);
    currentId = chat.id;
  }
  chat.messages.push({ role: 'user', content });
  chat.title = chat.title && chat.title !== 'New chat' ? chat.title : titleFrom(content);
  chat.updated = Date.now();
  const assistant = { role: 'assistant', content: '' };
  chat.messages.push(assistant);
  persist();
  renderThread();

  const inner = thread.querySelector('.thread-inner');
  const last = inner && inner.lastElementChild;
  if (last) last.classList.add('is-busy');
  const body = last && last.querySelector('.msg__body');

  ctl = new AbortController();
  setBusy(true);
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctl.signal,
      body: JSON.stringify({
        messages: chat.messages.filter((m) => m.role === 'user' || m.content).map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok || !res.body) throw new Error('bad');
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const t = line.trim();
        if (!t.startsWith('data:')) continue;
        const data = t.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          const d = j.choices?.[0]?.delta?.content;
          if (d) {
            assistant.content += d;
            if (body) body.innerHTML = md(assistant.content);
            thread.scrollTop = thread.scrollHeight;
          }
        } catch { /* keep streaming */ }
      }
    }
    if (!assistant.content) assistant.content = 'The tunnel went quiet. Try again.';
  } catch (err) {
    if (err && err.name === 'AbortError') {
      if (!assistant.content) assistant.content = 'Stopped.';
    } else {
      assistant.content = assistant.content || 'The tunnel caved in. Check that the nest is running, then try again.';
    }
  } finally {
    ctl = null;
    setBusy(false);
    chat.updated = Date.now();
    persist();
    renderThread();
    prompt.focus();
  }
}

$('composer').addEventListener('submit', (e) => { e.preventDefault(); send(); });
$('newChat').onclick = newChat;
$('stopBtn').onclick = () => ctl && ctl.abort();
$('menuBtn').onclick = () => {
  const open = !rail.classList.contains('is-open');
  rail.classList.toggle('is-open', open);
  scrim.hidden = !open;
};
scrim.onclick = closeRail;
prompt.addEventListener('input', resizePrompt);
prompt.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

fetch('/api/health').then((r) => r.json()).then((h) => {
  live = !!h.live;
  demoBanner.hidden = live;
  barStatus.textContent = live ? 'Live' : 'Demo';
}).catch(() => {
  live = false;
  demoBanner.hidden = false;
  barStatus.textContent = 'Offline';
});

renderList();
if (current()) renderThread(); else emptyState();
prompt.focus();
})();

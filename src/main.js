(() => {
'use strict';

/* ================= config ================= */
const TOKEN = { ticker:'$FABLE', ca:'', launchpadUrl:'', chartUrl:'' }; // fill at launch

/* ================= pixel sprites ================= */
const PAL = {
  k:'#120b07', b:'#b8412c', h:'#e8704f', e:'#fff4dc', p:'#120b07', c:'#f0bf4c',
  l:'#86b24f', g:'#4f7a2a', w:'#f2e4c4', s:'#6b4e37', y:'#ffd873', n:'#3a2a20'
};
const FORMI = [
"...k........k...",
"....k......k....",
".....k....k.....",
"....kkkkkkkk....",
"...kbbbbbbbbk...",
"..kbheebbeebbk..",
"..kbhepbbepbbk..",
"..kbbbbbbbbbbk..",
"..kbcbbkkbbcbk..",
"...kbbbbbbbbk...",
"....kkkkkkkk....",
"..k..kbbbbk..k..",
"...kkbhbbbbkk...",
"..k..kbbbbk..k..",
"....k.kkkk.k....",
"...k........k..."];
const FORMI_BLINK = FORMI.map((r,i)=> (i===5||i===6) ? (i===5?"..kbhbbbbbbbbk..":"..kbhkkbbkkbbk..") : r);
function overlay(base, patches){ const g = base.map(r=>r.split('')); for(const [x,y,c] of patches) if(g[y]) g[y][x]=c; return g.map(r=>r.join('')); }
const SPRITES = {
  formi: FORMI,
  scout: overlay(FORMI, [[1,0,'y'],[14,0,'y'],[0,0,'y'],[15,0,'y']]),          // glowing antennae
  weaver: overlay(FORMI, [[14,11,'w'],[15,10,'w'],[15,12,'s'],[14,12,'w'],[15,11,'w']]), // holds a scroll
  elder: overlay(FORMI, [[4,3,'w'],[5,3,'w'],[6,3,'w'],[7,3,'w'],[8,3,'w'],[9,3,'w'],[10,3,'w'],[11,3,'w'],[4,8,'w'],[11,8,'w'],[5,9,'w'],[10,9,'w']]), // white brows/beard
  keeper: overlay(FORMI, [[0,11,'l'],[1,11,'l'],[0,12,'g'],[1,12,'l'],[0,13,'l'],[1,13,'g']]) // holds a leaf-book
};
function paint(canvas, rows){
  const x = canvas.getContext('2d'); x.clearRect(0,0,canvas.width,canvas.height);
  const ox = Math.floor((canvas.width-16)/2), oy = Math.floor((canvas.height-16)/2);
  rows.forEach((r,y)=>{ for(let i=0;i<r.length;i++){ const c=r[i]; if(c!=='.'){ x.fillStyle=PAL[c]; x.fillRect(ox+i,oy+y,1,1);} } });
}
document.querySelectorAll('canvas[data-sprite]').forEach(c=>paint(c, SPRITES[c.dataset.sprite]||FORMI));
const buddyPx = document.getElementById('buddyPx');
paint(buddyPx, FORMI);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduce){
  setInterval(()=>{ paint(buddyPx, FORMI_BLINK); setTimeout(()=>paint(buddyPx, FORMI),160); }, 3800);
}

/* ================= clock ================= */
const clock = document.getElementById('clock');
const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-GB',{hour12:false}); };
tick(); setInterval(tick, 1000);
document.getElementById('year').textContent = new Date().getFullYear();

/* ================= anthill hero canvas ================= */
(function hill(){
  const cv = document.getElementById('hill'), ctx = cv.getContext('2d');
  const C = 4, W = cv.width/C, H = cv.height/C; // 160 x 110 cells
  const ground = 22;
  // seeded rng
  let seed = 7; const rnd = () => (seed = (seed*16807) % 2147483647) / 2147483647;
  const grid = []; // 0 soil,1 tunnel,2 sky,3 grass
  for(let y=0;y<H;y++){ grid.push(new Array(W).fill(y<ground?2:0)); }
  // mound
  for(let x=0;x<W;x++){
    const d = Math.abs(x-80); const mh = Math.max(0, Math.round(12 - d*d/70));
    for(let y=ground-mh;y<ground;y++) grid[y][x]=0;
  }
  const carve = (x,y,r) => { for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++){ const X=x+i,Y=y+j; if(X>=0&&X<W&&Y>=0&&Y<H&&grid[Y][X]!==2 && i*i+j*j<=r*r+1) grid[Y][X]=1; } };
  const paths = [
    [[80,11],[80,24],[70,34],[52,40],[36,50],[30,62]],
    [[80,24],[94,36],[112,42],[126,54],[132,66]],
    [[70,34],[66,52],[74,68],[70,84],[58,94]],
    [[94,36],[98,58],[108,76],[122,88]],
    [[36,50],[20,58],[12,76],[22,94]]
  ];
  const chambers = [[30,64,9,5,'scroll'],[132,68,10,5,'egg'],[58,96,11,5,'honey'],[122,90,9,5,'scroll'],[22,96,8,4,'egg'],[74,68,7,4,null]];
  const lerpPath = [];
  for(const p of paths){
    const pts=[];
    for(let k=0;k<p.length-1;k++){
      const [x0,y0]=p[k],[x1,y1]=p[k+1]; const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));
      for(let s=0;s<=n;s++){ const x=Math.round(x0+(x1-x0)*s/n), y=Math.round(y0+(y1-y0)*s/n); carve(x,y,2); pts.push([x,y]); }
    }
    lerpPath.push(pts);
  }
  for(const [cx,cy,rx,ry] of chambers){
    for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++){ if((x*x)/(rx*rx)+(y*y)/(ry*ry)<=1){ const X=cx+x,Y=cy+y; if(Y>=0&&Y<H&&X>=0&&X<W) grid[Y][X]=1; } }
  }
  // static layer
  const bg = document.createElement('canvas'); bg.width=cv.width; bg.height=cv.height;
  const b = bg.getContext('2d');
  const soilCols=['#3a2618','#442d1c','#33211a','#4a3120'];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const v=grid[y][x]; let col;
    if(v===2){ col = y<8?'#20161b':(y<15?'#2a1d1f':'#352422'); if(rnd()<.006) col='#f2e4c4'; }
    else if(v===1){ col = rnd()<.08?'#1a100b':'#140d09'; }
    else { const depth=y/H; col = soilCols[Math.floor(rnd()*soilCols.length)]; if(depth>.6&&rnd()<.35) col='#2c1d15'; if(rnd()<.015) col='#6b4e37'; }
    b.fillStyle=col; b.fillRect(x*C,y*C,C,C);
  }
  // grass tufts on surface
  for(let x=0;x<W;x++){
    let top=0; while(top<H && grid[top][x]===2) top++;
    if(grid[top] && grid[top][x]===0){
      b.fillStyle = rnd()<.5?'#86b24f':'#6d9a3c'; b.fillRect(x*C,top*C,C,C);
      if(rnd()<.35){ b.fillStyle='#86b24f'; b.fillRect(x*C,(top-1)*C,C,C); }
      if(rnd()<.08){ b.fillStyle='#a4cf62'; b.fillRect(x*C,(top-2)*C,C,C); }
    }
  }
  // moon
  b.fillStyle='#f2e4c4'; for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++) if(x*x+y*y<=10) b.fillRect((140+x)*C,(6+y)*C,C,C);
  b.fillStyle='#352422'; for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++) if((x-2)*(x-2)+y*y<=8) b.fillRect((140+x)*C,(6+y)*C,C,C);
  // chamber props
  const block=(x,y,w,h,c)=>{b.fillStyle=c;b.fillRect(x*C,y*C,w*C,h*C);};
  for(const [cx,cy,rx,ry,kind] of chambers){
    const fy = cy+ry-1;
    if(kind==='scroll'){ block(cx-3,fy-2,6,3,'#f2e4c4'); block(cx-4,fy-2,1,3,'#b8683a'); block(cx+3,fy-2,1,3,'#b8683a'); block(cx-2,fy-1,4,1,'#6b4e37'); }
    if(kind==='egg'){ for(let i=-2;i<=2;i+=2){ block(cx+i*2-1,fy-2,2,3,'#f2e4c4'); block(cx+i*2-1,fy-2,1,1,'#fffaf0'); } }
    if(kind==='honey'){ for(let i=-3;i<=3;i+=3){ block(cx+i-1,fy-2,3,3,'#f0bf4c'); block(cx+i-1,fy-2,1,1,'#ffd873'); } }
  }
  // ants
  const ants=[];
  lerpPath.forEach((pts,pi)=>{ const n = pi===0?3:2; for(let i=0;i<n;i++) ants.push({pi, t:Math.floor(rnd()*pts.length), dir: rnd()<.5?1:-1, speed:.35+rnd()*.35, carry: rnd()<.55}); });
  document.getElementById('antCount').textContent = ants.filter(a=>a.carry).length;
  function drawAnt(x,y,dir,frame,carry){
    const px=(dx,dy,c)=>{ ctx.fillStyle=c; ctx.fillRect((x+dx*dir)*C - (dir<0?C:0),(y+dy)*C,C,C); };
    // body centered at x,y; faces dir
    px(-3,0,'#b8412c');px(-2,0,'#b8412c');px(-3,-1,'#b8412c');px(-2,-1,'#8e2f1f');
    px(-1,0,'#8e2f1f'); px(0,0,'#b8412c'); px(1,0,'#8e2f1f');
    px(2,0,'#b8412c'); px(2,-1,'#e8704f'); px(3,-1,'#120b07');px(4,-2,'#120b07');
    const legs = frame? [-2,0,2] : [-3,-1,1];
    legs.forEach(l=>px(l,1,'#120b07'));
    if(carry){ px(1,-2,'#f2e4c4');px(0,-2,'#f2e4c4');px(-1,-2,'#f2e4c4');px(-2,-2,'#b8683a');px(2,-2,'#b8683a'); }
  }
  let f=0;
  function frame(){
    ctx.drawImage(bg,0,0);
    f++;
    for(const a of ants){
      const pts=lerpPath[a.pi];
      a.t += a.dir*a.speed;
      if(a.t>=pts.length-1){ a.t=pts.length-1; a.dir=-1; a.carry=!a.carry; }
      if(a.t<=0){ a.t=0; a.dir=1; a.carry=!a.carry; }
      const i=Math.floor(a.t), p=pts[i], q=pts[Math.min(i+1,pts.length-1)];
      const facing = (q[0]-p[0])*a.dir; const d = facing<0?-1:1;
      drawAnt(p[0],p[1],d,(f>>3)&1,a.carry);
    }
    if(!reduce) requestAnimationFrame(frame);
  }
  frame();
})();

/* ================= story engine ================= */
const MORALS = ["Patience fills the pantry","Share the harvest","Don't chase every pump","Honesty over hype","Small steps build big hills","Listen to the quiet ones"];
let moral = MORALS[2], len = 'short';
const moralsEl = document.getElementById('morals');
MORALS.forEach(m=>{ const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=m; b.setAttribute('aria-pressed', String(m===moral)); b.onclick=()=>{ moral=m; [...moralsEl.children].forEach(c=>c.setAttribute('aria-pressed', String(c===b))); }; moralsEl.append(b); });
document.getElementById('lenSeg').addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b) return; len=b.dataset.v; [...e.currentTarget.children].forEach(c=>c.setAttribute('aria-pressed', String(c===b))); });
document.getElementById('diceBtn').onclick = () => {
  const pick = sel => { sel.selectedIndex = Math.floor(Math.random()*sel.options.length); };
  pick(document.getElementById('hero')); pick(document.getElementById('place'));
  document.getElementById('custom').value='';
  const btns=[...moralsEl.children]; btns[Math.floor(Math.random()*btns.length)].click();
};

const SAMPLE = {
  title:"The Cricket Who Read the Tape",
  seeds:"Hero: cricket · Moral: don't chase every pump",
  chapters:[
    "Under the picnic table, where sugar grains traded hands all day, lived a cricket named Tik who watched the tape. Every hour he chirped the prices: crumb up, seed down, sugar flying.\n\nOne morning the whole market buzzed. \"Honeydew is doubling!\" shouted a beetle. \"Buy before noon!\" Tik felt his legs twitch. He had three winter seeds saved — everything he owned.\n\nOld Formi the ant was hauling a crumb past his stall. She did not stop to look at the board. \"The board moves fast,\" she said. \"Seeds grow slow.\""
  ],
  moral:"Don't chase every pump — the pantry is filled one seed at a time.",
  choices:["Tik trades all three seeds for honeydew","Tik follows Formi down into the tunnels","Tik chirps a warning to the whole market"]
};

const $ = id => document.getElementById(id);
const taleEl=$('tale'), titleEl=$('taleTitle'), textEl=$('taleText'), moralBox=$('taleMoral'), moralTxt=$('moralText'),
      choicesEl=$('choices'), statusEl=$('status'), tagEl=$('taleTag'), seedsEl=$('taleSeeds'),
      goBtn=$('goBtn'), stopBtn=$('stopBtn'), saveBtn=$('saveBtn'), copyBtn=$('copyBtn'), endBtn=$('endBtn');

let story = null;   // {title, seeds, chapters:[], moral, choices:[], turns:[], ended}
let ctl = null, sampleFn = null, sampleState = 'pending';

function renderStory(s, liveText){
  titleEl.textContent = s.title || 'Untitled fable';
  seedsEl.textContent = s.seeds || '';
  textEl.replaceChildren();
  const all = liveText != null ? [...s.chapters, liveText] : s.chapters;
  all.forEach((ch,i)=>{
    if(all.length>1){ const h=document.createElement('span'); h.className='chap'; h.textContent = 'Chapter '+(i+1)+(s.picks&&s.picks[i-1]?' · '+s.picks[i-1]:''); textEl.append(h); }
    ch.split(/\n{2,}/).forEach(par=>{ if(par.trim()){ const p=document.createElement('p'); p.textContent=par.trim(); textEl.append(p);} });
  });
  moralBox.hidden = !s.moral; moralTxt.textContent = s.moral || '';
  choicesEl.replaceChildren();
  if(liveText==null && !s.ended){
    (s.choices||[]).forEach((c,i)=>{
      const b=document.createElement('button'); b.type='button'; b.className='choice';
      const tagB=document.createElement('b'); tagB.textContent = 'Path '+'ABC'[i]; const t=document.createElement('span'); t.textContent=c;
      b.append(tagB,t); b.onclick=()=>continueStory(c); b.disabled = !sampleFn;
      choicesEl.append(b);
    });
  }
}
const SAMPLE_STORY = {...SAMPLE, turns:[], picks:[], sample:true};

function setStatus(kind, msg){
  statusEl.replaceChildren();
  if(kind==='busy'){ const d=document.createElement('span'); d.className='digging'; d.innerHTML='<i></i><i></i><i></i>'; statusEl.append(d); }
  if(msg){ const s=document.createElement('span'); s.textContent=msg; if(kind==='bad') s.className='note-bad'; statusEl.append(s); }
}

function parseOut(text){
  const get = (re) => { const m = text.match(re); return m ? m[1].trim() : ''; };
  const title = get(/TITLE:\s*(.+)/i);
  let body = text;
  const si = text.search(/STORY:/i);
  if(si>=0) body = text.slice(si+6);
  const mi = body.search(/\n\s*MORAL:/i); const ci = body.search(/\n\s*CHOICE\s*1:/i);
  const cut = [mi,ci].filter(v=>v>=0); if(cut.length) body = body.slice(0, Math.min(...cut));
  if(si<0) body = ''; // still writing the title
  const moral = get(/MORAL:\s*(.+)/i);
  const choices = [1,2,3].map(n=>get(new RegExp('CHOICE\\s*'+n+':\\s*(.+)','i'))).filter(Boolean);
  return { title, body: body.trim(), moral, choices };
}

const RULES = (seeds, final) => `You are Formi, the storyteller ant of the PONSFABLE colony. You write short, original animal fables in the spirit of Aesop: warm, simple, vivid, a little funny, suitable for all ages. Small creatures, concrete details from the insect world (crumbs, dew, tunnels, seeds, leaves). Never mention being an AI. No markdown, no emoji.

Story seeds:
- Hero: ${seeds.hero}
- Setting: ${seeds.place}
- Moral to build toward: ${seeds.moral}
- Chapter length: ${seeds.len==='long' ? '260-340 words' : '130-180 words'}, 2-4 short paragraphs separated by blank lines.

Reply in EXACTLY this plain-text format and nothing else:
TITLE: <fable title, max 7 words — keep the same title in later chapters>
STORY:
<the chapter>
MORAL: <one sentence moral${final ? '' : ' (the moral the story is heading toward)'}>
${final ? 'This is the FINAL chapter: resolve the story fully and do not write any CHOICE lines.' : 'CHOICE 1: <a short next-step option, max 10 words>\nCHOICE 2: <a different option>\nCHOICE 3: <a surprising option>\nEnd the chapter at a moment of decision so the choices make sense.'}`;

async function run(turns, onDone){
  ctl = new AbortController();
  goBtn.disabled = true; stopBtn.hidden = false; saveBtn.disabled = true; endBtn.hidden = true;
  [...choicesEl.children].forEach(b=>b.disabled=true);
  setStatus('busy','Formi is digging for the story…');
  tagEl.textContent='Writing'; tagEl.className='tag tag--live';
  try{
    const { text, truncated } = await sampleFn(turns, {
      cache:false, signal: ctl.signal,
      onText: ({text}) => { setStatus('busy','Formi is writing…'); const o=parseOut(text); onDone(o, text, true); }
    });
    const o = parseOut(text); onDone(o, text, false);
    setStatus('', truncated ? 'The chapter was cut short — try Short length.' : '');
  }catch(e){
    const code = e && e.code;
    if(code==='cancelled'){ setStatus('', 'Stopped.'); if(e.text){ onDone(parseOut(e.text), e.text, false); } else renderStory(story); }
    else if(code==='not_granted' || code==='sampling_disabled' || code==='not_declared' || code==='capability_disabled'){
      disableLive('Live tales are off for this view. Enjoy the sample and the Fable Book.');
      renderStory(story || SAMPLE_STORY);
    }
    else if(code==='rate_limited'){ setStatus('bad','The colony is busy — try again in a minute.'); renderStory(story); }
    else if(code==='session_expired'){ setStatus('bad','Sign in to Claude again, then retry.'); renderStory(story); }
    else if(code==='refused'){ setStatus('bad','Formi won\'t tell that one. Try different seeds.'); renderStory(story); }
    else { setStatus('bad','The tunnel caved in. Press the button to try again.'); if(e&&e.text) onDone(parseOut(e.text), e.text, false); else renderStory(story); }
  }finally{
    goBtn.disabled = !sampleFn; stopBtn.hidden = true; saveBtn.disabled = false;
    tagEl.textContent = story && story.ended ? 'Finished tale' : 'Your tale'; tagEl.className='tag tag--live';
    if(story && !story.ended && story.chapters.length>=1 && sampleFn) endBtn.hidden = false;
  }
}

function seedsNow(){
  const custom = $('custom').value.trim();
  return { hero: custom || $('hero').value, place: $('place').value, moral, len };
}

function startStory(){
  if(!sampleFn) return;
  if(ctl) ctl.abort();
  const seeds = seedsNow();
  const short = s => s.length>28 ? s.slice(0,27)+'…' : s;
  story = { title:'', seeds:`Hero: ${short(seeds.hero)} · Moral: ${seeds.moral.toLowerCase()}`, chapters:[], picks:[], moral:'', choices:[], turns:[{role:'user',content:RULES(seeds,false)+'\n\nWrite chapter 1.'}], seedObj:seeds, ended:false };
  story.title = 'Digging…';
  renderStory(story, '');
  run(story.turns, (o, raw, live) => handleOut(o, raw, live));
  taleEl.scrollIntoView({behavior: reduce?'auto':'smooth', block:'nearest'});
}
function handleOut(o, raw, live){
  if(o.title) story.title = o.title;
  if(live){ const tmp = {...story, moral:o.moral}; renderStory(tmp, o.body); return; }
  story.chapters.push(o.body || raw.trim());
  story.moral = o.moral || story.moral;
  story.choices = o.choices;
  story.turns.push({role:'assistant', content: raw});
  if(story.finalPending || !o.choices.length){ story.ended = true; story.finalPending=false; }
  renderStory(story);
}
function continueStory(choice){
  if(story === SAMPLE_STORY || !story){
    // sample: begin a real tale from the sample's seeds with the chosen path
    if(!sampleFn) return;
    const seeds = { hero:'a trader cricket who watches the tape', place:'the sugar market under the picnic table', moral:"Don't chase every pump", len };
    story = { title:SAMPLE.title, seeds:SAMPLE.seeds, chapters:[...SAMPLE.chapters], picks:[], moral:'', choices:[], ended:false, seedObj:seeds,
      turns:[{role:'user',content:RULES(seeds,false)+'\n\nWrite chapter 1.'},{role:'assistant',content:`TITLE: ${SAMPLE.title}\nSTORY:\n${SAMPLE.chapters[0]}\nMORAL: ${SAMPLE.moral}\n${SAMPLE.choices.map((c,i)=>`CHOICE ${i+1}: ${c}`).join('\n')}`}] };
  }
  const final = story.chapters.length >= 3;
  story.picks.push(choice);
  story.turns.push({role:'user', content: `The reader chose: "${choice}". Write chapter ${story.chapters.length+1}${final?' as the FINAL chapter — resolve the story, and do not write any CHOICE lines':''}. Keep the exact format.`});
  story.finalPending = final;
  trimTurns();
  run(story.turns, (o, raw, live) => handleOut(o, raw, live));
}
function endStory(){
  if(!story || story.ended || !sampleFn) return;
  story.picks.push('the ending');
  story.turns.push({role:'user', content:`Write chapter ${story.chapters.length+1} as the FINAL chapter: bring the story to a satisfying end that lands the moral. Do not write any CHOICE lines. Keep the exact format.`});
  story.finalPending = true;
  trimTurns();
  run(story.turns, (o, raw, live) => handleOut(o, raw, live));
}
function trimTurns(){ // keep instructions turn + last 6
  if(story.turns.length > 8){ story.turns = [story.turns[0], ...story.turns.slice(-7)]; if(story.turns[1].role!=='assistant'){} }
}
function disableLive(msg){
  sampleFn = null; sampleState='off';
  goBtn.disabled = true; goBtn.textContent = 'Live tales unavailable';
  $('diceBtn').disabled = true; endBtn.hidden = true;
  setStatus('', msg);
  document.querySelectorAll('.choice').forEach(b=>b.disabled=true);
  chatOff();
}

goBtn.onclick = startStory;
stopBtn.onclick = () => ctl && ctl.abort();
endBtn.onclick = endStory;
copyBtn.onclick = async () => {
  const s = story || SAMPLE_STORY;
  const txt = `${s.title}\n\n${s.chapters.join('\n\n')}\n\nMoral: ${s.moral}\n\n— told by Formi · PONSFABLE`;
  try{ await navigator.clipboard.writeText(txt); toast('Tale copied'); }catch{ toast('Copy blocked by the browser'); }
};

/* initial sample render */
story = SAMPLE_STORY;
renderStory(SAMPLE_STORY);
setStatus('', 'Sample tale — choose a path to keep it going, or press Tell a fable.');

/* ================= fable book ================= */
const CLASSICS = [
  { id:'c1', classic:true, title:'The Ant and the Grasshopper Who Waited', moral:'Work while the sun is kind, and the winter will be too.',
    chapters:["All summer the grasshopper sang on a tall stem while Formi's colony hauled seeds below. \"Rest!\" he laughed. \"The fields will always be full.\"","When frost silvered the grass, the fields were empty. The grasshopper knocked at the anthill, shivering. Formi opened the door, fed him one seed, and handed him a shovel.\n\n\"Dig with us tomorrow,\" she said, \"and sing while you do. The tunnels are quiet in winter.\" He did — and the colony never had a better work song."] },
  { id:'c2', classic:true, title:'The Beetle Who Bought the Top', moral:'The loudest crowd is rarely standing at the bottom.',
    chapters:["A stag beetle heard the whole meadow shouting about dewdrops. \"Dew is going to the moon!\" So he traded his best acorn for one fat dewdrop at noon, when every blade of grass was chanting.","By evening the sun had dried the meadow, and a dewdrop was worth nothing but a sip. An old snail slid by with a pocket full of cheap morning dew. \"I buy when the grass is quiet,\" she said, and kept sliding."] },
  { id:'c3', classic:true, title:'The Firefly Who Lit One Tunnel', moral:'A small light, kept steady, guides more than a bright one that burns out.',
    chapters:["A young firefly wanted to light the whole forest at once. She blazed so hard that she dimmed by midnight and fell asleep on a leaf.","Her sister chose one dark tunnel under the oak and glowed there softly, all night, every night. Soon every lost ant in the forest knew the way home — it was the tunnel with the little light."] }
];
const KEY='ponsfable.book.v1';
const loadBook = () => { try{ return JSON.parse(localStorage.getItem(KEY)||'[]'); }catch{ return []; } };
const saveBook = b => { try{ localStorage.setItem(KEY, JSON.stringify(b)); return true; }catch{ return false; } };
const shelf = $('shelf');
function renderShelf(){
  shelf.replaceChildren();
  const mine = loadBook();
  [...mine, ...CLASSICS].forEach(t=>{
    const b=document.createElement('button'); b.type='button'; b.className='spine';
    const tg=document.createElement('span'); tg.className='tag '+(t.classic?'tag--sample':'tag--live'); tg.textContent = t.classic?'Colony classic':'Your tale'; tg.style.justifySelf='start';
    const h=document.createElement('h3'); h.textContent=t.title;
    const p=document.createElement('p'); p.textContent = t.moral || '';
    const row=document.createElement('div'); row.className='row';
    const l=document.createElement('span'); l.className='label'; l.textContent = `${t.chapters.length} chapter${t.chapters.length>1?'s':''}`;
    const r=document.createElement('span'); r.className='label'; r.textContent = t.saved ? new Date(t.saved).toLocaleDateString() : 'Read ▶';
    row.append(l,r); b.append(tg,h,p,row);
    b.onclick = () => openReader(t);
    shelf.append(b);
  });
}
saveBtn.onclick = () => {
  const s = story || SAMPLE_STORY;
  if(!s.chapters.length){ toast('Nothing to save yet'); return; }
  const book = loadBook();
  book.unshift({ id:'t'+Date.now(), title:s.title, moral:s.moral, chapters:[...s.chapters], seeds:s.seeds, saved:Date.now() });
  if(saveBook(book.slice(0,30))){ renderShelf(); toast('Saved to Fable Book'); } else toast('This browser blocks saving');
};
const reader=$('reader'), readerBody=$('readerBody');
let readingId=null;
function openReader(t){
  readingId = t.classic ? null : t.id;
  $('readerBar').textContent = t.classic ? 'Colony classic' : 'Your tale';
  $('readerDel').hidden = !!t.classic;
  readerBody.replaceChildren();
  const h=document.createElement('h3'); h.textContent=t.title; readerBody.append(h);
  const tx=document.createElement('div'); tx.className='tale__text';
  t.chapters.forEach((c,i)=>{ if(t.chapters.length>1){ const s=document.createElement('span'); s.className='chap'; s.textContent='Chapter '+(i+1); tx.append(s);} c.split(/\n{2,}/).forEach(par=>{ const p=document.createElement('p'); p.textContent=par; tx.append(p); }); });
  readerBody.append(tx);
  if(t.moral){ const m=document.createElement('div'); m.className='moral'; const l=document.createElement('span'); l.className='label'; l.textContent='Moral'; const s=document.createElement('span'); s.textContent=t.moral; m.append(l,s); readerBody.append(m); }
  if(typeof reader.showModal==='function') reader.showModal(); else reader.setAttribute('open','');
}
const closeReader = () => reader.close ? reader.close() : reader.removeAttribute('open');
$('readerClose').onclick = closeReader; $('readerX').onclick = closeReader;
$('readerX').onkeydown = e => { if(e.key==='Enter'||e.key===' ') closeReader(); };
$('readerDel').onclick = () => { saveBook(loadBook().filter(t=>t.id!==readingId)); renderShelf(); closeReader(); toast('Removed'); };
renderShelf();

/* ================= token ================= */
if(TOKEN.ca){
  $('caText').textContent = TOKEN.ca; $('copyCa').disabled = false;
  $('copyCa').onclick = async()=>{ try{ await navigator.clipboard.writeText(TOKEN.ca); toast('Address copied'); }catch{ toast('Copy blocked by the browser'); } };
}
if(TOKEN.launchpadUrl){ const a=$('launchBtn'); a.href=TOKEN.launchpadUrl; a.target='_blank'; a.rel='noopener'; a.textContent='Launch on pons.family'; a.removeAttribute('aria-disabled'); }
if(TOKEN.chartUrl){ const a=$('chartBtn'); a.href=TOKEN.chartUrl; a.target='_blank'; a.rel='noopener'; a.removeAttribute('aria-disabled'); }
document.querySelectorAll('a[aria-disabled="true"]').forEach(a=>a.addEventListener('click',e=>{ e.preventDefault(); toast('Not live yet — launching soon'); }));

/* ================= companion chat ================= */
const chat=$('chat'), log=$('log'), bubble=$('bubble'), chatIn=$('chatIn'), chatSend=$('chatSend');
let chatTurns=[], chatCtl=null;
const CHAT_RULES = `You are Formi, the small, warm, witty storyteller ant of PONSFABLE — a website where an ant AI writes branching animal fables with a moral. Facts you may share: users pick a hero, setting and moral, then choose one of three paths after each chapter (up to 4 chapters); tales can be saved to a Fable Book in their browser; the $FABLE token will launch on the pons.family launchpad on Robinhood Chain and is not live yet (no contract address yet — tell people to trust only the address shown on this site); Ponsfable is part of the pons family with pons0X, ponsGET and PONSBVNKR. Never give financial advice or price predictions. Answer in 1-4 short sentences, plain text, no markdown, occasional ant/tunnel flavour.`;
function addMsg(who, text){ const d=document.createElement('div'); d.className='msg msg--'+who; d.textContent=text; log.append(d); log.scrollTop=log.scrollHeight; return d; }
function openChat(){ chat.hidden=false; bubble.hidden=true; if(!log.children.length) addMsg('ant', sampleFn ? 'Hi! Ask me about fables, the colony, or $FABLE.' : 'I can only chat when live answers are on. The sample tale and Fable Book still work!'); chatIn.focus(); }
function chatOff(){ chatIn.disabled = true; chatSend.disabled = true; chatIn.placeholder='Chat is off in this view'; }
$('askBtn').onclick = () => chat.hidden ? openChat() : (chat.hidden=true);
$('heroAsk').onclick = openChat;
buddyPx.onclick = openChat;
$('chatX').onclick = () => { chat.hidden = true; };
$('chatX').onkeydown = e => { if(e.key==='Enter'||e.key===' ') chat.hidden = true; };
$('hushBtn').onclick = () => { bubble.hidden = !bubble.hidden; chat.hidden = true; };
$('chatForm').onsubmit = async e => {
  e.preventDefault();
  const q = chatIn.value.trim(); if(!q || !sampleFn) return;
  chatIn.value=''; addMsg('me', q);
  chatTurns.push({role:'user', content:q});
  if(chatTurns.length>10) chatTurns = chatTurns.slice(-10);
  while(chatTurns.length && chatTurns[0].role!=='user') chatTurns.shift();
  const out = addMsg('ant','…digging…');
  chatSend.disabled = true;
  chatCtl = new AbortController();
  try{
    const { text } = await sampleFn([{role:'user',content:CHAT_RULES}, ...chatTurns], { modelTier:'quick', cache:false, signal:chatCtl.signal, onText:({text})=>{ out.textContent=text; log.scrollTop=log.scrollHeight; } });
    chatTurns.push({role:'assistant', content:text});
  }catch(err){
    const c = err && err.code;
    if(['not_granted','sampling_disabled','not_declared','capability_disabled'].includes(c)){ out.textContent='Live answers are off for this view.'; disableLive('Live tales are off for this view. Enjoy the sample and the Fable Book.'); }
    else if(c==='rate_limited') out.textContent = err.text || 'Too many questions at once — give me a minute.';
    else if(c==='refused') out.textContent = 'I\'ll skip that one. Ask me something else?';
    else out.textContent = err && err.text ? err.text + ' …(interrupted)' : 'The tunnel caved in. Try asking again.';
  }finally{ if(sampleFn) chatSend.disabled = false; }
};

/* ================= toast ================= */
let tt;
function toast(m){ let t=document.querySelector('.toast'); if(!t){ t=document.createElement('div'); t.className='toast'; t.setAttribute('role','status'); document.body.append(t);} t.textContent=m; t.hidden=false; clearTimeout(tt); tt=setTimeout(()=>t.hidden=true,1800); }

/* ================= capability wiring ================= */
goBtn.disabled = true; goBtn.textContent = 'Waking Formi…';
(async () => {
  let s = null;
  try{ s = window.claude && window.claude.use ? await window.claude.use('sample') : null; }catch{ s = null; }
  if(!s){ disableLive('Live tales need the Claude app viewer. The sample tale and Fable Book still work.'); goBtn.textContent='Live tales unavailable'; return; }
  sampleFn = s; sampleState='on';
  goBtn.disabled = false; goBtn.textContent = '▶ Tell a fable';
  renderStory(story);
})();
})();

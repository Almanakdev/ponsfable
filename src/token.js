(() => {
'use strict';

const CA = '0xe6b6d29bcf3484121a074ec161489899d010b36c';
const CA_SHORT = CA.slice(0, 6) + '…' + CA.slice(-4);
const $ = (id) => document.getElementById(id);

const clock = $('clock');
if (clock) {
  const tick = () => { clock.textContent = new Date().toLocaleTimeString('en-GB', { hour12: false }); };
  tick(); setInterval(tick, 1000);
}

const caShort = $('caShort');
if (caShort) caShort.textContent = CA_SHORT;
const railCa = $('railCa');
if (railCa) railCa.textContent = CA;
const heroCa = $('heroCa');
if (heroCa) heroCa.textContent = CA;

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-copy-ca]');
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(CA);
    const was = btn.textContent;
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = was; }, 1400);
  } catch { btn.textContent = 'Blocked'; }
});

const rail = $('rail');
const scrim = $('scrim');
const menuBtn = $('menuBtn');
const closeRail = () => { rail.classList.remove('is-open'); scrim.hidden = true; };
if (menuBtn) menuBtn.onclick = () => {
  const open = !rail.classList.contains('is-open');
  rail.classList.toggle('is-open', open);
  scrim.hidden = !open;
};
if (scrim) scrim.onclick = closeRail;
})();

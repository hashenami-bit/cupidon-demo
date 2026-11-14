// Full-page photo viewer. items = [{ src, alt, caption? }], labels = { close, prev, next } (already translated).
// Closes with the X, Esc or a tap on the dark area. Arrows or a swipe move between photos.
const ICONS = {
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>'
};
let current = null;

export function openPhotos(items, index = 0, labels = {}) {
  if (current || !items?.length) return;
  const opener = document.activeElement;
  let i = Math.min(Math.max(index, 0), items.length - 1);
  const many = items.length > 1;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `
    <button type="button" class="lb-btn lb-close">${ICONS.close}</button>
    <button type="button" class="lb-btn lb-prev">${ICONS.prev}</button>
    <figure class="lb-fig"><img alt="" draggable="false"><figcaption></figcaption></figure>
    <button type="button" class="lb-btn lb-next">${ICONS.next}</button>
    <p class="lb-count" aria-live="polite"></p>`;
  const img = box.querySelector('img');
  const cap = box.querySelector('figcaption');
  const count = box.querySelector('.lb-count');
  const [closeBtn, prevBtn, nextBtn] = ['.lb-close', '.lb-prev', '.lb-next'].map(s => box.querySelector(s));
  closeBtn.setAttribute('aria-label', labels.close || 'Close');
  prevBtn.setAttribute('aria-label', labels.prev || 'Previous');
  nextBtn.setAttribute('aria-label', labels.next || 'Next');
  prevBtn.hidden = nextBtn.hidden = count.hidden = !many;

  function draw() {
    const it = items[i];
    img.src = it.src;
    img.alt = it.alt || '';
    cap.textContent = it.caption || '';
    cap.hidden = !it.caption;
    count.textContent = `${i + 1} / ${items.length}`;
    box.setAttribute('aria-label', it.alt || labels.close || '');
  }
  const go = d => { i = (i + d + items.length) % items.length; draw(); };

  function close() {
    document.removeEventListener('keydown', onKey);
    document.documentElement.style.overflow = prevOverflow;
    box.remove();
    current = null;
    opener?.focus?.({ preventScroll: true });
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (many && e.key === 'ArrowRight') go(1);
    else if (many && e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') {   // keep focus inside the viewer
      const btns = [closeBtn, prevBtn, nextBtn].filter(b => !b.hidden);
      const at = btns.indexOf(document.activeElement);
      e.preventDefault();
      btns[(at + (e.shiftKey ? -1 : 1) + btns.length) % btns.length].focus();
    }
  }

  closeBtn.onclick = close;
  prevBtn.onclick = () => go(-1);
  nextBtn.onclick = () => go(1);
  // A tap on the dark area closes it: on the box itself, or on the empty bars beside the photo (the <img> fills the whole frame).
  const onPhoto = e => {
    const r = img.getBoundingClientRect(), ar = img.naturalWidth / img.naturalHeight || 1;
    let w = r.width, h = r.height;
    if (w / h > ar) w = h * ar; else h = w / ar;
    const left = r.left + (r.width - w) / 2, top = r.top + (r.height - h) / 2;
    return e.clientX >= left && e.clientX <= left + w && e.clientY >= top && e.clientY <= top + h;
  };
  let swiped = false;
  box.addEventListener('click', e => {
    if (swiped) { swiped = false; return; }   // the click that ends a swipe must not close the viewer
    if (e.target === box || e.target === box.querySelector('.lb-fig') || (e.target === img && !onPhoto(e))) close();
  });
  // Swipe left or right to change photo.
  let x0 = null;
  box.addEventListener('pointerdown', e => { x0 = e.clientX; swiped = false; });
  box.addEventListener('pointerup', e => {
    if (x0 !== null && many && Math.abs(e.clientX - x0) > 50) { go(e.clientX < x0 ? 1 : -1); swiped = true; setTimeout(() => (swiped = false), 60); }
    x0 = null;
  });

  const prevOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  document.addEventListener('keydown', onKey);
  draw();
  document.body.append(box);
  closeBtn.focus({ preventScroll: true });
  current = box;
}

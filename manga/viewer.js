// ページをタップすると、大きい絵を全画面で開く。前・次で移れる。
(() => {
  const dlg = document.querySelector('[data-viewer]');
  if (!dlg || typeof dlg.showModal !== 'function') return; // 古いブラウザは絵へのリンクのまま
  const links = [...document.querySelectorAll('.page-link')];
  const img = dlg.querySelector('[data-viewer-img]');
  const no = dlg.querySelector('[data-viewer-no]');
  const body = dlg.querySelector('[data-viewer-body]');
  const prev = dlg.querySelector('[data-viewer-prev]');
  const next = dlg.querySelector('[data-viewer-next]');
  let cur = 0;

  const show = (i) => {
    cur = Math.max(0, Math.min(links.length - 1, i));
    const a = links[cur];
    img.src = a.dataset.full;
    img.alt = a.querySelector('img').alt;
    no.textContent = String(cur + 1).padStart(2, '0') + ' / ' + links.length;
    prev.disabled = cur === 0;
    next.disabled = cur === links.length - 1;
    body.scrollTop = 0;
  };

  links.forEach((a, i) => a.addEventListener('click', (e) => {
    e.preventDefault();
    show(i);
    dlg.showModal();
  }));
  prev.addEventListener('click', () => show(cur - 1));
  next.addEventListener('click', () => show(cur + 1));
  dlg.querySelector('[data-viewer-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => links[cur].scrollIntoView({ block: 'start' }));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
})();

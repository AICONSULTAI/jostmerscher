/* Jost Merscher – Version 2: Eröffnung, Wand, Verzeichnis, Räume, Werkansicht */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const EASE = 'cubic-bezier(.16, 1, .3, 1)';
  const GLIDE = 'cubic-bezier(.76, 0, .24, 1)';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const header = $('.site-header');
  const draft = $('.draft');
  const wall = $('#werke');
  const track = $('#track');
  const hangs = $$('.hang', track);
  const arts = hangs.map(h => $('.art', h));
  const meterNow = $('#meter-now'), meterFill = $('#meter-fill');
  $('#meter-all').textContent = String(hangs.length).padStart(2, '0');

  /* ---------- Wand: horizontal auf breiten Schirmen ---------- */
  let isH = false, dist = 0, wallTop = 0, wallH = 0, cur = 0, offs = [];
  const measure = () => {
    isH = innerWidth >= 900 && innerHeight >= 560 && !reduce;
    root.classList.toggle('is-h', isH);
    if (!isH) { track.style.transform = ''; wall.style.removeProperty('--wall-h'); return; }
    const last = track.lastElementChild;
    const w = last.offsetLeft + last.offsetWidth;
    dist = Math.max(0, w - innerWidth);
    wall.style.setProperty('--wall-h', (dist + innerHeight) + 'px');
    wallTop = wall.getBoundingClientRect().top + scrollY;
    wallH = dist + innerHeight;
    offs = hangs.map(h => ({ left: h.offsetLeft, width: h.offsetWidth }));
  };
  const wallTarget = () => clamp((scrollY - wallTop) / Math.max(1, wallH - innerHeight)) * dist;

  /* Tastatur: ein fokussiertes Werk an der Wand sofort in die Mitte holen */
  const standAt = i => {
    if (!isH || !dist) return;
    const x = clamp(offs[i].left + offs[i].width / 2 - innerWidth / 2, 0, dist);
    scrollTo({ top: wallTop + (x / dist) * (wallH - innerHeight), behavior: 'instant' });
    cur = x;
    track.style.transform = `translate3d(${-x}px, 0, 0)`;
    hangs[i].style.setProperty('--in', 1); hangs[i].style.setProperty('--label', 1);
  };
  hangs.forEach((h, i) => h.addEventListener('focusin', () => standAt(i)));

  /* ---------- Raeume, Kopf, Navigation ---------- */
  const theme = $('meta[name="theme-color"]');
  const roomColor = { wand: '#f5f5f3', bibliothek: '#e4e3de', abend: '#141413' };
  const navLinks = $$('.nav a');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const room = e.target.dataset.room;
      if (room && root.dataset.room !== room) { root.dataset.room = room; theme && theme.setAttribute('content', roomColor[room]); }
      if (e.target.id) navLinks.forEach(a => a.setAttribute('aria-current', String(a.hash === '#' + e.target.id)));
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  $$('[data-room]', document.body).forEach(s => io.observe(s));

  /* Spruenge: weich anfahren; der Hinweis auf der Wand geht ein Stueck an ihr entlang */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#inhalt') return;
    let top;
    if (a.classList.contains('walk-hint') && isH) top = wallTop + innerHeight * 1.1;
    else if (id === '#top' || id === '#werke') top = 0;
    else { const el = id.length > 1 && $(id); if (!el) return; top = el.getBoundingClientRect().top + scrollY; }
    e.preventDefault();
    scrollTo({ top, behavior: reduce ? 'instant' : 'smooth' });
    history.replaceState(null, '', id === '#top' ? location.pathname : id);
  }));

  /* ---------- Ueberschriften: Woerter steigen aus ihrer Zeile ---------- */
  $$('h2[data-rise]').forEach(h => {
    h.innerHTML = h.textContent.trim().split(/\s+/).map((w, i) => `<span class="w-mask"><span class="w-in" style="--i:${i}">${w}</span></span>`).join(' ');
  });
  const once = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); once.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px', threshold: .15 });
  $$('h2[data-rise], .books').forEach(el => once.observe(el));
  hangs.forEach(h => once.observe(h));

  /* ---------- Satz unter „Zur Person“: faerbt sich beim Lesen ---------- */
  const statement = $('[data-words]');
  let words = [];
  if (statement) {
    const text = statement.textContent.trim();
    statement.innerHTML = `<span class="visually-hidden">${text}</span><span aria-hidden="true">` +
      text.split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ') + '</span>';
    words = $$('.w', statement);
    words.forEach(w => w.style.setProperty('--k', reduce ? 1 : 0));
  }

  /* ---------- E-Mail: Buchstaben rollen ins Kursive ---------- */
  $$('[data-roll]').forEach(a => {
    const t = a.textContent.trim();
    a.setAttribute('aria-label', t);
    a.innerHTML = [...t].map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}"><span>${c}</span><span>${c}</span></span>`).join('');
  });

  /* ---------- Verzeichnis aus den Werken der Wand ---------- */
  const rowsEl = $('#rows');
  const works = hangs.map((h, i) => {
    const a = $('.art', h), img = $('img', a), lab = $$('.label > *', h);
    return {
      i, cat: h.dataset.cat, href: a.getAttribute('href'), mid: img.getAttribute('src'),
      small: img.getAttribute('src').replace('-1200', '-800'), alt: img.alt,
      w: +img.getAttribute('width'), h: +img.getAttribute('height'),
      title: lab[0].textContent, kind: lab[1].textContent, meta: lab[2].textContent, art: a
    };
  });
  rowsEl.innerHTML = works.map(w => `<li class="row" data-cat="${w.cat}"><a href="${w.href}" data-i="${w.i}">
      <span class="nr">${String(w.i + 1).padStart(2, '0')}</span>
      <img class="thumb" src="${w.small}" alt="" loading="lazy" width="56" height="56">
      <span class="t">${w.title}</span><span class="k">${w.kind}</span><span class="m">${w.meta}</span>
      <svg class="go" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M4 12 12 4M5.5 4H12v6.5"/></svg></a></li>`).join('');
  const rows = $$('.row', rowsEl);

  const fButtons = $$('.filter button');
  fButtons.forEach(b => { b.querySelector('.count').textContent = rows.filter(r => b.dataset.filter === 'alle' || r.dataset.cat === b.dataset.filter).length; });
  let filter = 'alle';
  fButtons.forEach(b => b.addEventListener('click', () => {
    if (b.dataset.filter === filter) return;
    filter = b.dataset.filter;
    fButtons.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const before = new Map(rows.filter(r => !r.hidden).map(r => [r, r.getBoundingClientRect().top]));
    rows.forEach(r => { r.hidden = !(filter === 'alle' || r.dataset.cat === filter); });
    if (reduce) return;
    rows.filter(r => !r.hidden).forEach((r, n) => {
      const top = r.getBoundingClientRect().top;
      if (before.has(r)) {
        const dy = before.get(r) - top;
        if (Math.abs(dy) > 1) r.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 650, easing: EASE });
      } else {
        r.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 60 + n * 35, easing: EASE, fill: 'backwards' });
      }
    });
  }));

  /* Vorschau am Zeiger */
  const peek = $('.peek'), peekImg = $('img', peek);
  let peekOn = false, px = 0, py = 0, pxT = 0, pyT = 0;
  if (fine) {
    rows.forEach(r => r.addEventListener('mouseenter', () => {
      const w = works[+$('a', r).dataset.i];
      if (peekImg.getAttribute('src') !== w.small) {
        peekImg.src = w.small;
        if (peekOn && !reduce) peekImg.animate([{ opacity: .2, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE });
      }
      peek.classList.add('is-on'); peekOn = true;
    }));
    rowsEl.addEventListener('mouseleave', () => { peek.classList.remove('is-on'); peekOn = false; });
  }

  /* ---------- Zeiger ---------- */
  const cursor = $('.cursor'), cursorLabel = $('span', cursor);
  let mx = -200, my = -200, cx = -200, cy = -200;
  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    pxT = mx + 28; pyT = my - 120;
    if (!fine) return;
    const t = e.target.closest && e.target.closest('[data-cursor]');
    if (t && !viewer.open) { cursorLabel.textContent = t.dataset.cursor; cursor.classList.add('is-on'); }
    else cursor.classList.remove('is-on');
  }, { passive: true });
  document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));

  /* ---------- Werkansicht: das Werk wandert von der Wand in den Raum und zurueck ---------- */
  const viewer = $('#viewer');
  const vImg = $('.viewer-img', viewer), vBg = $('.viewer-bg', viewer);
  const vBars = [$('.viewer-top', viewer), $('.viewer-bottom', viewer)];
  const vCap = $('.viewer-caption', viewer);
  const vTitle = $('h3', vCap), vMeta = $('p', vCap), vCount = $('.viewer-count', viewer);
  let seq = works.map(w => w.i), pos = 0, hiddenSrc = null, busy = false;

  const fill = w => {
    vImg.width = w.w; vImg.height = w.h; vImg.alt = w.alt;
    vImg.dataset.i = w.i;
    vImg.src = w.mid;
    const big = new Image(); big.src = w.href;
    big.decode().then(() => { if (vImg.dataset.i === String(w.i)) vImg.src = w.href; }).catch(() => {});
    vTitle.textContent = w.title; vMeta.textContent = `${w.kind} · ${w.meta}`;
    vCount.textContent = `${pos + 1} / ${seq.length}`;
  };
  const visibleRect = el => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return r.width && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth ? r : null;
  };
  const flip = (from, to) => {
    const sx = from.width / to.width, sy = from.height / to.height;
    if (Math.abs(sx / sy - 1) < .06) return { t: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})`, s: sx };
    const s = Math.min(sx, sy);
    const dx = from.left + (from.width - to.width * s) / 2 - to.left, dy = from.top + (from.height - to.height * s) / 2 - to.top;
    return { t: `translate(${dx}px, ${dy}px) scale(${s})`, s };
  };
  /* Schatten an der Wand und im Raum, beim Flug ineinander uebergeblendet (durch den Massstab geteilt, damit er echt bleibt) */
  const wallShadow = s => `0 ${1 / s}px ${1 / s}px rgb(0 0 0 / .05), 0 ${24 / s}px ${44 / s}px ${-26 / s}px rgb(0 0 0 / .38)`;
  const roomShadow = '0 0 0 0 rgb(0 0 0 / 0), 0 40px 90px -40px rgb(0 0 0 / .8)';
  const isOnWall = () => { const r = wall.getBoundingClientRect(); return r.top < innerHeight / 2 && r.bottom > innerHeight / 2; };
  const settle = els => els.forEach(el => el.getAnimations().forEach(a => a.cancel()));

  const open = (i, sourceEl, list) => {
    if (busy || viewer.open) return;
    seq = list || works.map(w => w.i);
    pos = Math.max(0, seq.indexOf(i));
    fill(works[i]);
    viewer.showModal();
    root.style.overflow = 'hidden';
    cursor.classList.remove('is-on');
    const from = visibleRect(sourceEl);
    if (reduce || !from) {
      viewer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 200 : 450, easing: EASE });
      return;
    }
    busy = true;
    hiddenSrc = sourceEl; sourceEl.style.visibility = 'hidden';
    const to = vImg.getBoundingClientRect();
    vBg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease-out' });
    [header, draft].forEach(el => el.animate([{ opacity: 0 }], { duration: 200, fill: 'forwards' }));
    vBars.forEach((b, n) => b.animate([{ opacity: 0, transform: `translateY(${n ? 12 : -12}px)` }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 560, easing: EASE, fill: 'backwards' }));
    const f = flip(from, to);
    vImg.animate([{ transform: f.t, boxShadow: wallShadow(f.s) }, { offset: .25, boxShadow: wallShadow(f.s) }, { transform: 'none', boxShadow: roomShadow }], { duration: 860, easing: GLIDE }).finished.finally(() => { busy = false; });
  };

  const close = () => {
    if (busy || !viewer.open) return;
    const w = works[seq[pos]];
    /* An der Wand: vor das Werk treten, das gerade gezeigt wird, damit es an seinen Platz zurueckfliegt */
    if (isH && isOnWall() && !visibleRect(w.art)) {
      if (hiddenSrc) { hiddenSrc.style.visibility = ''; hiddenSrc = null; }
      standAt(w.i);
    }
    const thumb = $(`.row a[data-i="${w.i}"] .thumb`);
    const target = (isOnWall() && visibleRect(w.art)) ? w.art : (visibleRect(thumb) ? thumb : null);
    const done = () => {
      viewer.close(); root.style.overflow = '';
      if (hiddenSrc) hiddenSrc.style.visibility = '';
      hiddenSrc = null; busy = false;
      settle([vImg, vBg, ...vBars, viewer]);
    };
    [header, draft].forEach(el => { const a = el.animate([{ opacity: 1 }], { duration: 400, delay: 200, fill: 'forwards' }); a.finished.then(() => a.cancel(), () => {}); });
    const link = isOnWall() ? w.art : $(`.row a[data-i="${w.i}"]`);
    busy = true;
    if (reduce || !target) {
      viewer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 200 : 320, easing: 'ease-in', fill: 'forwards' }).finished.then(done);
    } else {
      if (hiddenSrc && hiddenSrc !== target) hiddenSrc.style.visibility = '';
      hiddenSrc = target; target.style.visibility = 'hidden';
      const from = vImg.getBoundingClientRect(), to = target.getBoundingClientRect();
      vBars.forEach(b => b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }));
      vBg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 620, delay: 100, easing: 'ease-in-out', fill: 'forwards' });
      const f = flip(to, from);
      vImg.animate([{ transform: 'none', boxShadow: roomShadow }, { offset: .75, boxShadow: wallShadow(f.s) }, { transform: f.t, boxShadow: wallShadow(f.s) }], { duration: 760, easing: GLIDE, fill: 'forwards' }).finished.then(done);
    }
    link && link.focus({ preventScroll: true });
  };

  /* Blaettern: aus dem aktuellen Zustand heraus, damit schnelles Weiterklicken nie springt */
  const freeze = el => { el.getAnimations().forEach(a => { try { a.commitStyles(); } catch (e) {} a.cancel(); }); };
  const unfreeze = el => { el.style.opacity = ''; el.style.transform = ''; };
  const step = dir => {
    if (busy) return;
    pos = (pos + dir + seq.length) % seq.length;
    const w = works[seq[pos]];
    if (reduce) {
      vImg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 70, fill: 'forwards' }).finished.then(() => { fill(w); settle([vImg]); vImg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 90 }); });
      return;
    }
    busy = true;
    freeze(vImg); freeze(vCap);
    Promise.all([
      vImg.animate([{ opacity: 0, transform: `translateX(${-dir * 40}px)` }], { duration: 160, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished,
      vCap.animate([{ opacity: 0 }], { duration: 160, fill: 'forwards' }).finished
    ]).then(() => {
      fill(w);
      settle([vImg, vCap]); unfreeze(vImg); unfreeze(vCap);
      vImg.animate([{ opacity: 0, transform: `translateX(${dir * 50}px)` }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE });
      vCap.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 80, easing: EASE, fill: 'backwards' });
      busy = false;
      const n = works[seq[(pos + dir + seq.length) % seq.length]]; const pre = new Image(); pre.src = n.mid;
    });
  };

  arts.forEach((a, i) => a.addEventListener('click', e => { e.preventDefault(); open(i, a); }));
  rowsEl.addEventListener('click', e => {
    const a = e.target.closest('a[data-i]'); if (!a) return;
    e.preventDefault();
    const list = rows.filter(r => !r.hidden).map(r => +$('a', r).dataset.i);
    const fromPeek = fine && peekOn;
    open(+a.dataset.i, fromPeek ? peekImg : $('.thumb', a), list);
    if (fromPeek) { peek.classList.remove('is-on'); peekOn = false; peekImg.style.visibility = ''; hiddenSrc = null; }
  });
  $('.viewer-close', viewer).addEventListener('click', close);
  $('.viewer-prev', viewer).addEventListener('click', () => step(-1));
  $('.viewer-next', viewer).addEventListener('click', () => step(1));
  viewer.addEventListener('cancel', e => { e.preventDefault(); close(); });
  viewer.addEventListener('keydown', e => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
  $('.viewer-stage', viewer).addEventListener('click', e => { if (e.target === e.currentTarget) close(); });
  let tx = null;
  viewer.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener('touchend', e => { if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); });

  /* ---------- Entwurfshinweis ---------- */
  try { if (sessionStorage.getItem('jm-draft') === '0') draft.hidden = true; } catch (e) {}
  $('button', draft).addEventListener('click', () => { draft.hidden = true; try { sessionStorage.setItem('jm-draft', '0'); } catch (e) {} });

  /* ---------- Ein Takt fuer alles, was der Bewegung folgt ---------- */
  const lastK = [];
  const tick = () => {
    if (isH) {
      const target = wallTarget();
      cur += (target - cur) * .11;
      if (Math.abs(target - cur) < .05) cur = target;
      track.style.transform = `translate3d(${(-cur).toFixed(2)}px, 0, 0)`;
      let best = 0, bestD = Infinity;
      for (let i = 0; i < hangs.length; i++) {
        const o = offs[i], left = o.left - cur, center = left + o.width / 2;
        const inn = easeOut(clamp((innerWidth * 1.02 - left) / (innerWidth * .34)));
        const lab = clamp((inn - .75) / .25);
        const drift = clamp((center - innerWidth / 2) / innerWidth, -1, 1) * -o.width * .025;
        const s = hangs[i].style;
        s.setProperty('--in', inn.toFixed(3)); s.setProperty('--label', lab.toFixed(3)); s.setProperty('--drift', drift.toFixed(1));
        const d = Math.abs(center - innerWidth / 2);
        if (d < bestD && left < innerWidth) { bestD = d; best = i; }
      }
      meterFill.style.setProperty('--p', (dist ? cur / dist : 0).toFixed(4));
      const now = String(cur < 40 ? 0 : best + 1).padStart(2, '0');
      if (meterNow.textContent !== now) meterNow.textContent = now;
    }
    header.classList.toggle('is-solid', isH ? scrollY > wallTop + wallH - innerHeight - 4 : scrollY > 8);

    if (words.length && !reduce) {
      const r = statement.getBoundingClientRect();
      const p = clamp((innerHeight * .82 - r.top) / (r.height + innerHeight * .3));
      const n = words.length;
      for (let i = 0; i < n; i++) {
        const k = clamp(p * (n + 5) - i, 0, 5) / 5;
        if (lastK[i] !== k) { words[i].style.setProperty('--k', k.toFixed(3)); lastK[i] = k; }
      }
    }
    if (fine) {
      cx += (mx - cx) * .22; cy += (my - cy) * .22;
      cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      if (peekOn) { px += (pxT - px) * .14; py += (pyT - py) * .14; peek.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`; }
      else { px = pxT; py = pyT; }
    }
    requestAnimationFrame(tick);
  };

  /* ---------- Eroeffnung: Rahmen zeichnet sich, das Werk erscheint, der Name steigt auf ---------- */
  const title = $('#name');
  $$('.word', title).forEach(w => { w.innerHTML = [...w.textContent].map(c => `<span class="ch">${c}</span>`).join(''); });

  const runIntro = () => {
    try { sessionStorage.setItem('jm-intro', '1'); } catch (e) {}
    const anims = [];
    const add = a => (anims.push(a), a);
    $$('.ch', title).forEach((c, n) => add(c.animate([{ transform: 'translateY(115%)' }, { transform: 'none' }], { duration: 1150, delay: 420 + n * 40, easing: EASE, fill: 'backwards' })));
    $$('[data-intro="fade"]').forEach((el, n) => add(el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 1300 + n * 110, easing: EASE, fill: 'backwards' })));
    if (!draft.hidden) add(draft.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 2100, fill: 'backwards' }));
    const art = arts[0], img = $('img', art), lab = $('.label', hangs[0]);
    const r = art.getBoundingClientRect();
    if (isH && r.width) {
      const svg = $('.intro-frame'), rect = $('rect', svg);
      svg.style.display = 'block';
      svg.setAttribute('width', r.width + 1); svg.setAttribute('height', r.height + 1);
      svg.style.transform = `translate(${r.left - .5}px, ${r.top - .5}px)`;
      rect.setAttribute('width', r.width); rect.setAttribute('height', r.height);
      const per = 2 * (r.width + r.height);
      rect.style.strokeDasharray = per;
      add(rect.animate([{ strokeDashoffset: per }, { strokeDashoffset: 0 }], { duration: 1100, easing: GLIDE, fill: 'both' }));
      const fade = add(svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 1750, fill: 'forwards' }));
      fade.finished.then(() => { svg.style.display = 'none'; }, () => { svg.style.display = 'none'; });
      add(art.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }], { duration: 1200, delay: 750, easing: GLIDE, fill: 'backwards' }));
      add(img.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 1900, delay: 750, easing: EASE, fill: 'backwards' }));
      add(lab.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 1800, easing: EASE, fill: 'backwards' }));
    }
    root.classList.remove('intro');
    const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    const off = () => evs.forEach(ev => removeEventListener(ev, skip));
    const skip = () => { anims.forEach(a => { try { a.finish(); } catch (e) {} }); off(); };
    evs.forEach(ev => addEventListener(ev, skip, { passive: true }));
    setTimeout(off, 3300);
  };

  /* Start */
  measure();
  addEventListener('resize', () => { clearTimeout(measure.t); measure.t = setTimeout(measure, 120); });
  addEventListener('load', measure);
  hangs.forEach(h => { const im = $('img', h); if (!im.complete) im.addEventListener('load', measure, { once: true }); });
  cur = wallTarget();
  requestAnimationFrame(tick);

  if (root.classList.contains('intro')) {
    const firstImg = $('img', arts[0]);
    Promise.race([
      Promise.all([document.fonts && document.fonts.ready, firstImg.decode ? firstImg.decode().catch(() => {}) : null]),
      new Promise(r => setTimeout(r, 900))
    ]).then(() => { if (scrollY < 10) runIntro(); else root.classList.remove('intro'); });
  }
})();

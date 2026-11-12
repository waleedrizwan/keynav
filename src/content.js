(() => {
  if (window.__keynav) return;
  window.__keynav = true;

  // ---------- what counts as clickable ----------
  const SELECTOR = [
    'a[href]',
    'button',
    'input:not([type=hidden])',
    'select',
    'textarea',
    'summary',
    'label[for]',
    '[contenteditable=""]',
    '[contenteditable="true"]',
    '[onclick]',
    '[tabindex]:not([tabindex="-1"])',
    '[role=button]',
    '[role=link]',
    '[role=checkbox]',
    '[role=radio]',
    '[role=switch]',
    '[role=tab]',
    '[role=menuitem]',
    '[role=menuitemcheckbox]',
    '[role=menuitemradio]',
    '[role=option]',
    '[role=treeitem]',
    '[role=combobox]',
    '[role=textbox]',
  ].join(',');

  const HINT_CHARS = 'asdfjklghqweruio'; // home row first
  const SCROLL_STEP = 90;

  let mode = 'normal'; // 'normal' | 'hints' | 'cycle'
  let hints = [];
  let typed = '';
  let hintNewTab = false;
  let cycleList = [];
  let cycleIdx = 0;
  let pendingG = false;

  // ---------- overlay (shadow DOM so page CSS can't touch it) ----------
  let host, root;
  function layer() {
    if (!host || !host.isConnected) {
      host = document.createElement('keynav-overlay');
      host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
      root = host.attachShadow({ mode: 'closed' });
      root.innerHTML = `<style>
        .hint{position:fixed;font:bold 12px/1 ui-monospace,Menlo,Consolas,monospace;padding:2px 4px;
          background:#ffd84d;color:#1a1a1a;border:1px solid #b89400;border-radius:3px;
          box-shadow:0 1px 3px rgba(0,0,0,.45);text-transform:uppercase;letter-spacing:.5px}
        .hint .t{color:#a07d00}
        .ring{position:fixed;border:2px solid #ff3b7f;border-radius:4px;
          box-shadow:0 0 0 4px rgba(255,59,127,.25)}
        .bar{position:fixed;bottom:10px;right:10px;font:12px ui-monospace,Menlo,Consolas,monospace;
          background:#1a1a1a;color:#fff;padding:5px 9px;border-radius:5px;opacity:.9}
      </style><div id="layer"></div>`;
      document.documentElement.appendChild(host);
    }
    return root.getElementById('layer');
  }
  const clearLayer = () => layer().replaceChildren();

  function flash(text, ms = 1200) {
    const d = document.createElement('div');
    d.className = 'bar';
    d.textContent = text;
    layer().appendChild(d);
    setTimeout(() => d.remove(), ms);
  }

  // ---------- DOM helpers ----------
  function* walk(node) {
    const tw = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
    for (let n = /** @type {Node | null} */ (tw.currentNode); n; n = tw.nextNode()) {
      if (!(n instanceof Element)) continue;
      yield n;
      if (n.shadowRoot) yield* walk(n.shadowRoot); // open shadow roots
    }
  }

  const parentOf = (n) =>
    n.parentNode instanceof ShadowRoot ? n.parentNode.host : n.parentElement;

  function composedContains(a, b) {
    for (let n = b; n; n = n.parentNode || n.host) if (n === a) return true;
    return false;
  }

  function deepElementFromPoint(x, y) {
    let e = document.elementFromPoint(x, y);
    while (e && e.shadowRoot) {
      const inner = e.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === e) break;
      e = inner;
    }
    return e;
  }

  function deepActiveElement() {
    let a = document.activeElement;
    while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement;
    return a;
  }

  const TEXTLESS_INPUTS = [
    'button',
    'submit',
    'reset',
    'checkbox',
    'radio',
    'image',
    'file',
    'color',
    'range',
  ];
  function isEditable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') return !TEXTLESS_INPUTS.includes((el.type || 'text').toLowerCase());
    return false;
  }

  // ---------- finding clickables ----------
  function onScreenRect(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 3 || r.height < 3) return null;
    if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return null;
    return r;
  }

  function notCovered(el, r) {
    const pts = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + Math.min(4, r.width / 2), r.top + Math.min(4, r.height / 2)],
    ];
    for (const [x0, y0] of pts) {
      const x = Math.min(Math.max(x0, 0), innerWidth - 1);
      const y = Math.min(Math.max(y0, 0), innerHeight - 1);
      const top = deepElementFromPoint(x, y);
      if (top && (top === el || composedContains(el, top))) return true;
    }
    return false;
  }

  // returns 'strong' (semantic), 'weak' (heuristic), or null
  function clickKind(el) {
    if (el === host) return null;
    if (el.matches(SELECTOR)) {
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return null;
      return 'strong';
    }
    if (el.hasAttribute('data-keynav-click')) return 'weak';
    const cs = getComputedStyle(el);
    if (cs.cursor === 'pointer') {
      const p = parentOf(el);
      if (!p || getComputedStyle(p).cursor !== 'pointer') return 'weak';
    }
    return null;
  }

  function collect() {
    const found = new Map(); // el -> {el, rect, kind}
    for (const el of walk(document.documentElement)) {
      const rect = onScreenRect(el);
      if (!rect) continue;
      const kind = clickKind(el);
      if (!kind) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      if (!notCovered(el, rect)) continue;
      found.set(el, { el, rect, kind });
    }
    // Drop heuristic-only matches that sit inside another clickable (avoids double labels).
    const out = [];
    for (const item of found.values()) {
      if (item.kind === 'weak') {
        let dup = false;
        for (let p = parentOf(item.el); p; p = parentOf(p)) {
          if (found.has(p)) {
            dup = true;
            break;
          }
        }
        if (dup) continue;
      }
      out.push(item);
    }
    // reading order
    out.sort(
      (a, b) =>
        Math.round(a.rect.top / 12) - Math.round(b.rect.top / 12) || a.rect.left - b.rect.left,
    );
    return out;
  }

  // ---------- activating an element ----------
  function activate(el, newTab) {
    exitMode();
    if (newTab) {
      const a = el.closest('a[href]');
      if (a && a.href && !a.href.startsWith('javascript:')) {
        chrome.runtime.sendMessage({ type: 'open', url: a.href });
        return;
      }
    }
    if (isEditable(el)) {
      el.focus();
      return;
    }
    if (el.tagName === 'SELECT') {
      el.focus();
      try {
        el.showPicker();
      } catch (_) {}
      return;
    }
    el.focus({ preventScroll: true });
    const r = el.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: r.left + r.width / 2,
      clientY: r.top + r.height / 2,
      button: 0,
    };
    // Some frameworks listen for pointer/mouse down/up rather than click.
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.click();
  }

  // ---------- hint mode ----------
  function makeLabels(n) {
    const c = HINT_CHARS;
    let len = 1;
    while (c.length ** len < n) len++;
    const out = [];
    for (let i = 0; i < n; i++) {
      let s = '';
      for (let j = 0, x = i; j < len; j++, x = Math.floor(x / c.length)) s = c[x % c.length] + s;
      out.push(s);
    }
    return out;
  }

  function startHints(newTab) {
    const items = collect();
    if (!items.length) {
      flash('No clickable elements found');
      return;
    }
    mode = 'hints';
    typed = '';
    hintNewTab = newTab;
    const labels = makeLabels(items.length);
    const l = layer();
    l.replaceChildren();
    hints = items.map((it, i) => {
      const d = document.createElement('div');
      d.className = 'hint';
      d.style.left = Math.max(0, it.rect.left) + 'px';
      d.style.top = Math.max(0, it.rect.top) + 'px';
      d.textContent = labels[i];
      l.appendChild(d);
      return { el: it.el, label: labels[i], div: d };
    });
    if (newTab) flash('Open in new tab', 900);
  }

  function updateHints() {
    const live = hints.filter((h) => h.label.startsWith(typed));
    if (!live.length) {
      exitMode();
      return;
    }
    if (live.length === 1 && live[0].label === typed) {
      activate(live[0].el, hintNewTab);
      return;
    }
    for (const h of hints) {
      if (h.label.startsWith(typed)) {
        h.div.style.display = '';
        h.div.innerHTML = `<span class="t">${typed}</span>${h.label.slice(typed.length)}`;
      } else {
        h.div.style.display = 'none';
      }
    }
  }

  // ---------- cycle mode ----------
  function startCycle() {
    cycleList = collect();
    if (!cycleList.length) {
      flash('No clickable elements found');
      return;
    }
    mode = 'cycle';
    cycleIdx = 0;
    drawRing();
  }

  function drawRing() {
    const el = cycleList[cycleIdx]?.el;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) el.scrollIntoView({ block: 'center' });
    const r2 = el.getBoundingClientRect();
    const l = layer();
    l.replaceChildren();
    const ring = document.createElement('div');
    ring.className = 'ring';
    Object.assign(ring.style, {
      left: r2.left - 3 + 'px',
      top: r2.top - 3 + 'px',
      width: r2.width + 2 + 'px',
      height: r2.height + 2 + 'px',
    });
    const bar = document.createElement('div');
    bar.className = 'bar';
    const name = (
      el.getAttribute('aria-label') ||
      el.innerText ||
      el.value ||
      el.title ||
      el.tagName
    )
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 50);
    bar.textContent = `${cycleIdx + 1}/${cycleList.length}  ${name}   j/k move · ⏎ click · ⇧⏎ new tab · esc`;
    l.append(ring, bar);
  }

  function exitMode() {
    mode = 'normal';
    hints = [];
    typed = '';
    cycleList = [];
    clearLayer();
  }

  // ---------- scrolling ----------
  function scrollTarget() {
    const de = document.scrollingElement || document.documentElement;
    if (de.scrollHeight > innerHeight + 5) return de;
    // App-style pages scroll an inner container; pick the biggest visible one.
    let best = de,
      bestArea = 0;
    for (const el of walk(document.body || document.documentElement)) {
      if (el.scrollHeight <= el.clientHeight + 5) continue;
      const oy = getComputedStyle(el).overflowY;
      if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') continue;
      const r = el.getBoundingClientRect();
      const area = r.width * r.height;
      if (area > bestArea) {
        best = el;
        bestArea = area;
      }
    }
    return best;
  }
  const scrollByY = (dy) => scrollTarget().scrollBy({ top: dy, behavior: 'auto' });

  // ---------- keys ----------
  function swallow(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  function onKey(e) {
    // Ignore keys synthesized by page scripts; otherwise any site could close tabs,
    // open tabs or click elements by dispatching fake KeyboardEvents.
    if (!e.isTrusted) return;
    if (e.isComposing) return;

    if (mode === 'hints') {
      swallow(e);
      if (e.key === 'Escape') return exitMode();
      if (e.key === 'Backspace') {
        typed = typed.slice(0, -1);
        return updateHints();
      }
      const k = e.key.toLowerCase();
      if (k.length === 1 && HINT_CHARS.includes(k)) {
        typed += k;
        updateHints();
      }
      return;
    }

    if (mode === 'cycle') {
      swallow(e);
      const n = cycleList.length;
      switch (e.key) {
        case 'Escape':
          return exitMode();
        case 'j':
        case 'ArrowDown':
        case 'l':
        case 'ArrowRight':
          cycleIdx = (cycleIdx + 1) % n;
          return drawRing();
        case 'k':
        case 'ArrowUp':
        case 'h':
        case 'ArrowLeft':
          cycleIdx = (cycleIdx - 1 + n) % n;
          return drawRing();
        case 'Tab':
          cycleIdx = (cycleIdx + (e.shiftKey ? -1 : 1) + n) % n;
          return drawRing();
        case 'Enter':
          return activate(cycleList[cycleIdx].el, e.shiftKey);
      }
      return;
    }

    // normal mode
    const active = deepActiveElement();
    if (isEditable(active) || active?.tagName === 'SELECT') {
      if (e.key === 'Escape' && active instanceof HTMLElement) {
        active.blur();
        swallow(e);
      }
      return; // let typing happen
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const key = e.key;
    if (pendingG) {
      pendingG = false;
      if (key === 'g') {
        swallow(e);
        scrollTarget().scrollTo({ top: 0 });
        return;
      }
      if (key === 'i') {
        swallow(e);
        const field = collect().find((it) => isEditable(it.el));
        if (field) field.el.focus();
        else flash('No text field visible');
        return;
      }
    }

    const actions = {
      f: () => startHints(false),
      F: () => startHints(true),
      ';': () => startCycle(),
      j: () => scrollByY(SCROLL_STEP),
      k: () => scrollByY(-SCROLL_STEP),
      d: () => scrollByY(innerHeight / 2),
      u: () => scrollByY(-innerHeight / 2),
      G: () => {
        const t = scrollTarget();
        t.scrollTo({ top: t.scrollHeight });
      },
      g: () => {
        pendingG = true;
        setTimeout(() => (pendingG = false), 800);
      },
      H: () => history.back(),
      L: () => history.forward(),
      J: () => chrome.runtime.sendMessage({ type: 'tab', dir: 1 }),
      K: () => chrome.runtime.sendMessage({ type: 'tab', dir: -1 }),
      x: () => chrome.runtime.sendMessage({ type: 'close' }),
      t: () => chrome.runtime.sendMessage({ type: 'newtab' }),
      r: () => location.reload(),
      '?': () =>
        flash(
          'f click · F new tab · ; step through · gi focus field · j/k scroll · d/u half page · gg/G top/bottom · H/L back/fwd · J/K tabs · t new · x close',
          6000,
        ),
    };
    if (actions[key]) {
      swallow(e);
      actions[key]();
    }
  }

  window.addEventListener('keydown', onKey, true);

  // Hints are positioned for the current viewport; drop them if it moves.
  window.addEventListener(
    'scroll',
    () => {
      if (mode === 'hints') exitMode();
      else if (mode === 'cycle') drawRing();
    },
    true,
  );
  window.addEventListener('resize', () => {
    if (mode !== 'normal') exitMode();
  });
})();

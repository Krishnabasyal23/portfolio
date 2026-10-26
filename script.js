// Scroll reveal. Panels unroll once their top edge is near the bottom of the screen.
// This checks scroll position instead of using IntersectionObserver, because a panel that is
// clipped to nothing before it unrolls can be reported as not visible and would never open.
// Without JS everything is simply visible, because the hidden state only exists under .armed.
let pending = [...document.querySelectorAll(".reveal")];
if (pending.length) {
  document.documentElement.classList.add("armed");
  const reveal = () => {
    const limit = innerHeight * 0.88;
    // At the very bottom (or when the whole page fits on screen) nothing more can scroll into range, so open everything.
    const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
    pending = pending.filter((el) => {
      if (!atEnd && el.getBoundingClientRect().top >= limit) return true;
      el.classList.add("in");
      return false;
    });
    if (!pending.length) {
      removeEventListener("scroll", reveal);
      removeEventListener("resize", reveal);
    }
  };
  addEventListener("scroll", reveal, { passive: true });
  addEventListener("resize", reveal);
  reveal();
}

// The plate cat's pupils look toward the pointer, moving at most 1.6 drawing units.
const pupils = document.querySelectorAll(".pupil");
if (pupils.length) {
  addEventListener("pointermove", (e) => {
    const box = pupils[0].ownerSVGElement.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height * 0.4);
    const dist = Math.hypot(dx, dy) || 1;
    const reach = 1.6 * Math.min(1, dist / 200);
    for (const p of pupils) {
      p.style.transform = `translate(${(dx / dist) * reach}px, ${(dy / dist) * reach}px)`;
    }
  });
}

// Pocket Catino. Each round: pick a secret, publish its SHA-256 (the seal), derive the crash point
// from a second hash of the same secret, run the round, then reveal the secret so anyone can re-check.
(() => {
  const $ = (id) => document.getElementById(id);
  const go = $("go"), out = $("out");
  if (!go) return;
  if (!(window.crypto && crypto.subtle)) {
    $("status").textContent = "The game needs a secure page (https or localhost) for SHA-256.";
    go.disabled = true;
    return;
  }

  const sha256 = async (text) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  };
  // First 32 bits of the hash become r in [0, 1); 97 / (1 - r) gives a heavy-tailed multiplier,
  // so about 3% of rounds crash at 1.00x. Capped at 50x.
  const crashFrom = (hex) => {
    const r = parseInt(hex.slice(0, 8), 16) / 2 ** 32;
    return Math.min(50, Math.max(1, Math.floor(97 / (1 - r)) / 100));
  };

  let secret, seal, crash, t0, mult, running = false, rounds = 0;
  let best = 0;
  try { best = parseFloat(localStorage.getItem("catino-lite-best")) || 0; } catch { /* storage blocked: start at none */ }
  const showBest = () => { $("best").textContent = best ? best.toFixed(2) + "\u00d7" : "none yet"; };
  showBest();

  const show = (m) => {
    $("mult").textContent = m.toFixed(2) + "\u00d7";
    // Distance walked grows with log(multiplier); the cat stops at 80% of the track.
    $("runner").style.setProperty("--p", Math.min(1, Math.log(m) / Math.log(20)) * 0.8);
  };

  const start = async () => {
    go.disabled = true;
    $("fly").hidden = true;
    $("reveal").hidden = true;
    secret = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
    seal = await sha256(secret);
    crash = crashFrom(await sha256(secret + ":crash"));
    $("seal").textContent = seal;
    $("status").textContent = "Sealed. The cat is walking: cash out before it spots the butterfly.";
    mult = 1;
    show(1);
    running = true;
    out.disabled = false;
    t0 = performance.now();
    requestAnimationFrame(tick);
  };

  const tick = (now) => {
    if (!running) return;
    mult = Math.floor(Math.exp(0.18 * ((now - t0) / 1000)) * 100) / 100;
    if (mult >= crash) return end(false);
    show(mult);
    requestAnimationFrame(tick);
  };

  const end = async (won) => {
    running = false;
    out.disabled = true;
    rounds += 1;
    $("rounds").textContent = rounds;
    $("secret").textContent = secret;
    $("reveal").hidden = false;
    // Re-derive everything from the revealed secret, the same check a visitor could do by hand.
    const ok = (await sha256(secret)) === seal && crashFrom(await sha256(secret + ":crash")) === crash;
    const check = ok ? " Seal checked: SHA-256 of the secret matches, and the crash point follows from it." : " Seal check failed.";
    if (won) {
      show(mult);
      if (mult > best) {
        best = mult;
        try { localStorage.setItem("catino-lite-best", String(mult)); } catch { /* private mode: skip */ }
        showBest();
      }
      $("status").textContent = `Cashed out at ${mult.toFixed(2)}\u00d7. The butterfly was due at ${crash.toFixed(2)}\u00d7.` + check;
    } else {
      show(crash);
      $("fly").hidden = false;
      $("status").textContent = `Distracted at ${crash.toFixed(2)}\u00d7! The butterfly got there first.` + check;
    }
    go.textContent = "Another round";
    go.disabled = false;
  };

  go.addEventListener("click", start);
  out.addEventListener("click", () => running && end(true));
})();

// Drifting peach blossoms, drawn as 14 CSS-animated petals. Skipped for visitors who prefer reduced motion.
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const layer = document.createElement("div");
  layer.className = "petals";
  layer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 14; i++) {
    const p = document.createElement("i");
    p.style.cssText = `left:${Math.random() * 100}%;--s:${8 + Math.random() * 8}px;--d:${16 + Math.random() * 14}s;--x:${Math.random() * 160 - 80}px;animation-delay:${-Math.random() * 30}s`;
    layer.append(p);
  }
  document.body.append(layer);
}

// Mark the nav link for the section nearest the middle of the screen.
const navLinks = [...document.querySelectorAll(".top nav a")];
if ("IntersectionObserver" in window && navLinks.length) {
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      for (const a of navLinks) {
        if (a.getAttribute("href") === "#" + e.target.id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      }
    }
  }, { rootMargin: "-40% 0px -55% 0px" });
  navLinks.forEach((a) => { const t = document.querySelector(a.getAttribute("href")); if (t && t.tagName === "SECTION") spy.observe(t); });
}

// Portal jump. Clicking an in-page link opens a spark-drawn ring, swells it over the screen, jumps to
// the section, then reopens the ring at the destination and lets it dissolve (about 3 seconds).
// Click anywhere or press Escape to skip ahead. Not used when the visitor prefers reduced motion,
// and any click with a modifier key keeps the normal browser behaviour.
const portalCanvas = document.getElementById("portal");
const portalFx = (() => {
  if (!portalCanvas) return null;
  const ctx = portalCanvas.getContext("2d");
  // Timeline in milliseconds: build the ring, hold it, swell over the screen, emerge at the target, fade.
  const BUILD = 1000, HOLD = 1500, SWALLOW = 2100, EMERGE = 2600, END = 3000;
  const TAU = Math.PI * 2;
  const easeOut = (x) => 1 - (1 - x) ** 3;
  const easeIn = (x) => x ** 3;
  const easeInOut = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const COLORS = ["#ffd27a", "#ffb347", "#ff8a1f", "#fff0c2"];
  const fx = { running: false };
  let w, h, dpr, cx, cy, baseR, maxR, t, parts, jumped, onJump, last;

  // Size of the ring, how much of it is drawn, how orange the whole screen is, and overall opacity at time t.
  const shape = (ms) => {
    if (ms < BUILD) return { R: baseR * easeOut(ms / BUILD), reveal: easeInOut(clamp01(ms / 900)), wash: 0, alpha: 1 };
    if (ms < HOLD) return { R: baseR * (1 + 0.04 * Math.sin(ms / 60)), reveal: 1, wash: 0.12 * ((ms - BUILD) / (HOLD - BUILD)), alpha: 1 };
    if (ms < SWALLOW) {
      const k = easeIn((ms - HOLD) / (SWALLOW - HOLD));
      return { R: baseR + (maxR - baseR) * k, reveal: 1, wash: 0.12 + 0.88 * k, alpha: 1 };
    }
    if (ms < EMERGE) {
      const k = easeOut((ms - SWALLOW) / (EMERGE - SWALLOW));
      return { R: maxR + (baseR * 1.1 - maxR) * k, reveal: 1, wash: 1 - 0.9 * k, alpha: 1 };
    }
    const k = clamp01((ms - EMERGE) / (END - EMERGE));
    return { R: baseR * 1.1, reveal: 1, wash: 0.1 * (1 - k), alpha: 1 - k };
  };

  const spawnRate = (ms) => (ms < HOLD ? 150 : ms < SWALLOW ? 260 : ms < EMERGE ? 180 : 60); // sparks per second

  const step = (dt) => {
    const s = shape(t);
    const spin = (t / 1000) * 1.6;
    const n = (spawnRate(t) * dt) / 1000 * s.reveal;
    for (let i = 0; i < n + Math.random(); i++) {
      if (parts.length > 450) break;
      const a = spin + Math.random() * TAU * s.reveal;
      const speed = 40 + Math.random() * 110;
      parts.push({
        x: cx + Math.cos(a) * s.R, y: cy + Math.sin(a) * s.R,
        vx: -Math.sin(a) * speed * 0.6 + Math.cos(a) * speed * 0.7,
        vy: Math.cos(a) * speed * 0.6 + Math.sin(a) * speed * 0.7 - 20,
        age: 0, life: 500 + Math.random() * 800, size: 1.2 + Math.random() * 2.4,
        color: COLORS[(Math.random() * COLORS.length) | 0],
      });
    }
    const sec = dt / 1000;
    for (const p of parts) { p.age += dt; p.vy += 160 * sec; p.x += p.vx * sec; p.y += p.vy * sec; }
    parts = parts.filter((p) => p.age < p.life);
  };

  const ring = (R, width, dash, rot, reveal, alpha) => {
    ctx.save();
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(255,179,71,${alpha})`;
    ctx.beginPath();
    ctx.arc(cx, cy, R, rot, rot + TAU * reveal);
    ctx.stroke();
    ctx.restore();
  };

  const polygon = (R, sides, rot) => {
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const a = rot + (i / sides) * TAU;
      ctx[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    }
    ctx.stroke();
  };

  const draw = () => {
    const s = shape(t);
    const spin = t / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
    if (s.wash > 0) { ctx.fillStyle = `rgba(255,140,30,${s.wash * 0.85})`; ctx.fillRect(0, 0, w, h); }
    if (s.R > 1) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s.R);
      g.addColorStop(0, `rgba(255,210,120,${0.35 * s.alpha})`);
      g.addColorStop(1, `rgba(255,120,20,${0.12 * s.alpha})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, s.R, 0, TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "#ff8a1f";
    ctx.shadowBlur = 14;
    ring(s.R, 4, [6, 10, 60, 10], spin * 1.6, s.reveal, s.alpha);
    ring(s.R * 0.82, 2.5, [3, 8], -spin * 2.2, s.reveal, s.alpha);
    ring(s.R * 0.64, 3, [26, 12, 4, 12], spin * 2.8, s.reveal, s.alpha);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = `rgba(255,210,120,${0.8 * s.alpha * s.reveal})`;
    ctx.setLineDash([]);
    polygon(s.R * 0.5, 4, spin * 0.8);
    polygon(s.R * 0.5, 4, spin * 0.8 + Math.PI / 4);
    polygon(s.R * 0.9, 24, -spin * 0.5); // a ring of small facets
    ctx.shadowBlur = 8;
    for (const p of parts) {
      const life = 1 - p.age / p.life;
      ctx.globalAlpha = life * s.alpha;
      ctx.strokeStyle = ctx.fillStyle = p.color;
      ctx.lineWidth = p.size * 0.6;
      ctx.beginPath(); ctx.moveTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + life * 0.5), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  };

  const frame = (now) => {
    if (!fx.running) return;
    const dt = Math.min(50, now - last);
    last = now;
    t += dt;
    step(dt);
    if (!jumped && t >= SWALLOW) {
      jumped = true;
      onJump();
      cx = w / 2;
      cy = h * 0.4;
    }
    draw();
    if (t < END) requestAnimationFrame(frame);
    else fx.stop();
  };

  fx.reset = (x, y, jump) => {
    dpr = window.devicePixelRatio || 1;
    w = innerWidth; h = innerHeight;
    portalCanvas.width = w * dpr; portalCanvas.height = h * dpr;
    baseR = Math.max(90, Math.min(170, Math.min(w, h) * 0.22));
    maxR = Math.hypot(w, h);
    cx = x; cy = y; t = 0; parts = []; jumped = false; onJump = jump;
  };
  fx.start = (x, y, jump) => {
    fx.reset(x, y, jump);
    fx.running = true;
    portalCanvas.classList.add("on");
    last = performance.now();
    requestAnimationFrame(frame);
  };
  fx.skip = () => { if (fx.running && t < SWALLOW) t = SWALLOW; };
  fx.stop = () => {
    fx.running = false;
    ctx.clearRect(0, 0, portalCanvas.width, portalCanvas.height);
    portalCanvas.classList.remove("on");
  };
  // Deterministic preview: simulate up to ms in 16ms steps and draw that frame (used for screenshots).
  fx.seek = (ms) => { while (t < ms) { t += 16; step(16); if (!jumped && t >= SWALLOW) { jumped = true; cx = w / 2; cy = h * 0.4; } } draw(); };
  return fx;
})();

if (portalFx) {
  const calm = matchMedia("(prefers-reduced-motion: reduce)");
  // While the effect runs the canvas covers the page, so block wheel and touch scrolling and let a click skip ahead.
  portalCanvas.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });
  portalCanvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  portalCanvas.addEventListener("click", () => portalFx.skip());
  addEventListener("keydown", (e) => { if (e.key === "Escape") portalFx.skip(); });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href");
      const target = id.length > 1 && document.querySelector(id);
      if (!target || link.classList.contains("skip") || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      if (calm.matches) return;
      e.preventDefault();
      if (portalFx.running) return;
      const box = link.getBoundingClientRect();
      portalFx.start(box.left + box.width / 2, box.top + box.height / 2, () => {
        target.scrollIntoView({ behavior: "instant" });
        history.pushState(null, "", id);
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      });
    });
  });
}

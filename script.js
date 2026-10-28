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
    document.dispatchEvent(new CustomEvent("stamp", { detail: "play" }));
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
  const BUILD = 550, HOLD = 800, SWALLOW = 1150, EMERGE = 1450, END = 1700;
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
    ms = Math.max(0, ms);
    if (ms < BUILD) return { R: baseR * easeOut(ms / BUILD), reveal: easeInOut(clamp01(ms / (BUILD * 0.9))), wash: 0, alpha: 1 };
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
    const dt = Math.max(0, Math.min(50, now - last)); // rAF timestamps can be a hair behind performance.now()
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
        document.dispatchEvent(new CustomEvent("stamp", { detail: "portal" }));
      });
    });
  });
}

// Kathmandu clock and living sky. Nepal is fixed at UTC+5:45 with no daylight saving, so the offset is a constant.
(() => {
  const clock = document.getElementById("clock");
  if (!clock) return;
  const KTM_OFFSET_MIN = 345;
  const timeEl = document.getElementById("ktm-time");
  const diffEl = document.getElementById("ktm-diff");
  const skyBtn = document.getElementById("sky-btn");
  const skyName = document.getElementById("sky-name");
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const SKIES = ["night", "dawn", "day", "dusk"];
  let previewing = false;

  const skyFor = (hour) => (hour < 5 || hour >= 20 ? "night" : hour < 8 ? "dawn" : hour < 17 ? "day" : "dusk");
  const setSky = (name) => { document.documentElement.dataset.sky = name; skyName.textContent = name; };

  const tick = () => {
    const now = new Date();
    timeEl.textContent = fmt.format(now);
    const mins = KTM_OFFSET_MIN + now.getTimezoneOffset(); // Kathmandu minus the visitor, in minutes
    const h = Math.floor(Math.abs(mins) / 60), m = Math.abs(mins) % 60;
    diffEl.textContent = mins === 0 ? "the same time as you"
      : `${h ? h + "h " : ""}${m ? m + "m " : ""}${mins > 0 ? "ahead of" : "behind"} you`;
    if (!previewing) setSky(skyFor(now.getHours()));
  };

  skyBtn.addEventListener("click", () => {
    previewing = true;
    setSky(SKIES[(SKIES.indexOf(document.documentElement.dataset.sky) + 1) % SKIES.length]);
  });

  clock.hidden = false;
  tick();
  setInterval(tick, 1000);
})();

// Passport. Features announce progress with a "stamp" event; this file decides which stamps exist, saves them
// in localStorage (wrapped in try/catch because it can be blocked) and shows them.
const passport = (() => {
  const $ = (id) => document.getElementById(id);
  const btn = $("pp-btn"), panel = $("pp-panel");
  if (!btn || !panel) return null;
  const STAMPS = [ // the order here is the order in the booklet
    { id: "arrive", label: "Arrived", hint: "Open the site", color: "#1f5a45", tilt: "-7deg" },
    { id: "work", label: "Inspected", hint: "See all five projects", color: "#9b2218", tilt: "5deg" },
    { id: "portal", label: "Portal", hint: "Jump to a section", color: "#a34a12", tilt: "-4deg" },
    { id: "play", label: "Played", hint: "Finish a round of Pocket Catino", color: "#1f2f5c", tilt: "6deg" },
    { id: "cat", label: "Purred", hint: "Pet the cat in the colophon", color: "#6b3a8a", tilt: "-6deg" },
    { id: "reach", label: "Reached", hint: "Scroll down to the colophon", color: "#6b4f0e", tilt: "4deg" },
    { id: "momo", label: "Folded", hint: "Serve 3 momos in Momo Rush", color: "#8a2e5a", tilt: "-5deg" },
  ];
  let got = {};
  try { got = JSON.parse(localStorage.getItem("portfolio-passport")) || {}; } catch { /* storage blocked: stamps last this visit only */ }
  const count = () => STAMPS.filter((s) => got[s.id]).length;
  let toastTimer;

  const say = (text) => {
    const toast = $("pp-toast");
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  };

  const render = () => {
    const grid = $("pp-grid");
    grid.replaceChildren();
    for (const s of STAMPS) {
      const li = document.createElement("li");
      li.className = "pp-stamp" + (got[s.id] ? " got" : "");
      li.style.setProperty("--c", s.color);
      li.style.setProperty("--r", s.tilt);
      const mark = document.createElement("div");
      mark.className = "pp-mark";
      mark.setAttribute("aria-hidden", "true");
      if (got[s.id]) { const t = document.createElement("span"); t.textContent = s.label; mark.append(t); } else mark.textContent = "?";
      const text = document.createElement("div");
      if (got[s.id]) {
        const name = document.createElement("strong");
        name.textContent = s.label;
        const when = new Date(got[s.id]).toLocaleDateString(undefined, { day: "numeric", month: "short" });
        text.append(name, when);
      } else text.textContent = s.hint;
      li.append(mark, text);
      grid.append(li);
    }
    $("pp-count").textContent = count();
    $("pp-total").textContent = STAMPS.length;
    $("pp-visa").hidden = count() < STAMPS.length;
  };

  const award = (id) => {
    const stamp = STAMPS.find((s) => s.id === id);
    if (!stamp || got[id]) return;
    got[id] = new Date().toISOString();
    try { localStorage.setItem("portfolio-passport", JSON.stringify(got)); } catch { /* ignore */ }
    render();
    say(count() === STAMPS.length ? "Visa approved! Open your passport." : `New stamp: ${stamp.label}`);
    btn.classList.remove("pulse");
    void btn.offsetWidth; // restart the pulse animation
    btn.classList.add("pulse");
  };

  const setOpen = (open) => {
    panel.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      $("pp-title").focus();
      if (!$("pp-visa").hidden) $("pp-visa").scrollIntoView({ block: "nearest" }); // bring the finale into view
    } else btn.focus();
  };
  btn.addEventListener("click", () => setOpen(panel.hidden));
  $("pp-close").addEventListener("click", () => setOpen(false));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) setOpen(false); });
  document.addEventListener("stamp", (e) => award(e.detail));
  // The visa points at the real contact links in the colophon; the portal script handles the jump.
  $("pp-contact").addEventListener("click", () => { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); });

  // Stamps that depend on how far the visitor has scrolled.
  const check = () => {
    if (document.querySelectorAll("#work .panel.in").length >= 5) award("work");
    const end = document.getElementById("colophon");
    if (end && end.getBoundingClientRect().top < innerHeight * 0.7) award("reach");
  };
  addEventListener("scroll", check, { passive: true });

  // Petting the cat on the bestiary plate.
  const plate = document.querySelector(".plate svg");
  if (plate) {
    const pet = () => {
      plate.classList.remove("petted");
      void plate.getBoundingClientRect();
      plate.classList.add("petted");
      say("Purr.");
      award("cat");
    };
    plate.addEventListener("click", pet);
    plate.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pet(); } });
  }

  btn.hidden = false;
  render();
  setTimeout(() => award("arrive"), 900);
  check();
  return { award, say };
})();

// Altitude meter. Scroll position is mapped onto a trek: each section top is a waypoint with a real altitude,
// and between two waypoints the altitude is interpolated in a straight line.
const trek = (() => {
  const meter = document.getElementById("alt");
  if (!meter) return null;
  const WAYPOINTS = [
    { name: "Kathmandu", m: 1400, sel: null }, // top of the page
    { name: "Lukla", m: 2860, sel: "#work" },
    { name: "Namche Bazaar", m: 3440, sel: "#skills" },
    { name: "Dingboche", m: 4410, sel: "#play" },
    { name: "Everest Base Camp", m: 5364, sel: "#path" },
    { name: "Summit", m: 8849, sel: "#colophon" },
  ];
  const LOW = WAYPOINTS[0].m, HIGH = WAYPOINTS[WAYPOINTS.length - 1].m;
  const stops = document.getElementById("alt-stops");
  const items = WAYPOINTS.map((w) => {
    const li = document.createElement("li");
    li.textContent = w.name;
    li.style.setProperty("--p", (w.m - LOW) / (HIGH - LOW));
    stops.append(li);
    return li;
  });

  // Scroll positions where each waypoint is reached (when its section's top is 40% down the screen),
  // forced to strictly increase so the interpolation never divides by zero.
  const positions = () => {
    const ys = WAYPOINTS.map((w) => (w.sel ? document.querySelector(w.sel).getBoundingClientRect().top + scrollY - innerHeight * 0.4 : 0));
    for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + 1);
    return ys;
  };

  const altitudeAt = (y, ys) => {
    if (y <= ys[0]) return LOW;
    for (let i = 1; i < ys.length; i++) {
      if (y <= ys[i]) return WAYPOINTS[i - 1].m + ((y - ys[i - 1]) / (ys[i] - ys[i - 1])) * (WAYPOINTS[i].m - WAYPOINTS[i - 1].m);
    }
    return HIGH;
  };

  const update = (y = scrollY) => {
    const alt = altitudeAt(y, positions());
    let here = 0;
    WAYPOINTS.forEach((w, i) => { if (alt >= w.m - 0.5) here = i; });
    document.getElementById("alt-m").textContent = Math.round(alt).toLocaleString("en-US");
    document.getElementById("alt-name").textContent = WAYPOINTS[here].name;
    document.getElementById("alt-cat").style.setProperty("--p", (alt - LOW) / (HIGH - LOW));
    items.forEach((li, i) => li.classList.toggle("passed", i <= here));
  };

  // The meter is optional and off by default. The choice is remembered in localStorage when it is available.
  const KEY = "portfolio-trek";
  const boxes = ["opt-trek", "opt-trek-foot"].map((id) => document.getElementById(id)).filter(Boolean);
  let on = false;
  try { on = localStorage.getItem(KEY) === "1"; } catch { /* storage blocked: stays off */ }
  const apply = () => {
    meter.hidden = !on;
    boxes.forEach((b) => { b.checked = on; });
    if (on) update();
  };
  boxes.forEach((b) => b.addEventListener("change", () => {
    on = b.checked;
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* ignore */ }
    apply();
  }));

  let queued = false;
  const onScroll = () => {
    if (!on || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  apply();
  return { update };
})();

// Momo Rush. Each ticket has a spec: filling weight and pleat count, each with a tolerance. Hold the filling
// button to add grams, tap to pleat, then serve. The grader is a plain function that explains every miss.
(() => {
  const $ = (id) => document.getElementById(id);
  const startBtn = $("m-start");
  if (!startBtn) return;
  const MENU = [ // fictional demo menu
    { name: "Veg momo", grams: 16, pleats: 6 },
    { name: "Chicken momo", grams: 20, pleats: 8 },
    { name: "Cheese momo", grams: 18, pleats: 7 },
    { name: "Jhol momo", grams: 22, pleats: 10 },
  ];
  const TOL_GRAMS = 2, TOL_PLEATS = 1, SECONDS = 45, MAX_GRAMS = 40, SLOTS = 14, GRAMS_PER_SECOND = 11;
  const hold = $("m-hold"), pleat = $("m-pleat"), steam = $("m-steam");

  let phase = "idle"; // idle -> fill -> pleat -> result -> (next ticket) ... -> done
  let spec = null, grams = 0, pleats = 0, ok = 0, bad = 0, endsAt = 0, filling = false, last = 0, timer = 0;
  let best = 0;
  try { best = parseInt(localStorage.getItem("momo-best"), 10) || 0; } catch { /* storage blocked */ }
  const showBest = () => { $("m-best").textContent = best ? best : "none yet"; };
  showBest();

  // Pleat marks around the rim, drawn once and revealed one by one.
  const svgNS = "http://www.w3.org/2000/svg";
  const marks = [];
  for (let i = 0; i < SLOTS; i++) {
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", "M100 18Q108 34 100 52");
    p.setAttribute("transform", `rotate(${(i * 360) / SLOTS} 100 100)`);
    p.style.opacity = 0;
    $("m-pleats").append(p);
    marks.push(p);
  }

  const draw = () => {
    $("m-weight").textContent = grams.toFixed(1);
    $("m-count").textContent = pleats;
    $("m-fill").setAttribute("r", Math.min(78, 8 + grams * 1.9));
    $("m-mark").style.left = (grams / MAX_GRAMS) * 100 + "%";
    marks.forEach((p, i) => { p.style.opacity = i < pleats ? 1 : 0; });
  };

  // Pure grader: returns whether the momo met the spec and a list of plain-language reasons.
  const grade = (s, g, n) => {
    const reasons = [];
    const off = g - s.grams;
    if (Math.abs(off) > TOL_GRAMS) reasons.push(`filling was ${g.toFixed(1)} g, ${Math.abs(off).toFixed(1)} g ${off > 0 ? "over" : "under"} the ${s.grams} g target`);
    if (Math.abs(n - s.pleats) > TOL_PLEATS) reasons.push(`${n} pleats, wanted ${s.pleats} (plus or minus ${TOL_PLEATS})`);
    return { pass: reasons.length === 0, reasons };
  };

  const setButtons = (h, p, s) => { hold.disabled = !h; pleat.disabled = !p; steam.disabled = !s; };

  const nextTicket = () => {
    const others = MENU.filter((item) => item !== spec); // never the same ticket twice in a row
    spec = others[Math.floor(Math.random() * others.length)];
    grams = 0; pleats = 0; phase = "fill";
    $("m-ticket").textContent = `Ticket ${ok + bad + 1}: ${spec.name}. Filling ${spec.grams} g (plus or minus ${TOL_GRAMS}), ${spec.pleats} pleats (plus or minus ${TOL_PLEATS}).`;
    const lo = spec.grams - TOL_GRAMS, hi = spec.grams + TOL_GRAMS;
    $("m-band").style.left = (lo / MAX_GRAMS) * 100 + "%";
    $("m-band").style.width = ((hi - lo) / MAX_GRAMS) * 100 + "%";
    setButtons(true, false, false);
    draw();
  };

  const fillLoop = (now) => {
    if (!filling) return;
    grams = Math.min(MAX_GRAMS, grams + ((now - last) / 1000) * GRAMS_PER_SECOND);
    last = now;
    draw();
    requestAnimationFrame(fillLoop);
  };
  const beginFill = () => {
    if (phase !== "fill" || filling) return;
    filling = true;
    last = performance.now();
    requestAnimationFrame(fillLoop);
  };
  const endFill = () => {
    if (!filling) return;
    filling = false;
    if (grams > 0) { phase = "pleat"; setButtons(false, true, true); }
  };

  hold.addEventListener("pointerdown", (e) => { e.preventDefault(); beginFill(); });
  ["pointerup", "pointerleave", "pointercancel"].forEach((t) => hold.addEventListener(t, endFill));
  hold.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); beginFill(); } });
  hold.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); endFill(); } });

  pleat.addEventListener("click", () => { if (phase === "pleat") { pleats += 1; draw(); } });

  steam.addEventListener("click", () => {
    if (phase !== "pleat") return;
    phase = "result";
    setButtons(false, false, false);
    const r = grade(spec, grams, pleats);
    if (r.pass) { ok += 1; $("m-status").textContent = `Served: ${spec.name}, ${grams.toFixed(1)} g and ${pleats} pleats. Spec met.`; }
    else { bad += 1; $("m-status").textContent = `Returned: ${r.reasons.join("; ")}.`; }
    $("m-ok").textContent = ok;
    $("m-bad").textContent = bad;
    setTimeout(() => { if (phase === "result") nextTicket(); }, 1300);
  });

  const finish = () => {
    clearInterval(timer);
    filling = false;
    phase = "done";
    setButtons(false, false, false);
    const rank = ok >= 7 ? "Sous chef" : ok >= 5 ? "Line cook" : ok >= 3 ? "Prep cook" : "Still learning";
    if (ok > best) {
      best = ok; showBest();
      try { localStorage.setItem("momo-best", String(ok)); } catch { /* ignore */ }
    }
    $("m-ticket").textContent = `Time. ${ok} served right, ${bad} returned. Rank: ${rank}.`;
    startBtn.textContent = "Rush again";
    startBtn.disabled = false;
    if (ok >= 3) document.dispatchEvent(new CustomEvent("stamp", { detail: "momo" }));
  };

  startBtn.addEventListener("click", () => {
    ok = 0; bad = 0;
    $("m-ok").textContent = 0; $("m-bad").textContent = 0;
    $("m-status").textContent = "Go.";
    startBtn.disabled = true;
    endsAt = performance.now() + SECONDS * 1000;
    timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - performance.now()) / 1000));
      $("m-time").textContent = left;
      if (left === 0) finish();
    }, 200);
    $("m-time").textContent = SECONDS;
    nextTicket();
  });
})();

// The cat on the prayer flags. Poking it builds up annoyance, which fades with time. A website cannot close the browser
// tab, so when the cat has had enough it only covers the page with a "closed" screen that one click undoes.
(() => {
  const cat = document.getElementById("flag-cat");
  const gone = document.getElementById("cat-gone");
  if (!cat || !gone) return;
  const say = (t) => { if (typeof passport !== "undefined" && passport) passport.say(t); };
  const MOODS = [[3, "Mrrp?"], [5, "The cat flicks its tail."], [7, "The cat is not amused."]];
  const LEAVE_AT = 9;
  let annoyed = 0, last = performance.now();

  const poke = () => {
    const now = performance.now();
    annoyed = Math.max(0, annoyed - (now - last) / 2500) + 1; // calms down by one poke every 2.5 seconds
    last = now;
    cat.classList.remove("poked");
    void cat.getBoundingClientRect();
    cat.classList.add("poked");
    if (annoyed >= LEAVE_AT) return leave();
    const mood = MOODS.filter(([n]) => Math.floor(annoyed) === n)[0];
    say(mood ? mood[1] : "Purr.");
  };

  const leave = () => {
    annoyed = 0;
    cat.classList.add("fled");
    setTimeout(() => {
      gone.hidden = false;
      gone.querySelector("button").focus();
    }, 650);
  };
  const back = () => {
    gone.hidden = true;
    cat.classList.remove("fled", "poked");
    cat.focus({ preventScroll: true });
    say("The cat is back, and pretending nothing happened.");
  };

  cat.addEventListener("click", poke);
  cat.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); poke(); } });
  gone.querySelector("button").addEventListener("click", back);
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !gone.hidden) back(); });
})();

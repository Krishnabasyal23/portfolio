// Scroll reveal. Panels unroll once their top edge is near the bottom of the screen.
// This checks scroll position instead of using IntersectionObserver, because a panel that is
// clipped to nothing before it unrolls can be reported as not visible and would never open.
// Without JS everything is simply visible, because the hidden state only exists under .armed.
let pending = [...document.querySelectorAll(".reveal")];
if (pending.length) {
  document.documentElement.classList.add("armed");
  const reveal = () => {
    const limit = innerHeight * 0.88;
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top >= limit) return true;
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

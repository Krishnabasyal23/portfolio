// Scroll reveal only. Without JS (or without IntersectionObserver) everything is simply visible.
if ("IntersectionObserver" in window) {
  document.documentElement.classList.add("armed");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
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

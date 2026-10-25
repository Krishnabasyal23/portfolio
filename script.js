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

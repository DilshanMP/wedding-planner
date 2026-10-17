/**
 * A short burst of petals and gold confetti for happy moments (a task done,
 * a bill fully paid). Pure DOM, so any click handler can call it; nothing
 * happens when the person prefers reduced motion.
 */
const COLORS = ["var(--wine-600)", "var(--champagne-500)", "#f2c4ce", "#ffffff", "var(--sage-600)"];

export function celebrate(from?: { x: number; y: number } | Element | null, count = 36) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 3;
  if (from instanceof Element) {
    const r = from.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  } else if (from) ({ x, y } = from);
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  layer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < count; i++) {
    const bit = document.createElement("i");
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 80 + Math.random() * 140;
    bit.className = `confetti-bit confetti-bit--${i % 3}`;
    bit.style.left = `${x}px`;
    bit.style.top = `${y}px`;
    bit.style.background = COLORS[i % COLORS.length];
    bit.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    bit.style.setProperty("--dy", `${Math.sin(angle) * dist - 60}px`);
    bit.style.setProperty("--rot", `${Math.round(Math.random() * 720 - 360)}deg`);
    bit.style.animationDelay = `${Math.random() * 0.08}s`;
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1800);
}

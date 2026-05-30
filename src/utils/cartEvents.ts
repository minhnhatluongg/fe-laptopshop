/** Dispatch khi thêm sản phẩm vào giỏ — PublicHeader lắng nghe để update real-time */
export const emitCartUpdated = (delta = 1) =>
  window.dispatchEvent(new CustomEvent("cart:updated", { detail: { delta } }));

/** Flyout particle animation từ một element đến cart icon */
export function flyToCart(
  fromEl: HTMLElement | null,
  onDone?: () => void,
) {
  if (!fromEl) { onDone?.(); return; }

  // Tìm cart icon trong DOM
  const cartIcon = document.querySelector<HTMLElement>("[data-cart-icon]");
  if (!cartIcon) { onDone?.(); return; }

  const from = fromEl.getBoundingClientRect();
  const to   = cartIcon.getBoundingClientRect();

  // Tạo particle
  const dot = document.createElement("div");
  dot.style.cssText = `
    position: fixed;
    z-index: 9999;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #465fff;
    pointer-events: none;
    left: ${from.left + from.width / 2 - 7}px;
    top:  ${from.top  + from.height / 2 - 7}px;
    transition: all 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    opacity: 1;
    transform: scale(1);
  `;
  document.body.appendChild(dot);

  // Trigger animation frame sau khi DOM render
  requestAnimationFrame(() => requestAnimationFrame(() => {
    dot.style.left      = `${to.left + to.width / 2 - 7}px`;
    dot.style.top       = `${to.top  + to.height / 2 - 7}px`;
    dot.style.transform = "scale(0.3)";
    dot.style.opacity   = "0.7";
  }));

  setTimeout(() => {
    dot.remove();
    // Pulse cart icon
    cartIcon.classList.add("cart-pulse");
    setTimeout(() => cartIcon.classList.remove("cart-pulse"), 400);
    onDone?.();
  }, 580);
}

/**
 * Guest cart — lưu trong localStorage cho người dùng chưa đăng nhập.
 * Sau khi user login/register, AuthContext sẽ merge cart này vào server.
 *
 * Format: [{ productId, quantity }]
 * Event: window.dispatchEvent("cart:guest-updated", { detail: { totalQty } })
 */
const KEY = "guest_cart";

export interface GuestCartItem {
  productId: number;
  quantity: number;
}

export const guestCart = {
  get(): GuestCartItem[] {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const items = JSON.parse(raw);
      return Array.isArray(items) ? items : [];
    } catch {
      return [];
    }
  },

  set(items: GuestCartItem[]) {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      this.emit(items);
    } catch {
      /* localStorage disabled */
    }
  },

  add(productId: number, quantity = 1) {
    const items = this.get();
    const found = items.find((i) => i.productId === productId);
    if (found) found.quantity += quantity;
    else items.push({ productId, quantity });
    this.set(items);
  },

  setQuantity(productId: number, quantity: number) {
    if (quantity <= 0) return this.remove(productId);
    const items = this.get();
    const found = items.find((i) => i.productId === productId);
    if (found) found.quantity = quantity;
    else items.push({ productId, quantity });
    this.set(items);
  },

  remove(productId: number) {
    const items = this.get().filter((i) => i.productId !== productId);
    this.set(items);
  },

  clear() {
    try {
      localStorage.removeItem(KEY);
      this.emit([]);
    } catch {
      /* */
    }
  },

  totalQty(): number {
    return this.get().reduce((s, i) => s + (i.quantity ?? 0), 0);
  },

  emit(items: GuestCartItem[]) {
    const totalQty = items.reduce((s, i) => s + (i.quantity ?? 0), 0);
    window.dispatchEvent(
      new CustomEvent("cart:guest-updated", { detail: { totalQty } }),
    );
  },
};

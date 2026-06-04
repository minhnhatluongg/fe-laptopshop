/**
 * Trích thông điệp lỗi thật từ response của backend (ApiResponse hoặc ASP.NET ModelState),
 * thay vì để lộ message thô của axios ("Request failed with status code 400").
 */
export function getApiErrorMessage(
  err: unknown,
  fallback = "Đã có lỗi xảy ra. Vui lòng thử lại.",
): string {
  const ax = err as { response?: { data?: unknown }; message?: string };
  const data = ax?.response?.data as Record<string, unknown> | undefined;

  if (data) {
    // ApiResponse: { success:false, message:"..." }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    // ApiResponse: { errors: ["msg1", "msg2"] }
    if (Array.isArray(data.errors) && data.errors.length) {
      return (data.errors as string[]).join("\n");
    }
    // ASP.NET ModelState: { errors: { Field: ["msg"] } }
    if (data.errors && typeof data.errors === "object") {
      const msgs = Object.values(data.errors as Record<string, string[]>).flat();
      if (msgs.length) return msgs.join("\n");
    }
  }

  // Bỏ qua message thô của axios — vô nghĩa với người dùng
  if (ax?.message && !/request failed with status code/i.test(ax.message)) {
    return ax.message;
  }
  return fallback;
}

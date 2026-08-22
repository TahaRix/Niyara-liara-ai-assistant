export function validateChatRequest(body: any): { valid: boolean; error?: string; cleanMessage?: string; cleanHistory?: any[]; attachments?: any[] } {
  if (!body) {
    return { valid: false, error: "بدنه درخواست نمی‌تواند خالی باشد." };
  }

  let { message, history, attachments } = body;

  if (!message && (!attachments || attachments.length === 0)) {
    return { valid: false, error: "ارسال پیام یا فایل الزامی است." };
  }

  if (message && typeof message !== 'string') {
    return { valid: false, error: "فرمت پیام نامعتبر است." };
  }

  // Strip HTML
  if (message) {
      message = message.replace(/<[^>]*>?/gm, '').trim();

      if (message.length > 2000) {
        return { valid: false, error: "طول پیام بیش از حد مجاز (۲۰۰۰ کاراکتر) است." };
      }
  } else {
      message = "";
  }

  let cleanHistory: any[] = [];
  if (history) {
    if (!Array.isArray(history)) {
      return { valid: false, error: "تاریخچه باید آرایه باشد." };
    }

    if (history.length > 20) {
      return { valid: false, error: "تاریخچه بیش از حد مجاز (۲۰ پیام) است." };
    }

    for (const msg of history) {
      if (typeof msg !== 'object' || !msg) continue;

      let { role, content } = msg;

      if (role !== 'user' && role !== 'assistant') {
        continue; // Skip invalid roles
      }

      if (typeof content !== 'string') {
          content = '';
      }

      cleanHistory.push({
        role,
        content: content.replace(/<[^>]*>?/gm, '').trim()
      });
    }
  }

  let cleanAttachments: any[] = [];
  if (attachments) {
      if (!Array.isArray(attachments)) {
          return { valid: false, error: "پیوست‌ها باید به صورت آرایه باشند." };
      }
      for (const att of attachments) {
          if (!att.name || !att.content) continue;
          if (att.content.length > 1024 * 1024) { // 1MB limit check server-side as well
              return { valid: false, error: `حجم فایل ${att.name} بیش از حد مجاز است.` };
          }
          cleanAttachments.push({
              name: String(att.name),
              type: String(att.type || 'text/plain'),
              content: String(att.content)
          });
      }
  }

  if (message.length === 0 && cleanAttachments.length === 0) {
      return { valid: false, error: "ارسال پیام یا فایل الزامی است." };
  }

  return { valid: true, cleanMessage: message, cleanHistory, attachments: cleanAttachments };
}
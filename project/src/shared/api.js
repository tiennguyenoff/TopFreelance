/**
 * Gọi API MySQL kèm token phiên theo vai trò.
 * Bản demo giữ 2 tài khoản mẫu trong cùng trình duyệt (đổi vai trò tức thì) nên giữ 2 token
 * trong bộ nhớ (không lưu localStorage → đóng tab là mất phiên).
 */
const tokens = {};
const users = {};

async function openSession(role) {
  const r = await fetch('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  });
  const body = await r.json().catch(() => null);
  if (!r.ok || !body?.success) throw new Error(body?.error || 'Không mở được phiên đăng nhập');
  tokens[role] = body.data.token;
  users[role] = body.data.user;
  return body.data.user;
}

/** Đăng nhập tài khoản mẫu của vai trò; trả thông tin + số dư ví thật trong DB (null nếu offline). */
export async function login(role) {
  try {
    return await openSession(role);
  } catch {
    return null;
  }
}

/**
 * Gửi request. Kết quả: { ok, offline, status, data, error }.
 * offline = true khi không có server/MySQL → giao diện vẫn chạy bằng dữ liệu trong RAM.
 */
export async function api(method, url, { role, body, timeoutMs = 4000 } = {}) {
  const run = async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const headers = {};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (role && tokens[role]) headers.Authorization = `Bearer ${tokens[role]}`;
      const r = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctrl.signal });
      const json = await r.json().catch(() => null);
      return { ok: r.ok && !!json?.success, offline: !json, status: r.status, data: json?.data ?? null, error: json?.error || null };
    } catch {
      return { ok: false, offline: true, status: 0, data: null, error: null };
    } finally {
      clearTimeout(timer);
    }
  };

  if (role && !tokens[role]) await login(role);
  let res = await run();
  if (res.status === 401 && role) {
    // Phiên hết hạn / server khởi động lại → đăng nhập lại 1 lần rồi thử lại
    if (await login(role)) res = await run();
  }
  return res;
}

export const apiGet = (url, role) => api('GET', url, { role });
export const apiPost = (url, body, role) => api('POST', url, { role, body });

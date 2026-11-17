/**
 * Gọi API MySQL bằng cookie HttpOnly do server cấp.
 * Trình duyệt tự gửi cookie; JS của trang KHÔNG đọc/lưu token ở đâu cả (không biến, không localStorage)
 * → lỗ hổng XSS cũng không lấy cắp được phiên. Demo có 2 vai trò đăng nhập song song nên mỗi request
 * báo vai trò đang dùng bằng header X-Role.
 */
const timeoutFetch = async (url, init, timeoutMs = 4000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { credentials: 'include', ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
};

const send = async (method, url, { role, body, timeoutMs } = {}) => {
  try {
    const headers = {};
    if (role) headers['X-Role'] = role;
    // POST luôn gửi JSON (kể cả '{}') vì server chỉ nhận application/json
    if (method !== 'GET') headers['Content-Type'] = 'application/json';
    const r = await timeoutFetch(url, { method, headers, body: method === 'GET' ? undefined : JSON.stringify(body ?? {}) }, timeoutMs);
    const json = await r.json().catch(() => null);
    return { ok: r.ok && !!json?.success, offline: !json, status: r.status, data: json?.data ?? null, error: json?.error || null };
  } catch {
    return { ok: false, offline: true, status: 0, data: null, error: null };
  }
};

// Refresh token xoay vòng: 2 request song song cùng refresh sẽ bị server coi là "dùng lại token" → phải gộp thành 1.
const refreshing = {};
function refresh(role) {
  refreshing[role] ??= send('POST', '/api/auth/refresh', { role }).finally(() => { delete refreshing[role]; });
  return refreshing[role];
}

/** Đăng nhập bằng email + mật khẩu → { ok, user, error }. Token nằm trong cookie HttpOnly, không trả về JS. */
export async function login(email, password) {
  const r = await send('POST', '/api/auth/login', { body: { email, password } });
  return { ok: r.ok, offline: r.offline, user: r.ok ? r.data.user : null, error: r.error };
}

export async function logout(role) {
  await send('POST', '/api/auth/logout', { role });
}

/** Người dùng hiện tại của vai trò (thử làm mới phiên 1 lần). null nếu chưa đăng nhập / server offline. */
export async function fetchMe(role) {
  const r = await api('GET', '/api/auth/me', { role });
  return r.ok ? r.data.user : null;
}

/**
 * Gửi request. Kết quả: { ok, offline, status, data, error }.
 * offline = true khi không có server/MySQL → giao diện vẫn chạy bằng dữ liệu trong RAM.
 */
export async function api(method, url, { role, body, timeoutMs = 4000 } = {}) {
  let res = await send(method, url, { role, body, timeoutMs });
  if (res.status === 401 && role && !url.startsWith('/api/auth/login')) {
    // Access token (15 phút) hết hạn → đổi bằng refresh token rồi thử lại đúng 1 lần
    const rf = await refresh(role);
    if (rf.ok) res = await send(method, url, { role, body, timeoutMs });
  }
  return res;
}

export const apiGet = (url, role) => api('GET', url, { role });
export const apiPost = (url, body, role) => api('POST', url, { role, body });

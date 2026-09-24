/* ============================================
   API.JS - Lớp gọi API tập trung (fetch wrapper)
   ============================================ */

const API_BASE_URL = 'https://vpbot-api.YOUR-SUBDOMAIN.workers.dev/api'; // TODO: thay bằng URL Worker thật sau khi deploy (bước 2 trong README)

/**
 * Gọi API chung, tự gắn JWT token nếu có
 * @param {string} endpoint - vd: '/auth/login'
 * @param {object} options - { method, body, auth }
 */
async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, auth = true, headers = {} } = options;

  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  if (auth) {
    const token = TokenStore.get();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined
    });

    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    }

    if (res.status === 401) {
      TokenStore.clear();
      if (!location.pathname.includes('login.html')) {
        toastError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        setTimeout(() => (location.href = 'login.html'), 1200);
      }
    }

    if (!res.ok) {
      const message = (data && data.message) || 'Có lỗi xảy ra, vui lòng thử lại';
      throw new Error(message);
    }

    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng.');
    }
    throw err;
  }
}

const Api = {
  // ---------- Xác thực ----------
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload, auth: false }),
  verifyOtp: (payload) => apiRequest('/auth/verify-otp', { method: 'POST', body: payload, auth: false }),
  resendOtp: (payload) => apiRequest('/auth/resend-otp', { method: 'POST', body: payload, auth: false }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload, auth: false }),
  forgotPassword: (payload) => apiRequest('/auth/forgot-password', { method: 'POST', body: payload, auth: false }),
  resetPassword: (payload) => apiRequest('/auth/reset-password', { method: 'POST', body: payload, auth: false }),
  changePassword: (payload) => apiRequest('/auth/change-password', { method: 'POST', body: payload }),
  logoutAllDevices: () => apiRequest('/auth/logout-all', { method: 'POST' }),
  updateProfile: (payload) => apiRequest('/auth/profile', { method: 'PUT', body: payload }),
  getMe: () => apiRequest('/auth/me'),

  // ---------- Box / Bot ----------
  getBoxes: () => apiRequest('/boxes'),
  connectBox: (payload) => apiRequest('/boxes', { method: 'POST', body: payload }),
  updateBoxConfig: (boxId, payload) => apiRequest(`/boxes/${boxId}/config`, { method: 'PUT', body: payload }),
  deleteBox: (boxId) => apiRequest(`/boxes/${boxId}`, { method: 'DELETE' }),
  getBoxLogs: (boxId) => apiRequest(`/boxes/${boxId}/logs`),
  getBoxStats: (boxId) => apiRequest(`/boxes/${boxId}/stats`),

  // ---------- Tính điểm FF ----------
  submitMatch: (payload) => apiRequest('/matches', { method: 'POST', body: payload }),
  submitMatchesBulk: (payload) => apiRequest('/matches/bulk', { method: 'POST', body: payload }),
  importMatchesFile: (formData) => fetch(`${API_BASE_URL}/matches/import`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TokenStore.get()}` },
    body: formData
  }).then(r => r.json()),
  getLeaderboard: (query = '') => apiRequest(`/matches/leaderboard${query}`, { auth: false }),
  getMatchHistory: (query = '') => apiRequest(`/matches/history${query}`),
  exportResults: (format, query = '') => `${API_BASE_URL}/matches/export/${format}${query}`,

  // ---------- Dashboard / Gói ----------
  getDashboardOverview: () => apiRequest('/dashboard/overview'),
  getPaymentHistory: () => apiRequest('/dashboard/payments'),
  renewPlan: (payload) => apiRequest('/dashboard/renew', { method: 'POST', body: payload }),

  // ---------- Thanh toán ----------
  createPayment: (payload) => apiRequest('/payments', { method: 'POST', body: payload }),
  confirmPayment: (payload) => apiRequest('/payments/confirm', { method: 'POST', body: payload }),
  applyVoucher: (code) => apiRequest('/payments/voucher', { method: 'POST', body: { code } }),

  // ---------- Blog ----------
  getBlogPosts: (query = '') => apiRequest(`/blog${query}`, { auth: false }),
  getBlogPost: (slug) => apiRequest(`/blog/${slug}`, { auth: false }),

  // ---------- Liên hệ ----------
  sendContactForm: (payload) => apiRequest('/contact', { method: 'POST', body: payload, auth: false }),

  // ---------- Admin ----------
  adminGetUsers: (query = '') => apiRequest(`/admin/users${query}`),
  adminUpdateUser: (id, payload) => apiRequest(`/admin/users/${id}`, { method: 'PUT', body: payload }),
  adminDeleteUser: (id) => apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),
  adminGetOrders: (query = '') => apiRequest(`/admin/orders${query}`),
  adminApproveOrder: (id) => apiRequest(`/admin/orders/${id}/approve`, { method: 'POST' }),
  adminGetRevenue: (query = '') => apiRequest(`/admin/revenue${query}`),
  adminGetVouchers: () => apiRequest('/admin/vouchers'),
  adminCreateVoucher: (payload) => apiRequest('/admin/vouchers', { method: 'POST', body: payload }),
  adminGetBlogPosts: () => apiRequest('/admin/blog'),
  adminSaveBlogPost: (payload) => apiRequest('/admin/blog', { method: 'POST', body: payload }),
  adminSendNotification: (payload) => apiRequest('/admin/notifications', { method: 'POST', body: payload })
};

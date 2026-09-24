/* ============================================
   UTILS.JS - Hàm tiện ích dùng chung
   ============================================ */

/**
 * Lấy 1 phần tử theo selector
 */
function $(selector, scope = document) {
  return scope.querySelector(selector);
}

/**
 * Lấy nhiều phần tử theo selector, trả về mảng
 */
function $$(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

/**
 * Định dạng số có dấu phẩy ngăn cách hàng nghìn
 */
function formatNumber(num) {
  return new Intl.NumberFormat('vi-VN').format(Number(num) || 0);
}

/**
 * Định dạng tiền VNĐ
 */
function formatCurrency(num) {
  return formatNumber(num) + 'đ';
}

/**
 * Định dạng ngày giờ kiểu Việt Nam
 */
function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Tính thời gian còn lại tới 1 mốc (ms)
 */
function getTimeLeft(targetDate) {
  const diff = new Date(targetDate).getTime() - Date.now();
  return Math.max(0, diff);
}

/**
 * Debounce - trì hoãn gọi hàm
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Validate email
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validate username: 4-20 ký tự, chữ/số/gạch dưới
 */
function isValidUsername(username) {
  return /^[a-zA-Z0-9_]{4,20}$/.test(username);
}

/**
 * Validate mật khẩu: tối thiểu 8 ký tự, có chữ và số
 */
function isValidPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password);
}

/**
 * Lấy / lưu / xoá token trong localStorage
 */
const TokenStore = {
  KEY: 'vpbot_token',
  USER_KEY: 'vpbot_user',
  get() { return localStorage.getItem(this.KEY); },
  set(token) { localStorage.setItem(this.KEY, token); },
  clear() { localStorage.removeItem(this.KEY); localStorage.removeItem(this.USER_KEY); },
  getUser() {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY)); }
    catch (e) { return null; }
  },
  setUser(user) { localStorage.setItem(this.USER_KEY, JSON.stringify(user)); }
};

/**
 * Kiểm tra đã đăng nhập chưa, nếu chưa thì chuyển hướng
 */
function requireAuth(redirectTo = 'login.html') {
  if (!TokenStore.get()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

/**
 * Chuyển hướng nếu đã đăng nhập rồi (dùng cho trang login/register)
 */
function redirectIfAuthed(redirectTo = 'dashboard.html') {
  if (TokenStore.get()) {
    window.location.href = redirectTo;
  }
}

/**
 * Escape HTML để chống XSS khi render dữ liệu người dùng
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

/**
 * Lấy query param từ URL
 */
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * Fade-in animation khi scroll tới phần tử
 */
function initScrollFadeIn() {
  const items = $$('.fade-in');
  if (!items.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach(item => observer.observe(item));
}

document.addEventListener('DOMContentLoaded', initScrollFadeIn);

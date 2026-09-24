/* ============================================
   TOAST.JS - Toast notification (góc phải)
   ============================================ */

(function () {
  let container = null;

  function ensureContainer() {
    if (container) return container;
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  const ICONS = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };

  /**
   * Hiển thị toast
   * @param {string} message - nội dung
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration - ms, mặc định 3500
   */
  window.showToast = function (message, type = 'info', duration = 3500) {
    const wrap = ensureContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span style="color:var(--color-${type === 'info' ? 'primary' : type})">${ICONS[type] || ICONS.info}</span>
      <span>${escapeHtml(message)}</span>
    `;
    wrap.appendChild(toast);

    const remove = () => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    };
    const timer = setTimeout(remove, duration);
    toast.addEventListener('click', () => { clearTimeout(timer); remove(); });
  };

  window.toastSuccess = (msg) => window.showToast(msg, 'success');
  window.toastError = (msg) => window.showToast(msg, 'error');
  window.toastWarning = (msg) => window.showToast(msg, 'warning');
  window.toastInfo = (msg) => window.showToast(msg, 'info');
})();

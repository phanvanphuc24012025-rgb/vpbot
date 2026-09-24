/* ============================================
   ADMIN.JS - Trang quản trị (Admin)
   ============================================ */

function requireAdmin() {
  if (!requireAuth()) return false;
  const user = TokenStore.getUser();
  if (!user || user.role !== 'admin') {
    toastError('Bạn không có quyền truy cập trang này');
    setTimeout(() => (location.href = 'dashboard.html'), 800);
    return false;
  }
  return true;
}

// ---------- Quản lý user ----------
async function loadAdminUsers() {
  const tbody = $('#admin-users-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6"><div class="skeleton skeleton-row"></div></td></tr>';

  try {
    const search = $('#admin-user-search')?.value || '';
    const data = await Api.adminGetUsers(`?search=${encodeURIComponent(search)}`);
    const users = data.users || [];
    tbody.innerHTML = users.length ? users.map(u => `
      <tr data-user-id="${u._id}">
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge badge-${u.role === 'admin' ? 'info' : 'success'}">${escapeHtml(u.role)}</span></td>
        <td><span class="badge badge-${u.locked ? 'danger' : 'success'}">${u.locked ? 'Đã khoá' : 'Hoạt động'}</span></td>
        <td>${formatDate(u.createdAt)}</td>
        <td class="flex gap-2">
          <button class="btn btn-sm btn-outline toggle-lock-btn">${u.locked ? 'Mở khoá' : 'Khoá'}</button>
          <button class="btn btn-sm btn-danger delete-user-btn">Xoá</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="text-center">Không tìm thấy người dùng</td></tr>';

    $$('.toggle-lock-btn', tbody).forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('tr');
        const userId = row.dataset.userId;
        const locked = btn.textContent.trim() === 'Khoá';
        try {
          await Api.adminUpdateUser(userId, { locked });
          toastSuccess(locked ? 'Đã khoá tài khoản' : 'Đã mở khoá tài khoản');
          loadAdminUsers();
        } catch (err) {
          toastError(err.message);
        }
      });
    });

    $$('.delete-user-btn', tbody).forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xoá người dùng này? Hành động không thể hoàn tác.')) return;
        const row = btn.closest('tr');
        try {
          await Api.adminDeleteUser(row.dataset.userId);
          toastSuccess('Đã xoá người dùng');
          loadAdminUsers();
        } catch (err) {
          toastError(err.message);
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Lỗi tải danh sách: ${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---------- Duyệt đơn thuê bot ----------
async function loadAdminOrders() {
  const tbody = $('#admin-orders-tbody');
  if (!tbody) return;
  try {
    const status = $('#admin-order-filter')?.value || '';
    const data = await Api.adminGetOrders(`?status=${status}`);
    const orders = data.orders || [];
    tbody.innerHTML = orders.length ? orders.map(o => `
      <tr data-order-id="${o._id}">
        <td>${escapeHtml(o.username)}</td>
        <td>${escapeHtml(o.planName)}</td>
        <td>${formatCurrency(o.amount)}</td>
        <td><span class="badge badge-${o.status === 'paid' ? 'success' : o.status === 'pending' ? 'warning' : 'danger'}">${escapeHtml(o.status)}</span></td>
        <td>${formatDateTime(o.createdAt)}</td>
        <td>${o.status === 'pending' ? '<button class="btn btn-sm btn-primary approve-order-btn">Duyệt</button>' : '—'}</td>
      </tr>
    `).join('') : '<tr><td colspan="6" class="text-center">Không có đơn nào</td></tr>';

    $$('.approve-order-btn', tbody).forEach(btn => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('tr');
        setButtonLoading(btn, true);
        try {
          await Api.adminApproveOrder(row.dataset.orderId);
          toastSuccess('Đã duyệt đơn thuê bot');
          loadAdminOrders();
        } catch (err) {
          toastError(err.message);
          setButtonLoading(btn, false);
        }
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6">Lỗi tải đơn hàng: ${escapeHtml(err.message)}</td></tr>`;
  }
}

// ---------- Doanh thu & biểu đồ ----------
async function loadAdminRevenue() {
  const wrap = $('#admin-revenue-summary');
  if (!wrap) return;
  try {
    const range = $('#revenue-range')?.value || 'week';
    const data = await Api.adminGetRevenue(`?range=${range}`);
    $('#revenue-total') && ($('#revenue-total').textContent = formatCurrency(data.total || 0));
    $('#revenue-orders-count') && ($('#revenue-orders-count').textContent = formatNumber(data.ordersCount || 0));
    $('#revenue-new-users') && ($('#revenue-new-users').textContent = formatNumber(data.newUsers || 0));
    renderRevenueChart(data.series || []);
  } catch (err) {
    toastError('Không tải được dữ liệu doanh thu');
  }
}

function renderRevenueChart(series) {
  const canvasWrap = $('#revenue-chart');
  if (!canvasWrap) return;
  if (!series.length) {
    canvasWrap.innerHTML = '<p class="text-center" style="padding:40px;color:var(--color-text-muted);">Chưa có dữ liệu</p>';
    return;
  }
  const max = Math.max(...series.map(s => s.value), 1);
  canvasWrap.innerHTML = `
    <div style="display:flex;align-items:flex-end;gap:8px;height:200px;">
      ${series.map(s => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="width:100%;background:var(--gradient-cta);border-radius:4px 4px 0 0;height:${Math.max(4, (s.value / max) * 160)}px;" title="${formatCurrency(s.value)}"></div>
          <span style="font-size:11px;color:var(--color-text-muted);">${escapeHtml(s.label)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------- Mã giảm giá / voucher ----------
async function loadAdminVouchers() {
  const tbody = $('#admin-vouchers-tbody');
  if (!tbody) return;
  try {
    const data = await Api.adminGetVouchers();
    tbody.innerHTML = (data.vouchers || []).map(v => `
      <tr>
        <td><strong>${escapeHtml(v.code)}</strong></td>
        <td>${v.type === 'percent' ? v.value + '%' : formatCurrency(v.value)}</td>
        <td>${v.usedCount || 0} / ${v.maxUses || '∞'}</td>
        <td>${v.expiresAt ? formatDate(v.expiresAt) : 'Không giới hạn'}</td>
        <td><span class="badge badge-${v.active ? 'success' : 'danger'}">${v.active ? 'Hoạt động' : 'Tắt'}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="5" class="text-center">Chưa có mã giảm giá</td></tr>';
  } catch (err) {
    toastError('Không tải được danh sách voucher');
  }
}

function initCreateVoucherForm() {
  const form = $('#create-voucher-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = $('button[type="submit"]', form);
    setButtonLoading(submitBtn, true);
    try {
      await Api.adminCreateVoucher({
        code: $('#voucher-code', form).value.trim().toUpperCase(),
        type: $('#voucher-type', form).value,
        value: Number($('#voucher-value', form).value),
        maxUses: Number($('#voucher-max-uses', form).value) || null
      });
      toastSuccess('Đã tạo mã giảm giá');
      form.reset();
      loadAdminVouchers();
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// ---------- Quản lý blog ----------
function initAdminBlogForm() {
  const form = $('#admin-blog-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = $('button[type="submit"]', form);
    setButtonLoading(submitBtn, true);
    try {
      await Api.adminSaveBlogPost({
        title: $('#blog-title', form).value.trim(),
        slug: $('#blog-slug', form).value.trim(),
        excerpt: $('#blog-excerpt', form).value.trim(),
        content: $('#blog-content', form).value.trim(),
        coverImage: $('#blog-cover', form)?.value.trim()
      });
      toastSuccess('Đã lưu bài viết');
      form.reset();
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// ---------- Gửi thông báo hệ thống ----------
function initAdminNotificationForm() {
  const form = $('#admin-notification-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = $('button[type="submit"]', form);
    setButtonLoading(submitBtn, true);
    try {
      await Api.adminSendNotification({
        title: $('#notif-title', form).value.trim(),
        message: $('#notif-message', form).value.trim(),
        target: $('#notif-target', form).value
      });
      toastSuccess('Đã gửi thông báo tới người dùng');
      form.reset();
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!$('.admin-layout')) return;
  if (!requireAdmin()) return;

  loadAdminUsers();
  loadAdminOrders();
  loadAdminRevenue();
  loadAdminVouchers();
  initCreateVoucherForm();
  initAdminBlogForm();
  initAdminNotificationForm();

  $('#admin-user-search')?.addEventListener('input', debounce(loadAdminUsers, 400));
  $('#admin-order-filter')?.addEventListener('change', loadAdminOrders);
  $('#revenue-range')?.addEventListener('change', loadAdminRevenue);
});

/* ============================================
   DASHBOARD.JS - Dashboard người dùng
   ============================================ */

// ---------- Tổng quan dashboard ----------
async function loadDashboardOverview() {
  const wrap = $('#dashboard-overview');
  if (!wrap) return;
  try {
    const data = await Api.getDashboardOverview();
    $('#current-plan-name') && ($('#current-plan-name').textContent = data.plan?.name || 'Chưa có gói');
    $('#current-plan-expiry') && ($('#current-plan-expiry').textContent = data.plan?.expiresAt ? formatDate(data.plan.expiresAt) : '—');
    $('#total-boxes-count') && ($('#total-boxes-count').textContent = data.totalBoxes ?? 0);
    $('#total-kicked-count') && ($('#total-kicked-count').textContent = formatNumber(data.totalKicked ?? 0));
    $('#total-messages-count') && ($('#total-messages-count').textContent = formatNumber(data.totalMessages ?? 0));

    const daysLeft = data.plan?.expiresAt ? Math.ceil((new Date(data.plan.expiresAt) - Date.now()) / 86400000) : 0;
    const expiryBadge = $('#plan-expiry-badge');
    if (expiryBadge) {
      if (daysLeft <= 0) {
        expiryBadge.textContent = 'Đã hết hạn';
        expiryBadge.className = 'badge badge-danger';
      } else if (daysLeft <= 3) {
        expiryBadge.textContent = `Còn ${daysLeft} ngày`;
        expiryBadge.className = 'badge badge-warning';
      } else {
        expiryBadge.textContent = `Còn ${daysLeft} ngày`;
        expiryBadge.className = 'badge badge-success';
      }
    }
  } catch (err) {
    toastError('Không tải được thông tin dashboard');
  }
}

// ---------- Danh sách box đã thuê ----------
async function loadUserBoxes() {
  const container = $('#user-boxes-list');
  if (!container) return;
  container.innerHTML = '<div class="skeleton skeleton-row"></div>'.repeat(3);

  try {
    const data = await Api.getBoxes();
    renderUserBoxes(container, data.boxes || []);
  } catch (err) {
    container.innerHTML = `<p>Không tải được danh sách box: ${escapeHtml(err.message)}</p>`;
  }
}

function renderUserBoxes(container, boxes) {
  if (!boxes.length) {
    container.innerHTML = `
      <div class="card text-center" style="padding:40px;">
        <p style="margin-bottom:16px;">Bạn chưa kết nối box nào</p>
        <button class="btn btn-primary" id="open-connect-box-modal">+ Kết nối box mới</button>
      </div>
    `;
    $('#open-connect-box-modal')?.addEventListener('click', openConnectBoxModal);
    return;
  }

  container.innerHTML = boxes.map(box => `
    <div class="card box-card" data-box-id="${box._id}">
      <div class="box-header">
        <div>
          <strong>${escapeHtml(box.name || box.boxId)}</strong>
          <div style="font-size:12px;color:var(--color-text-muted);">ID: ${escapeHtml(box.boxId)}</div>
        </div>
        <span class="badge ${box.status === 'active' ? 'badge-success' : 'badge-danger'}">
          ${box.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
        </span>
      </div>
      <div class="box-toggle-row">
        <span>Chống spam</span>
        <label class="switch">
          <input type="checkbox" class="cfg-toggle" data-key="antiSpam" ${box.config?.antiSpam ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="box-toggle-row">
        <span>Auto kick</span>
        <label class="switch">
          <input type="checkbox" class="cfg-toggle" data-key="autoKick" ${box.config?.autoKick ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="box-toggle-row">
        <span>Cảnh cáo trước khi kick</span>
        <label class="switch">
          <input type="checkbox" class="cfg-toggle" data-key="warnBeforeKick" ${box.config?.warnBeforeKick ? 'checked' : ''}>
          <span class="slider"></span>
        </label>
      </div>
      <div class="flex gap-2" style="margin-top:8px;">
        <button class="btn btn-outline btn-sm view-box-log-btn">Xem log</button>
        <button class="btn btn-outline btn-sm view-box-stats-btn">Thống kê</button>
        <button class="btn btn-danger btn-sm remove-box-btn">Xoá</button>
      </div>
    </div>
  `).join('');

  $$('.box-card').forEach(card => {
    const boxId = card.dataset.boxId;

    $$('.cfg-toggle', card).forEach(toggle => {
      toggle.addEventListener('change', debounce(async () => {
        const config = {};
        $$('.cfg-toggle', card).forEach(t => (config[t.dataset.key] = t.checked));
        try {
          await Api.updateBoxConfig(boxId, config);
          toastSuccess('Đã cập nhật cấu hình bot');
        } catch (err) {
          toastError(err.message);
        }
      }, 400));
    });

    $('.remove-box-btn', card)?.addEventListener('click', async () => {
      if (!confirm('Bạn chắc chắn muốn xoá box này?')) return;
      try {
        await Api.deleteBox(boxId);
        toastSuccess('Đã xoá box');
        loadUserBoxes();
      } catch (err) {
        toastError(err.message);
      }
    });

    $('.view-box-log-btn', card)?.addEventListener('click', () => showBoxLogsModal(boxId));
    $('.view-box-stats-btn', card)?.addEventListener('click', () => showBoxStatsModal(boxId));
  });
}

// ---------- Modal kết nối box mới ----------
function openConnectBoxModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h4 style="margin-bottom:16px;">Kết nối box Messenger</h4>
      <form id="connect-box-form">
        <div class="form-group">
          <label class="form-label">Tên box</label>
          <input type="text" class="form-control" id="connect-box-name" placeholder="VD: Box giải đấu FF #1" required>
        </div>
        <div class="form-group">
          <label class="form-label">Link box / ID box</label>
          <input type="text" class="form-control" id="connect-box-id" placeholder="Dán link nhóm hoặc ID box" required>
        </div>
        <div class="flex gap-2" style="margin-top:16px;">
          <button type="button" class="btn btn-ghost btn-block cancel-modal">Huỷ</button>
          <button type="submit" class="btn btn-primary btn-block">Kết nối</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  $('.cancel-modal', overlay).addEventListener('click', () => overlay.remove());

  $('#connect-box-form', overlay).addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = $('button[type="submit"]', overlay);
    setButtonLoading(submitBtn, true, 'Đang kết nối...');
    try {
      await Api.connectBox({
        name: $('#connect-box-name', overlay).value.trim(),
        boxId: $('#connect-box-id', overlay).value.trim()
      });
      toastSuccess('Kết nối box thành công!');
      overlay.remove();
      loadUserBoxes();
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// ---------- Modal xem log hoạt động ----------
async function showBoxLogsModal(boxId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:560px;">
      <h4 style="margin-bottom:16px;">Log hoạt động bot</h4>
      <div id="box-logs-content" style="max-height:360px;overflow-y:auto;">
        <div class="skeleton skeleton-row"></div>
        <div class="skeleton skeleton-row"></div>
        <div class="skeleton skeleton-row"></div>
      </div>
      <button class="btn btn-ghost btn-block cancel-modal" style="margin-top:16px;">Đóng</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  $('.cancel-modal', overlay).addEventListener('click', () => overlay.remove());

  try {
    const data = await Api.getBoxLogs(boxId);
    const content = $('#box-logs-content', overlay);
    const logs = data.logs || [];
    content.innerHTML = logs.length
      ? logs.map(log => `
          <div style="padding:10px 0;border-bottom:1px solid var(--color-border);font-size:14px;">
            <span class="badge ${log.type === 'kick' ? 'badge-danger' : log.type === 'spam' ? 'badge-warning' : 'badge-info'}">${escapeHtml(log.type)}</span>
            <span style="margin-left:8px;">${escapeHtml(log.message)}</span>
            <div style="font-size:12px;color:var(--color-text-light);">${formatDateTime(log.createdAt)}</div>
          </div>
        `).join('')
      : '<p style="color:var(--color-text-muted);">Chưa có hoạt động nào</p>';
  } catch (err) {
    toastError('Không tải được log hoạt động');
  }
}

// ---------- Modal thống kê box ----------
async function showBoxStatsModal(boxId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <h4 style="margin-bottom:16px;">Thống kê box</h4>
      <div id="box-stats-content"><div class="skeleton skeleton-row"></div></div>
      <button class="btn btn-ghost btn-block cancel-modal" style="margin-top:16px;">Đóng</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  $('.cancel-modal', overlay).addEventListener('click', () => overlay.remove());

  try {
    const data = await Api.getBoxStats(boxId);
    $('#box-stats-content', overlay).innerHTML = `
      <div class="grid-2 gap-3">
        <div class="card stat-card"><div><div class="stat-value">${formatNumber(data.messagesProcessed || 0)}</div><div class="stat-label">Tin nhắn đã xử lý</div></div></div>
        <div class="card stat-card"><div><div class="stat-value">${formatNumber(data.membersKicked || 0)}</div><div class="stat-label">Thành viên bị kick</div></div></div>
        <div class="card stat-card"><div><div class="stat-value">${formatNumber(data.spamBlocked || 0)}</div><div class="stat-label">Spam đã chặn</div></div></div>
        <div class="card stat-card"><div><div class="stat-value">${formatNumber(data.warningsIssued || 0)}</div><div class="stat-label">Lượt cảnh cáo</div></div></div>
      </div>
    `;
  } catch (err) {
    toastError('Không tải được thống kê box');
  }
}

// ---------- Lịch sử thanh toán ----------
async function loadPaymentHistory() {
  const tbody = $('#payment-history-tbody');
  if (!tbody) return;
  try {
    const data = await Api.getPaymentHistory();
    tbody.innerHTML = (data.payments || []).map(p => `
      <tr>
        <td>${escapeHtml(p.planName)}</td>
        <td>${formatCurrency(p.amount)}</td>
        <td><span class="badge badge-${p.status === 'paid' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}">${escapeHtml(p.status)}</span></td>
        <td>${formatDateTime(p.createdAt)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" class="text-center">Chưa có giao dịch nào</td></tr>';
  } catch (err) {
    toastError('Không tải được lịch sử thanh toán');
  }
}

// ---------- Gia hạn gói ----------
function initRenewButton() {
  $('#renew-plan-btn')?.addEventListener('click', () => {
    location.href = 'pricing.html?renew=1';
  });
}

// ---------- Cập nhật avatar / thông tin cá nhân ----------
function initProfileForm() {
  const form = $('#profile-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = $('button[type="submit"]', form);
    setButtonLoading(submitBtn, true);
    try {
      const updated = await Api.updateProfile({
        username: $('#profile-username', form).value.trim(),
        avatar: $('#profile-avatar-url', form)?.value.trim()
      });
      TokenStore.setUser(updated.user);
      toastSuccess('Cập nhật thông tin thành công');
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  loadDashboardOverview();
  loadUserBoxes();
  loadPaymentHistory();
  initRenewButton();
  initProfileForm();
  $('#open-connect-box-modal-main')?.addEventListener('click', openConnectBoxModal);
});

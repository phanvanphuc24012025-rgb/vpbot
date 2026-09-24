/* ============================================
   PAYMENT.JS - Thanh toán gói thuê bot
   ============================================ */

const PLANS = {
  '1month': { name: 'Gói 1 tháng', price: 20000 },
  '2month': { name: 'Gói 2 tháng', price: 39000 }
};

let selectedPlan = null;
let appliedVoucher = null;

function initPlanSelection() {
  const buttons = $$('.select-plan-btn');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedPlan = btn.dataset.plan;
      openPaymentModal();
    });
  });
}

function openPaymentModal() {
  const plan = PLANS[selectedPlan];
  if (!plan) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal payment-box">
      <h4>Thanh toán ${escapeHtml(plan.name)}</h4>
      <div class="qr-frame">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--color-text-light);">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
        </svg>
      </div>
      <p style="font-size:13px;">Quét mã QR bằng ứng dụng Momo hoặc Ngân hàng để thanh toán</p>
      <div class="form-group" style="text-align:left;margin-top:16px;">
        <label class="form-label">Mã giảm giá (nếu có)</label>
        <div class="flex gap-2">
          <input type="text" class="form-control" id="voucher-input" placeholder="Nhập mã voucher">
          <button type="button" class="btn btn-outline" id="apply-voucher-btn">Áp dụng</button>
        </div>
      </div>
      <div id="price-summary" style="margin:16px 0;font-size:15px;">
        Tổng thanh toán: <strong id="final-price">${formatCurrency(plan.price)}</strong>
      </div>
      <div class="form-group" style="text-align:left;">
        <label class="form-label">Mã giao dịch</label>
        <input type="text" class="form-control" id="transaction-code" placeholder="Nhập mã giao dịch sau khi chuyển khoản">
      </div>
      <div class="flex gap-2" style="margin-top:16px;">
        <button type="button" class="btn btn-ghost btn-block cancel-modal">Huỷ</button>
        <button type="button" class="btn btn-primary btn-block" id="confirm-payment-btn">Xác nhận</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  $('.cancel-modal', overlay).addEventListener('click', () => overlay.remove());

  $('#apply-voucher-btn', overlay).addEventListener('click', async () => {
    const code = $('#voucher-input', overlay).value.trim();
    if (!code) return;
    try {
      const result = await Api.applyVoucher(code);
      appliedVoucher = result.voucher;
      const finalPrice = calcFinalPrice(plan.price, appliedVoucher);
      $('#final-price', overlay).textContent = formatCurrency(finalPrice);
      toastSuccess('Áp dụng mã giảm giá thành công!');
    } catch (err) {
      toastError(err.message);
    }
  });

  $('#confirm-payment-btn', overlay).addEventListener('click', async () => {
    const transactionCode = $('#transaction-code', overlay).value.trim();
    if (!transactionCode) {
      toastError('Vui lòng nhập mã giao dịch');
      return;
    }
    const btn = $('#confirm-payment-btn', overlay);
    setButtonLoading(btn, true, 'Đang xác nhận...');
    try {
      const payment = await Api.createPayment({
        plan: selectedPlan,
        voucherCode: appliedVoucher?.code || null,
        transactionCode
      });
      toastSuccess('Đã ghi nhận thanh toán, đang chờ xác nhận (pending)');
      overlay.remove();
      appliedVoucher = null;
      if ($('#payment-status-banner')) {
        showPaymentStatus(payment.status);
      }
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(btn, false);
    }
  });
}

function calcFinalPrice(basePrice, voucher) {
  if (!voucher) return basePrice;
  if (voucher.type === 'percent') return Math.round(basePrice * (1 - voucher.value / 100));
  return Math.max(0, basePrice - voucher.value);
}

function showPaymentStatus(status) {
  const banner = $('#payment-status-banner');
  if (!banner) return;
  const map = {
    pending: { text: 'Đang chờ xác nhận thanh toán', cls: 'payment-status-pending' },
    paid: { text: 'Thanh toán thành công', cls: 'payment-status-paid' },
    failed: { text: 'Thanh toán thất bại', cls: 'payment-status-failed' }
  };
  const info = map[status] || map.pending;
  banner.className = info.cls;
  banner.textContent = info.text;
  banner.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
  initPlanSelection();

  // Nếu vào từ nút "Gia hạn" trên dashboard
  if (getQueryParam('renew') === '1') {
    toastInfo('Chọn gói bên dưới để gia hạn dịch vụ');
  }
});

/* ============================================
   OTP.JS - Xác thực mã OTP 6 số
   ============================================ */

function initOtpInputs() {
  const inputs = $$('.otp-inputs input');
  if (!inputs.length) return;

  inputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '').slice(0, 1);
      if (input.value && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '').slice(0, inputs.length);
      pasted.split('').forEach((char, i) => {
        if (inputs[i]) inputs[i].value = char;
      });
      const nextEmpty = inputs.find(i => !i.value);
      (nextEmpty || inputs[inputs.length - 1]).focus();
    });
  });

  inputs[0].focus();
}

function getOtpValue() {
  return $$('.otp-inputs input').map(i => i.value).join('');
}

function startOtpCountdown(seconds = 60) {
  const timerEl = $('#otp-timer');
  const resendBtn = $('#resend-otp-btn');
  if (!timerEl || !resendBtn) return;

  let remaining = seconds;
  resendBtn.disabled = true;
  resendBtn.classList.add('hidden');
  timerEl.classList.remove('hidden');

  const interval = setInterval(() => {
    remaining--;
    timerEl.textContent = `Gửi lại mã sau ${remaining}s`;
    if (remaining <= 0) {
      clearInterval(interval);
      timerEl.classList.add('hidden');
      resendBtn.classList.remove('hidden');
      resendBtn.disabled = false;
    }
  }, 1000);

  timerEl.textContent = `Gửi lại mã sau ${remaining}s`;
}

function initOtpForm() {
  const form = $('#verify-otp-form');
  if (!form) return;

  initOtpInputs();
  startOtpCountdown(60);

  const email = sessionStorage.getItem('vpbot_pending_email');
  const type = getQueryParam('type') || 'register'; // register | reset
  const emailDisplay = $('#otp-email-display');
  if (emailDisplay && email) emailDisplay.textContent = email;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = getOtpValue();
    const submitBtn = $('button[type="submit"]', form);

    if (otp.length !== 6) {
      toastError('Vui lòng nhập đủ 6 số OTP');
      return;
    }
    if (!email) {
      toastError('Không tìm thấy email, vui lòng thực hiện lại từ đầu');
      return;
    }

    setButtonLoading(submitBtn, true, 'Đang xác thực...');
    try {
      const data = await Api.verifyOtp({ email, otp, type });
      if (type === 'reset') {
        sessionStorage.setItem('vpbot_reset_token', data.resetToken);
        toastSuccess('Xác thực thành công! Vui lòng đặt mật khẩu mới.');
        setTimeout(() => (location.href = 'reset-password.html'), 700);
      } else {
        TokenStore.set(data.token);
        TokenStore.setUser(data.user);
        toastSuccess('Xác thực tài khoản thành công!');
        setTimeout(() => (location.href = 'dashboard.html'), 700);
      }
      sessionStorage.removeItem('vpbot_pending_email');
    } catch (err) {
      toastError(err.message);
      $$('.otp-inputs input').forEach(i => (i.value = ''));
      $('.otp-inputs input').focus();
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  const resendBtn = $('#resend-otp-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      if (!email) return;
      setButtonLoading(resendBtn, true, 'Đang gửi...');
      try {
        await Api.resendOtp({ email, type });
        toastSuccess('Đã gửi lại mã OTP mới');
        startOtpCountdown(60);
      } catch (err) {
        toastError(err.message);
      } finally {
        setButtonLoading(resendBtn, false);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initOtpForm);

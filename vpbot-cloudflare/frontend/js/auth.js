/* ============================================
   AUTH.JS - Đăng ký / Đăng nhập / Quên mật khẩu
   ============================================ */

function setButtonLoading(btn, loading, loadingText = 'Đang xử lý...') {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span> ${loadingText}`;
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
  }
}

function showFieldError(inputEl, message) {
  const group = inputEl.closest('.form-group');
  if (!group) return;
  inputEl.classList.add('error');
  let errEl = group.querySelector('.form-error-text');
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.className = 'form-error-text';
    group.appendChild(errEl);
  }
  errEl.textContent = message;
}

function clearFieldError(inputEl) {
  const group = inputEl.closest('.form-group');
  if (!group) return;
  inputEl.classList.remove('error');
  const errEl = group.querySelector('.form-error-text');
  if (errEl) errEl.remove();
}

function clearAllFieldErrors(form) {
  $$('.form-control', form).forEach(clearFieldError);
}

// ---------- ĐĂNG KÝ ----------
function initRegisterForm() {
  const form = $('#register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllFieldErrors(form);

    const username = $('#reg-username', form);
    const email = $('#reg-email', form);
    const password = $('#reg-password', form);
    const confirmPassword = $('#reg-confirm-password', form);
    const submitBtn = $('button[type="submit"]', form);

    let valid = true;
    if (!isValidUsername(username.value.trim())) {
      showFieldError(username, 'Username phải 4-20 ký tự (chữ, số, gạch dưới)');
      valid = false;
    }
    if (!isValidEmail(email.value.trim())) {
      showFieldError(email, 'Email không hợp lệ');
      valid = false;
    }
    if (!isValidPassword(password.value)) {
      showFieldError(password, 'Mật khẩu tối thiểu 8 ký tự, có chữ và số');
      valid = false;
    }
    if (password.value !== confirmPassword.value) {
      showFieldError(confirmPassword, 'Mật khẩu xác nhận không khớp');
      valid = false;
    }
    if (!valid) return;

    setButtonLoading(submitBtn, true, 'Đang đăng ký...');
    try {
      await Api.register({
        username: username.value.trim(),
        email: email.value.trim(),
        password: password.value
      });
      toastSuccess('Đăng ký thành công! Vui lòng kiểm tra email để nhận mã OTP.');
      sessionStorage.setItem('vpbot_pending_email', email.value.trim());
      setTimeout(() => (location.href = 'verify-otp.html?type=register'), 800);
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// ---------- ĐĂNG NHẬP ----------
function initLoginForm() {
  const form = $('#login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllFieldErrors(form);

    const identifier = $('#login-identifier', form);
    const password = $('#login-password', form);
    const submitBtn = $('button[type="submit"]', form);

    if (!identifier.value.trim()) {
      showFieldError(identifier, 'Vui lòng nhập email hoặc username');
      return;
    }
    if (!password.value) {
      showFieldError(password, 'Vui lòng nhập mật khẩu');
      return;
    }

    setButtonLoading(submitBtn, true, 'Đang đăng nhập...');
    try {
      const data = await Api.login({
        identifier: identifier.value.trim(),
        password: password.value
      });
      TokenStore.set(data.token);
      TokenStore.setUser(data.user);
      toastSuccess('Đăng nhập thành công!');
      setTimeout(() => (location.href = data.user.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html'), 600);
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  // Placeholder đăng nhập Google
  const googleBtn = $('#google-login-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      toastInfo('Tính năng đăng nhập Google đang được tích hợp, vui lòng dùng email/username.');
    });
  }
}

// ---------- QUÊN MẬT KHẨU ----------
function initForgotPasswordForm() {
  const form = $('#forgot-password-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#forgot-email', form);
    const submitBtn = $('button[type="submit"]', form);

    if (!isValidEmail(email.value.trim())) {
      showFieldError(email, 'Email không hợp lệ');
      return;
    }
    clearFieldError(email);

    setButtonLoading(submitBtn, true, 'Đang gửi...');
    try {
      await Api.forgotPassword({ email: email.value.trim() });
      toastSuccess('Đã gửi mã OTP tới email của bạn.');
      sessionStorage.setItem('vpbot_pending_email', email.value.trim());
      setTimeout(() => (location.href = 'verify-otp.html?type=reset'), 800);
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// ---------- ĐẶT LẠI MẬT KHẨU (sau khi verify OTP reset) ----------
function initResetPasswordForm() {
  const form = $('#reset-password-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllFieldErrors(form);

    const password = $('#reset-new-password', form);
    const confirmPassword = $('#reset-confirm-password', form);
    const submitBtn = $('button[type="submit"]', form);
    const resetToken = sessionStorage.getItem('vpbot_reset_token');

    let valid = true;
    if (!isValidPassword(password.value)) {
      showFieldError(password, 'Mật khẩu tối thiểu 8 ký tự, có chữ và số');
      valid = false;
    }
    if (password.value !== confirmPassword.value) {
      showFieldError(confirmPassword, 'Mật khẩu xác nhận không khớp');
      valid = false;
    }
    if (!valid) return;

    setButtonLoading(submitBtn, true, 'Đang lưu...');
    try {
      await Api.resetPassword({ resetToken, newPassword: password.value });
      toastSuccess('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.');
      sessionStorage.removeItem('vpbot_reset_token');
      setTimeout(() => (location.href = 'login.html'), 800);
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// ---------- ĐỔI MẬT KHẨU (trong dashboard) ----------
function initChangePasswordForm() {
  const form = $('#change-password-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllFieldErrors(form);

    const oldPassword = $('#current-password', form);
    const newPassword = $('#new-password', form);
    const confirmPassword = $('#confirm-new-password', form);
    const submitBtn = $('button[type="submit"]', form);

    if (!isValidPassword(newPassword.value)) {
      showFieldError(newPassword, 'Mật khẩu tối thiểu 8 ký tự, có chữ và số');
      return;
    }
    if (newPassword.value !== confirmPassword.value) {
      showFieldError(confirmPassword, 'Mật khẩu xác nhận không khớp');
      return;
    }

    setButtonLoading(submitBtn, true);
    try {
      await Api.changePassword({ oldPassword: oldPassword.value, newPassword: newPassword.value });
      toastSuccess('Đổi mật khẩu thành công!');
      form.reset();
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// ---------- ĐĂNG XUẤT ----------
function initLogoutButtons() {
  $$('.logout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      TokenStore.clear();
      location.href = 'login.html';
    });
  });

  const logoutAllBtn = $('#logout-all-devices-btn');
  if (logoutAllBtn) {
    logoutAllBtn.addEventListener('click', async () => {
      try {
        await Api.logoutAllDevices();
        toastSuccess('Đã đăng xuất khỏi mọi thiết bị');
        TokenStore.clear();
        setTimeout(() => (location.href = 'login.html'), 800);
      } catch (err) {
        toastError(err.message);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initRegisterForm();
  initLoginForm();
  initForgotPasswordForm();
  initResetPasswordForm();
  initChangePasswordForm();
  initLogoutButtons();
});

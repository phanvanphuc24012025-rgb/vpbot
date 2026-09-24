/* ============================================
   UI.JS - Mobile menu, FAQ accordion, Slider, Chat widget
   ============================================ */

// ---------- Mobile menu ----------
function initMobileMenu() {
  const btn = $('.mobile-menu-btn');
  const menu = $('.nav-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('mobile-open'));
}

// ---------- FAQ Accordion ----------
function initFaqAccordion() {
  $$('.accordion-item').forEach(item => {
    const header = $('.accordion-header', item);
    const body = $('.accordion-body', item);
    if (!header || !body) return;

    header.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      $$('.accordion-item').forEach(other => {
        other.classList.remove('open');
        $('.accordion-body', other).style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });
}

// ---------- Hero Slider Banner ----------
function initHeroSlider() {
  const slider = $('.hero-slider');
  if (!slider) return;
  const slides = $$('.slide', slider);
  const dots = $$('.dot', slider);
  let current = 0;
  let autoplay = null;

  function goTo(index) {
    slides[current]?.classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current]?.classList.add('active');
    dots[current]?.classList.add('active');
  }

  dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); resetAutoplay(); }));

  function resetAutoplay() {
    clearInterval(autoplay);
    autoplay = setInterval(() => goTo(current + 1), 4500);
  }

  if (slides.length) {
    goTo(0);
    resetAutoplay();
  }
}

// ---------- Đếm số liệu chạy (khách hàng, box) ----------
function initCounters() {
  $$('.stat-num[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const duration = 1400;
    const startTime = performance.now();

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatNumber(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = formatNumber(target);
    }
    requestAnimationFrame(tick);
  });
}

// ---------- Chat widget giả lập ----------
function initChatWidget() {
  const btn = $('.chat-widget-btn');
  if (!btn) return;

  let panel = null;
  btn.addEventListener('click', () => {
    if (panel) {
      panel.remove();
      panel = null;
      return;
    }
    panel = document.createElement('div');
    panel.className = 'glass-card';
    panel.style.cssText = 'position:fixed;bottom:96px;right:24px;width:300px;z-index:8001;box-shadow:var(--shadow-lg);';
    panel.innerHTML = `
      <div class="flex items-center justify-between" style="margin-bottom:12px;">
        <strong>Hỗ trợ trực tuyến</strong>
        <button class="btn-icon close-chat" style="width:28px;height:28px;">✕</button>
      </div>
      <div id="chat-messages" style="height:180px;overflow-y:auto;font-size:14px;color:var(--color-text-muted);margin-bottom:8px;">
        Xin chào! VPBot có thể giúp gì cho bạn? 👋
      </div>
      <div class="flex gap-2">
        <input type="text" class="form-control" id="chat-input" placeholder="Nhập tin nhắn..." style="font-size:14px;padding:8px 12px;">
        <button class="btn btn-primary btn-sm" id="chat-send">Gửi</button>
      </div>
    `;
    document.body.appendChild(panel);

    $('.close-chat', panel).addEventListener('click', () => { panel.remove(); panel = null; });
    $('#chat-send', panel).addEventListener('click', sendChatMessage);
    $('#chat-input', panel).addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });

    function sendChatMessage() {
      const input = $('#chat-input', panel);
      const msgBox = $('#chat-messages', panel);
      if (!input.value.trim()) return;
      const userMsg = document.createElement('div');
      userMsg.style.cssText = 'text-align:right;margin:6px 0;color:var(--color-text);';
      userMsg.textContent = input.value;
      msgBox.appendChild(userMsg);
      input.value = '';
      msgBox.scrollTop = msgBox.scrollHeight;

      setTimeout(() => {
        const reply = document.createElement('div');
        reply.style.cssText = 'margin:6px 0;';
        reply.textContent = 'Cảm ơn bạn đã liên hệ! Đội ngũ VPBot sẽ phản hồi sớm nhất qua Messenger/Zalo.';
        msgBox.appendChild(reply);
        msgBox.scrollTop = msgBox.scrollHeight;
      }, 700);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initFaqAccordion();
  initHeroSlider();
  initCounters();
  initChatWidget();
});

/* ============================================
   SCORING.JS - Tính điểm trận đấu Free Fire
   Công thức: Điểm = Kill×2 + ĐiểmTop + Damage/100
   Top1=10đ Top2=6đ Top3=4đ Top4-5=2đ còn lại=0đ
   ============================================ */

function getTopPoint(top) {
  const t = Number(top);
  if (t === 1) return 10;
  if (t === 2) return 6;
  if (t === 3) return 4;
  if (t >= 4 && t <= 5) return 2;
  return 0;
}

function calcMatchScore({ kill, top, damage }) {
  const k = Number(kill) || 0;
  const d = Number(damage) || 0;
  const topPoint = getTopPoint(top);
  const score = k * 2 + topPoint + d / 100;
  return Math.round(score * 100) / 100;
}

// ---------- Form nhập 1 trận ----------
function initSingleMatchForm() {
  const form = $('#match-entry-form');
  if (!form) return;

  const killInput = $('#match-kill', form);
  const topInput = $('#match-top', form);
  const damageInput = $('#match-damage', form);
  const previewEl = $('#match-score-preview', form);

  function updatePreview() {
    if (!previewEl) return;
    const score = calcMatchScore({ kill: killInput.value, top: topInput.value, damage: damageInput.value });
    previewEl.textContent = score;
  }
  [killInput, topInput, damageInput].forEach(el => el && el.addEventListener('input', updatePreview));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = $('button[type="submit"]', form);
    const payload = {
      playerName: $('#match-player-name', form).value.trim(),
      kill: Number(killInput.value) || 0,
      top: Number(topInput.value) || 0,
      damage: Number(damageInput.value) || 0
    };
    if (!payload.playerName) {
      toastError('Vui lòng nhập tên người chơi');
      return;
    }

    setButtonLoading(submitBtn, true, 'Đang lưu...');
    try {
      await Api.submitMatch(payload);
      toastSuccess(`Đã lưu kết quả cho ${payload.playerName} (${calcMatchScore(payload)} điểm)`);
      form.reset();
      if (previewEl) previewEl.textContent = '0';
      loadLeaderboard();
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// ---------- Nhập nhiều trận cùng lúc ----------
let bulkRowCount = 0;
function addBulkMatchRow(container) {
  bulkRowCount++;
  const row = document.createElement('div');
  row.className = 'match-entry-row';
  row.dataset.rowId = bulkRowCount;
  row.innerHTML = `
    <input type="text" class="form-control bulk-name" placeholder="Tên người chơi">
    <input type="number" class="form-control bulk-kill" placeholder="Kill" min="0">
    <input type="number" class="form-control bulk-top" placeholder="Top" min="1">
    <input type="number" class="form-control bulk-damage" placeholder="Damage" min="0">
    <button type="button" class="btn-icon remove-row">✕</button>
  `;
  $('.remove-row', row).addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function initBulkMatchForm() {
  const container = $('#bulk-match-rows');
  const addBtn = $('#add-bulk-row-btn');
  const submitBtn = $('#submit-bulk-matches-btn');
  if (!container || !addBtn) return;

  addBulkMatchRow(container);
  addBulkMatchRow(container);
  addBulkMatchRow(container);

  addBtn.addEventListener('click', () => addBulkMatchRow(container));

  submitBtn?.addEventListener('click', async () => {
    const rows = $$('.match-entry-row', container);
    const matches = rows
      .map(row => ({
        playerName: $('.bulk-name', row).value.trim(),
        kill: Number($('.bulk-kill', row).value) || 0,
        top: Number($('.bulk-top', row).value) || 0,
        damage: Number($('.bulk-damage', row).value) || 0
      }))
      .filter(m => m.playerName);

    if (!matches.length) {
      toastError('Vui lòng nhập ít nhất 1 kết quả hợp lệ');
      return;
    }

    setButtonLoading(submitBtn, true, 'Đang lưu...');
    try {
      await Api.submitMatchesBulk({ matches });
      toastSuccess(`Đã lưu ${matches.length} kết quả trận đấu`);
      container.innerHTML = '';
      addBulkMatchRow(container);
      loadLeaderboard();
    } catch (err) {
      toastError(err.message);
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

// ---------- Import Excel / CSV ----------
function initImportMatchesForm() {
  const fileInput = $('#import-matches-file');
  const importBtn = $('#import-matches-btn');
  if (!fileInput || !importBtn) return;

  importBtn.addEventListener('click', async () => {
    const file = fileInput.files[0];
    if (!file) {
      toastError('Vui lòng chọn file Excel/CSV');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);

    setButtonLoading(importBtn, true, 'Đang import...');
    try {
      const result = await Api.importMatchesFile(formData);
      toastSuccess(`Đã import ${result.count || 0} kết quả trận đấu`);
      fileInput.value = '';
      loadLeaderboard();
    } catch (err) {
      toastError(err.message || 'Import thất bại, kiểm tra định dạng file');
    } finally {
      setButtonLoading(importBtn, false);
    }
  });
}

// ---------- Leaderboard ----------
async function loadLeaderboard() {
  const listEl = $('#leaderboard-list');
  if (!listEl) return;

  const periodFilter = $('#leaderboard-period');
  const period = periodFilter ? periodFilter.value : 'all';
  listEl.innerHTML = '<div class="skeleton skeleton-row"></div>'.repeat(6);

  try {
    const data = await Api.getLeaderboard(`?period=${period}`);
    renderLeaderboard(listEl, data.players || []);
  } catch (err) {
    listEl.innerHTML = `<p class="text-center" style="padding:20px;">Không tải được bảng xếp hạng: ${escapeHtml(err.message)}</p>`;
  }
}

function renderLeaderboard(container, players) {
  if (!players.length) {
    container.innerHTML = '<p class="text-center" style="padding:20px;color:var(--color-text-muted);">Chưa có dữ liệu trận đấu</p>';
    return;
  }
  container.innerHTML = players.map((p, idx) => {
    const rank = idx + 1;
    const rankClass = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '';
    return `
      <div class="leaderboard-row">
        <div class="rank-badge ${rankClass}">${rank}</div>
        <div style="flex:1;">
          <strong>${escapeHtml(p.playerName)}</strong>
          <div style="font-size:12px;color:var(--color-text-muted);">
            ${p.totalKill} kill · ${p.matchCount} trận · ${formatNumber(p.totalDamage)} dmg
          </div>
        </div>
        <div style="font-weight:800;color:var(--color-primary);font-size:18px;">${p.totalScore} đ</div>
      </div>
    `;
  }).join('');
}

// ---------- Lịch sử trận đấu ----------
async function loadMatchHistory() {
  const tbody = $('#match-history-tbody');
  if (!tbody) return;
  try {
    const data = await Api.getMatchHistory();
    tbody.innerHTML = (data.matches || []).map(m => `
      <tr>
        <td>${escapeHtml(m.playerName)}</td>
        <td>${m.kill}</td>
        <td>${m.top}</td>
        <td>${formatNumber(m.damage)}</td>
        <td><strong>${m.score}</strong></td>
        <td>${formatDateTime(m.createdAt)}</td>
      </tr>
    `).join('');
  } catch (err) {
    toastError('Không tải được lịch sử trận đấu');
  }
}

// ---------- Xuất kết quả ----------
function initExportButtons() {
  $('#export-pdf-btn')?.addEventListener('click', () => {
    window.open(Api.exportResults('pdf'), '_blank');
  });
  $('#export-excel-btn')?.addEventListener('click', () => {
    window.open(Api.exportResults('excel'), '_blank');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSingleMatchForm();
  initBulkMatchForm();
  initImportMatchesForm();
  initExportButtons();
  loadLeaderboard();
  loadMatchHistory();

  $('#leaderboard-period')?.addEventListener('change', loadLeaderboard);
});

const rows = document.querySelector('#visitRows');
const emptyState = document.querySelector('#emptyState');
const dialog = document.querySelector('#detailDialog');
const detailContent = document.querySelector('#detailContent');
const departmentSelect = document.querySelector('#department');

const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

function renderRows(visits) {
  rows.innerHTML = visits.map((visit) => `
    <tr>
      <td><strong>${escapeHtml(visit.id)}</strong></td>
      <td><span class="patient">${escapeHtml(visit.patientName)}</span><br><span class="muted">${visit.gender} · ${visit.age}岁</span></td>
      <td>${escapeHtml(visit.department)}</td>
      <td>${escapeHtml(visit.diagnosis)}</td>
      <td>${escapeHtml(visit.visitTime)}</td>
      <td><button class="link-button" data-id="${escapeHtml(visit.id)}">查看详情</button></td>
    </tr>
  `).join('');
  emptyState.hidden = visits.length > 0;
}

async function loadVisits() {
  const params = new URLSearchParams();
  const keyword = document.querySelector('#keyword').value.trim();
  const department = departmentSelect.value;
  if (keyword) params.set('q', keyword);
  if (department) params.set('department', department);
  const response = await fetch(`/api/visits?${params}`);
  renderRows(await response.json());
}

async function loadInitialData() {
  const response = await fetch('/api/visits');
  const visits = await response.json();
  renderRows(visits);
  document.querySelector('#totalCount').textContent = visits.length;
  document.querySelector('#departmentCount').textContent = new Set(visits.map((visit) => visit.department)).size;
  document.querySelector('#todayCount').textContent = visits.filter((visit) => visit.visitTime.startsWith('2026-09-29')).length;
  [...new Set(visits.map((visit) => visit.department))].sort().forEach((department) => {
    departmentSelect.insertAdjacentHTML('beforeend', `<option>${escapeHtml(department)}</option>`);
  });
}

async function showDetail(id) {
  const response = await fetch(`/api/visits/${encodeURIComponent(id)}`);
  const visit = await response.json();
  detailContent.innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><span>就诊编号</span><strong>${escapeHtml(visit.id)}</strong></div>
      <div class="detail-item"><span>就诊时间</span><strong>${escapeHtml(visit.visitTime)}</strong></div>
      <div class="detail-item"><span>患者</span><strong>${escapeHtml(visit.patientName)}，${visit.gender}，${visit.age}岁</strong></div>
      <div class="detail-item"><span>接诊科室与医生</span><strong>${escapeHtml(visit.department)} · ${escapeHtml(visit.doctor)}</strong></div>
      <div class="detail-item wide"><span>诊断</span><strong>${escapeHtml(visit.diagnosis)}</strong></div>
      <div class="detail-item wide"><span>主要症状</span><strong>${escapeHtml(visit.symptoms)}</strong></div>
      <div class="detail-item wide"><span>处理建议</span><strong>${escapeHtml(visit.advice)}</strong></div>
    </div>`;
  dialog.showModal();
}

document.querySelector('#filters').addEventListener('submit', (event) => {
  event.preventDefault();
  loadVisits();
});

rows.addEventListener('click', (event) => {
  const button = event.target.closest('[data-id]');
  if (button) showDetail(button.dataset.id);
});

document.querySelector('#closeDialog').addEventListener('click', () => dialog.close());
loadInitialData();

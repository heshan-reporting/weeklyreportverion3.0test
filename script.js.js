let currentWeekIndex = 0;
let cplChartInst = null;
let perfChartInst = null;

document.addEventListener('DOMContentLoaded', () => {
  initDropdowns();
  loadWeekData();
  setupEventListeners();
});

function initDropdowns() {
  const ws = document.getElementById('weekSelector');
  dashboardData.weeks.forEach((w, i) => {
    let opt = document.createElement('option');
    opt.value = i;
    opt.textContent = w.weekLabel;
    ws.appendChild(opt);
  });
}

function loadWeekData() {
  const data = dashboardData.weeks[currentWeekIndex];
  
  animateValue('val-spend', 0, data.totals.spend, true);
  animateValue('val-leads', 0, data.totals.leads, false);
  animateValue('val-cpl', 0, data.totals.cpl, true);
  animateValue('val-cpm', 0, data.totals.cpm, true);
  animateValue('val-reach', 0, data.totals.reach, false);

  populateCampaignCards(data.campaigns);
  populateAdTable(data.ads);
  updateCampaignFilter(data.campaigns);
  renderCharts();
  filterContent();
}

function animateValue(id, start, end, isCurrency) {
  const obj = document.getElementById(id);
  let startTimestamp = null;
  const duration = 1000;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const current = progress * (end - start) + start;
    obj.innerHTML = isCurrency ? '$' + current.toFixed(2) : Math.floor(current).toLocaleString();
    if (progress < 1) { window.requestAnimationFrame(step); }
  };
  window.requestAnimationFrame(step);
}

function populateCampaignCards(campaigns) {
  const grid = document.getElementById('campaignsGrid');
  grid.innerHTML = '';
  campaigns.forEach(c => {
    const div = document.createElement('div');
    div.className = 'camp-card searchable-item';
    div.dataset.name = c.name.toLowerCase();
    div.dataset.status = c.status.toLowerCase();
    div.innerHTML = `
      <h4>${c.name}</h4>
      <div class="camp-metrics">
        <span>Spend: $${c.spend.toFixed(2)}</span>
        <span>Leads: ${c.leads}</span>
      </div>
      <div class="camp-metrics" style="margin-top:8px;">
        <span>CPL: $${c.cpl.toFixed(2)}</span>
        <span>CPM: $${c.cpm.toFixed(2)}</span>
      </div>
    `;
    grid.appendChild(div);
  });
}

function populateAdTable(ads) {
  const tbody = document.getElementById('adsTableBody');
  tbody.innerHTML = '';
  ads.forEach(a => {
    const tr = document.createElement('tr');
    tr.className = 'searchable-row';
    tr.dataset.camp = a.campaignName.toLowerCase();
    tr.dataset.adset = a.adSetName.toLowerCase();
    tr.dataset.ad = a.adName.toLowerCase();
    tr.innerHTML = `
      <td>${a.campaignName}</td>
      <td>${a.adSetName}</td>
      <td>${a.adName}</td>
      <td>$${a.spend.toFixed(2)}</td>
      <td>${a.leads}</td>
      <td>$${a.cpl.toFixed(2)}</td>
      <td>$${a.cpm.toFixed(2)}</td>
      <td>${a.frequency.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateCampaignFilter(campaigns) {
  const cf = document.getElementById('campaignFilter');
  cf.innerHTML = '<option value="all">All Campaigns</option>';
  campaigns.forEach(c => {
    let opt = document.createElement('option');
    opt.value = c.name.toLowerCase();
    opt.textContent = c.name;
    cf.appendChild(opt);
  });
}

function setupEventListeners() {
  document.getElementById('weekSelector').addEventListener('change', (e) => {
    currentWeekIndex = e.target.value;
    loadWeekData();
  });
  document.getElementById('searchBar').addEventListener('input', filterContent);
  document.getElementById('statusFilter').addEventListener('change', filterContent);
  document.getElementById('campaignFilter').addEventListener('change', filterContent);
}

function filterContent() {
  const search = document.getElementById('searchBar').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;
  const camp = document.getElementById('campaignFilter').value;

  document.querySelectorAll('.camp-card').forEach(card => {
    const matchSearch = card.dataset.name.includes(search);
    const matchStatus = status === 'all' || card.dataset.status === status;
    const matchCamp = camp === 'all' || card.dataset.name === camp;
    card.style.display = (matchSearch && matchStatus && matchCamp) ? 'block' : 'none';
  });

  document.querySelectorAll('.searchable-row').forEach(row => {
    const matchSearch = row.dataset.camp.includes(search) || row.dataset.adset.includes(search) || row.dataset.ad.includes(search);
    const matchCamp = camp === 'all' || row.dataset.camp === camp;
    row.style.display = (matchSearch && matchCamp) ? 'table-row' : 'none';
  });
}

function renderCharts() {
  const ctx1 = document.getElementById('cplChart').getContext('2d');
  const ctx2 = document.getElementById('perfChart').getContext('2d');
  
  if (cplChartInst) cplChartInst.destroy();
  if (perfChartInst) perfChartInst.destroy();

  const weeks = dashboardData.weeks.map(w => w.weekLabel);
  const cpls = dashboardData.weeks.map(w => w.totals.cpl);

  cplChartInst = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: weeks,
      datasets: [{ label: 'Cost per Lead ($)', data: cpls, borderColor: '#4F6EF7', tension: 0.4 }]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
  });

  const topCamps = dashboardData.weeks[currentWeekIndex].campaigns.sort((a,b) => b.spend - a.spend).slice(0, 5);
  perfChartInst = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: topCamps.map(c => c.name.substring(0, 15) + '...'),
      datasets: [
        { label: 'Spend ($)', data: topCamps.map(c => c.spend), backgroundColor: '#8B5CF6' },
        { label: 'Leads', data: topCamps.map(c => c.leads), backgroundColor: '#10B981' }
      ]
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}
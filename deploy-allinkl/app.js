// Frontend-Logik für Leadnase.

const els = {
  form: document.getElementById('search-form'),
  state: document.getElementById('state'),
  city: document.getElementById('city'),
  customCityToggle: document.getElementById('custom-city-toggle'),
  customCityField: document.getElementById('custom-city-field'),
  customCity: document.getElementById('custom-city'),
  industry: document.getElementById('industry'),
  submit: document.getElementById('submit-btn'),
  status: document.getElementById('status'),
  results: document.getElementById('results'),
  resultsTitle: document.getElementById('results-title'),
  tbody: document.querySelector('#results-table tbody'),
  exportBtn: document.getElementById('export-btn'),
};

let regionData = { bundeslaender: [], regions: {} };
let useCustomCity = false;
let lastResults = null;

// --- Stammdaten laden -------------------------------------------------------
async function init() {
  try {
    const [regionsResp, industriesResp] = await Promise.all([
      fetch('regions.json').then((r) => r.json()),
      fetch('industries.json').then((r) => r.json()),
    ]);

    regionData = regionsResp;
    fillSelect(els.state, regionData.bundeslaender.map((b) => ({ value: b, label: b })), 'Bitte wählen…');

    fillSelect(
      els.industry,
      industriesResp.industries.map((i) => ({ value: i.id, label: i.label })),
      'Bitte wählen…'
    );
    els.industry.disabled = false;
  } catch (err) {
    showError('Stammdaten konnten nicht geladen werden. Läuft der Server?');
  }
}

function fillSelect(select, items, placeholder) {
  select.innerHTML = '';
  const opt = document.createElement('option');
  opt.value = '';
  opt.disabled = true;
  opt.selected = true;
  opt.textContent = placeholder;
  select.appendChild(opt);
  for (const item of items) {
    const o = document.createElement('option');
    o.value = item.value;
    o.textContent = item.label;
    select.appendChild(o);
  }
}

// --- Kaskade Bundesland -> Stadt -------------------------------------------
els.state.addEventListener('change', () => {
  const cities = regionData.regions[els.state.value] || [];
  fillSelect(els.city, cities.map((c) => ({ value: c, label: c })), 'Bitte wählen…');
  els.city.disabled = false;
});

els.customCityToggle.addEventListener('click', () => {
  useCustomCity = !useCustomCity;
  els.customCityField.classList.toggle('hidden', !useCustomCity);
  els.city.disabled = useCustomCity;
  els.customCityToggle.textContent = useCustomCity ? 'Stadt aus Liste wählen' : 'Andere Stadt eingeben';
  if (useCustomCity) els.customCity.focus();
});

function selectedCity() {
  return useCustomCity ? els.customCity.value.trim() : els.city.value;
}

// --- Suche ------------------------------------------------------------------
els.form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const state = els.state.value;
  const city = selectedCity();
  const industryId = els.industry.value;
  const filter = document.querySelector('input[name="filter"]:checked').value;

  if (!state || !city || !industryId) {
    showError('Bitte Bundesland, Stadt und Branche auswählen.');
    return;
  }

  setLoading(true, filter);

  try {
    const resp = await fetch('api/leads.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, city, industryId, filter }),
    });
    const data = await resp.json();

    if (!resp.ok) {
      showError(data.error || 'Unbekannter Fehler.', data.detail);
      els.results.classList.add('hidden');
      return;
    }

    lastResults = data;
    renderResults(data);
  } catch (err) {
    showError('Netzwerkfehler. Bitte erneut versuchen.');
  } finally {
    setLoading(false);
  }
});

function setLoading(loading, filter) {
  els.submit.disabled = loading;
  if (loading) {
    els.results.classList.add('hidden');
    els.status.className = 'status loading';
    const checking = filter === 'none' ? '' : ' Webseiten werden live geprüft, das kann etwas dauern.';
    els.status.innerHTML = `<div class="spinner"></div><div>Suche läuft…${checking}</div>`;
    els.status.classList.remove('hidden');
  } else {
    els.submit.disabled = false;
  }
}

function showError(message, detail) {
  els.status.className = 'status error';
  els.status.textContent = detail ? `${message} (${detail})` : message;
  els.status.classList.remove('hidden');
}

function renderResults(data) {
  const { meta, leads } = data;

  els.status.classList.add('hidden');
  els.results.classList.remove('hidden');

  const filterLabel = { none: 'ohne Webseite', broken: 'mit kaputter Webseite', both: 'ohne oder mit kaputter Webseite' }[meta.filter];
  els.resultsTitle.textContent =
    `${meta.resultCount} ${meta.industry} in ${meta.city} ${filterLabel} ` +
    `(von ${meta.totalFound} gefunden)`;

  els.tbody.innerHTML = '';

  if (leads.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" class="muted">Keine passenden Betriebe gefunden. Versuche eine andere Stadt, Branche oder einen anderen Filter.</td>`;
    els.tbody.appendChild(tr);
    return;
  }

  for (const lead of leads) {
    const tr = document.createElement('tr');

    const websiteCell = lead.hasWebsite
      ? `<a href="${escapeHtml(normalizeUrl(lead.website))}" target="_blank" rel="noopener">${escapeHtml(lead.website)}</a>` +
        (lead.websiteStatus === 'broken'
          ? ` <span class="badge broken" title="${escapeHtml(lead.websiteReason || 'nicht erreichbar')}">kaputt</span>`
          : '')
      : `<span class="badge none">keine Webseite</span>`;

    tr.innerHTML = `
      <td><strong>${escapeHtml(lead.name)}</strong></td>
      <td class="muted">${escapeHtml(lead.address) || '—'}</td>
      <td>${lead.phone ? `<a href="tel:${escapeHtml(lead.phone.replace(/\s/g, ''))}">${escapeHtml(lead.phone)}</a>` : '<span class="muted">—</span>'}</td>
      <td>${lead.email ? `<a href="mailto:${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</a>` : '<span class="muted">—</span>'}</td>
      <td>${websiteCell}</td>
      <td>${lead.mapsUrl ? `<a href="${escapeHtml(lead.mapsUrl)}" target="_blank" rel="noopener">Karte</a>` : ''}</td>
    `;
    els.tbody.appendChild(tr);
  }
}

// --- CSV-Export -------------------------------------------------------------
els.exportBtn.addEventListener('click', () => {
  if (!lastResults || !lastResults.leads.length) return;
  const rows = [['Name', 'Adresse', 'Telefon', 'E-Mail', 'Webseite', 'Webseiten-Status', 'Karte']];
  for (const l of lastResults.leads) {
    const status = l.hasWebsite ? (l.websiteStatus === 'broken' ? 'kaputt' : l.websiteStatus) : 'keine';
    rows.push([l.name, l.address, l.phone, l.email, l.website, status, l.mapsUrl]);
  }
  const csv = rows.map((r) => r.map(csvCell).join(';')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const m = lastResults.meta;
  a.href = url;
  a.download = `leads-${slug(m.city)}-${slug(m.industry)}-${m.filter}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

function csvCell(value) {
  const v = String(value ?? '');
  return /[";\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// --- Hilfsfunktionen --------------------------------------------------------
function normalizeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init();

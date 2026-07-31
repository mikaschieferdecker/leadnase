import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { regions, bundeslaender } from './data/regions.js';
import { industries, industriesById } from './data/industries.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Stammdaten für das Frontend (Bundesländer, Städte, Branchen)
// ---------------------------------------------------------------------------
app.get('/api/regions', (req, res) => {
  res.json({ bundeslaender, regions });
});

app.get('/api/industries', (req, res) => {
  res.json({ industries: industries.map(({ id, label }) => ({ id, label })) });
});

// ---------------------------------------------------------------------------
// Overpass-Abfrage
// ---------------------------------------------------------------------------
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// Baut die Overpass-QL-Abfrage: alle Betriebe der gewünschten Branche, die
// sowohl innerhalb des Bundeslandes (admin_level 4) als auch innerhalb der
// Stadt liegen. Die doppelte Flächen-Einschränkung (area.state)(area.city)
// wirkt als Schnittmenge und macht mehrdeutige Städtenamen eindeutig.
export function buildOverpassQuery(state, city, industry) {
  const s = escapeOverpass(state);
  const c = escapeOverpass(city);

  const lines = industry.filters
    .map((f) => `  nwr${f}(area.state)(area.city);`)
    .join('\n');

  return `[out:json][timeout:120];
area["name"="${s}"]["boundary"="administrative"]["admin_level"="4"]->.state;
area["name"="${c}"]["boundary"="administrative"]->.city;
(
${lines}
);
out center tags;`;
}

function escapeOverpass(value) {
  // Anführungszeichen und Backslashes maskieren, damit die Abfrage nicht bricht.
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function runOverpass(query) {
  let lastError;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 130_000);
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'leadnase/1.0 (lead finder tool)',
        },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!resp.ok) {
        lastError = new Error(`Overpass ${endpoint} antwortete mit HTTP ${resp.status}`);
        continue;
      }
      return await resp.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Alle Overpass-Endpunkte nicht erreichbar');
}

// ---------------------------------------------------------------------------
// Betriebe aus dem Overpass-Ergebnis extrahieren
// ---------------------------------------------------------------------------
export function extractLeads(overpassJson) {
  const seen = new Set();
  const leads = [];

  for (const el of overpassJson.elements ?? []) {
    const tags = el.tags ?? {};
    const name = tags.name || tags['brand'] || tags['operator'];
    if (!name) continue; // Ohne Namen ist ein Lead nicht brauchbar.

    // Duplikate (gleicher Name + gleiche Adresse) vermeiden.
    const address = buildAddress(tags);
    const key = `${name.toLowerCase()}|${address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const website = tags.website || tags['contact:website'] || tags.url || tags['contact:url'] || '';
    const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '';
    const email = tags.email || tags['contact:email'] || '';

    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    leads.push({
      name,
      address,
      phone,
      email,
      website,
      hasWebsite: Boolean(website),
      websiteStatus: website ? 'unknown' : 'none',
      lat,
      lon,
      mapsUrl: lat && lon ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=19/${lat}/${lon}` : '',
    });
  }

  return leads;
}

function buildAddress(tags) {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const cityLine = [tags['addr:postcode'], tags['addr:city']].filter(Boolean).join(' ');
  return [street, cityLine].filter(Boolean).join(', ');
}

// ---------------------------------------------------------------------------
// Webseiten-Prüfung ("kaputt" = nicht erreichbar oder Fehlerstatus)
// ---------------------------------------------------------------------------
export async function checkWebsite(rawUrl) {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const resp = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; leadnase/1.0; +lead finder)',
      },
    });
    clearTimeout(timeout);
    if (resp.status >= 400) {
      return { status: 'broken', code: resp.status, reason: `HTTP ${resp.status}` };
    }
    return { status: 'ok', code: resp.status };
  } catch (err) {
    return { status: 'broken', reason: normalizeError(err) };
  }
}

function normalizeError(err) {
  if (err?.name === 'AbortError') return 'Zeitüberschreitung (keine Antwort)';
  const cause = err?.cause?.code || err?.code || '';
  if (cause === 'ENOTFOUND') return 'Domain nicht gefunden (DNS)';
  if (cause === 'ECONNREFUSED') return 'Verbindung abgelehnt';
  if (cause === 'CERT_HAS_EXPIRED') return 'SSL-Zertifikat abgelaufen';
  if (cause) return cause;
  return err?.message || 'Nicht erreichbar';
}

// Prüft mehrere Webseiten parallel, aber mit begrenzter Gleichzeitigkeit.
async function checkWebsitesWithLimit(leads, limit = 10) {
  const targets = leads.filter((l) => l.hasWebsite);
  let index = 0;

  async function worker() {
    while (index < targets.length) {
      const lead = targets[index++];
      const result = await checkWebsite(lead.website);
      lead.websiteStatus = result.status;
      lead.websiteCode = result.code;
      lead.websiteReason = result.reason;
    }
  }

  const workers = Array.from({ length: Math.min(limit, targets.length) }, () => worker());
  await Promise.all(workers);
}

// ---------------------------------------------------------------------------
// Haupt-Endpunkt: Leads suchen
// ---------------------------------------------------------------------------
app.post('/api/leads', async (req, res) => {
  const { state, city, industryId, filter } = req.body ?? {};

  // Eingaben validieren.
  if (!state || !city || !industryId) {
    return res.status(400).json({ error: 'Bitte Bundesland, Stadt und Branche angeben.' });
  }
  if (!bundeslaender.includes(state)) {
    return res.status(400).json({ error: `Unbekanntes Bundesland: ${state}` });
  }
  const industry = industriesById[industryId];
  if (!industry) {
    return res.status(400).json({ error: `Unbekannte Branche: ${industryId}` });
  }
  const websiteFilter = ['none', 'broken', 'both'].includes(filter) ? filter : 'none';

  try {
    const query = buildOverpassQuery(state, city, industry);
    const overpassJson = await runOverpass(query);
    let leads = extractLeads(overpassJson);

    const totalFound = leads.length;

    // Je nach Filter müssen wir ggf. die Webseiten prüfen.
    const needsWebsiteCheck = websiteFilter === 'broken' || websiteFilter === 'both';
    let checkedCount = 0;
    if (needsWebsiteCheck) {
      // Um lange Wartezeiten zu vermeiden, nur eine begrenzte Anzahl prüfen.
      const withWebsite = leads.filter((l) => l.hasWebsite);
      checkedCount = withWebsite.length;
      await checkWebsitesWithLimit(leads, 10);
    }

    // Nach Webseiten-Filter filtern.
    let filtered;
    if (websiteFilter === 'none') {
      filtered = leads.filter((l) => !l.hasWebsite);
    } else if (websiteFilter === 'broken') {
      filtered = leads.filter((l) => l.hasWebsite && l.websiteStatus === 'broken');
    } else {
      // both: keine Webseite ODER kaputte Webseite
      filtered = leads.filter((l) => !l.hasWebsite || l.websiteStatus === 'broken');
    }

    // Nur Leads mit Kontaktmöglichkeit (Telefon oder E-Mail) behalten.
    filtered = filtered.filter((l) => l.phone || l.email);

    // Alphabetisch sortieren.
    filtered.sort((a, b) => a.name.localeCompare(b.name, 'de'));

    res.json({
      meta: {
        state,
        city,
        industry: industry.label,
        filter: websiteFilter,
        totalFound,
        websitesChecked: checkedCount,
        resultCount: filtered.length,
      },
      leads: filtered,
    });
  } catch (err) {
    console.error('Fehler bei /api/leads:', err);
    res.status(502).json({
      error: 'Die Abfrage ist fehlgeschlagen. Bitte später erneut versuchen.',
      detail: err?.message || String(err),
    });
  }
});

// Server nur starten, wenn die Datei direkt ausgeführt wird (nicht beim Import in Tests).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`leadnase läuft auf http://localhost:${PORT}`);
  });
}

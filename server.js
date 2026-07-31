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
// Google Places API (New) — Text Search
// ---------------------------------------------------------------------------
const GOOGLE_PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.location',
  'nextPageToken',
].join(',');

// Liefert den API-Schlüssel aus der Umgebungsvariable GOOGLE_PLACES_API_KEY.
export function getApiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  return key && key.trim() !== '' ? key.trim() : null;
}

// Sucht Betriebe über die Google Places Text Search (New), inkl. Paginierung.
async function searchGooglePlaces(apiKey, textQuery, maxPages = 3) {
  const all = [];
  let pageToken = null;

  for (let page = 0; page < maxPages; page++) {
    const payload = { textQuery, languageCode: 'de', regionCode: 'DE', pageSize: 20 };
    if (pageToken) payload.pageToken = pageToken;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let resp;
    try {
      resp = await fetch(GOOGLE_PLACES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': GOOGLE_FIELD_MASK,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg = json?.error?.message || `HTTP ${resp.status}`;
      throw new Error(`Google Places: ${msg}`);
    }
    if (!json) throw new Error('Ungültige Antwort von Google Places');

    for (const p of json.places ?? []) all.push(p);

    pageToken = json.nextPageToken ?? null;
    if (!pageToken) break;
  }

  return all;
}

// Entfernt ein abschließendes ", Deutschland" / ", Germany" aus der Adresse.
function cleanAddress(addr) {
  return String(addr || '').replace(/,\s*(Deutschland|Germany)\s*$/u, '');
}

// ---------------------------------------------------------------------------
// Google-Places-Objekte in einheitliche Lead-Datensätze umwandeln
// ---------------------------------------------------------------------------
export function extractLeads(places) {
  const seen = new Set();
  const leads = [];

  for (const p of places ?? []) {
    const name = p.displayName?.text || '';
    if (!name) continue; // Ohne Namen ist ein Lead nicht brauchbar.

    // Duplikate (gleicher Name + gleiche Adresse) vermeiden.
    const address = cleanAddress(p.formattedAddress);
    const key = `${name.toLowerCase()}|${address.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const website = p.websiteUri || '';
    const phone = p.nationalPhoneNumber || p.internationalPhoneNumber || '';
    const email = ''; // Google Places liefert keine E-Mail-Adressen.
    const lat = p.location?.latitude;
    const lon = p.location?.longitude;
    const id = p.id || '';

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
      mapsUrl: id ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(id)}` : '',
    });
  }

  return leads;
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

  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error: 'Google-Places-API-Schlüssel fehlt. Bitte Umgebungsvariable GOOGLE_PLACES_API_KEY setzen.',
    });
  }

  try {
    const textQuery = `${industry.label} in ${city}`;
    const places = await searchGooglePlaces(apiKey, textQuery);
    let leads = extractLeads(places);

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

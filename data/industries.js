// Branchen (Industries) → OpenStreetMap Tag-Filter.
//
// Jede Branche bildet auf einen oder mehrere OSM-Tag-Filter ab. Ein Betrieb
// zählt zur Branche, wenn er MINDESTENS einen dieser Filter erfüllt.
// Die Filter sind als roher Overpass-Tag-Ausdruck angegeben, z. B.
// '["shop"="hairdresser"]'.

export const industries = [
  { id: 'restaurant', label: 'Restaurant', filters: ['["amenity"="restaurant"]'] },
  { id: 'cafe', label: 'Café', filters: ['["amenity"="cafe"]'] },
  { id: 'bar', label: 'Bar / Kneipe', filters: ['["amenity"="bar"]', '["amenity"="pub"]'] },
  { id: 'hotel', label: 'Hotel / Pension', filters: ['["tourism"="hotel"]', '["tourism"="guest_house"]'] },
  { id: 'imbiss', label: 'Imbiss / Schnellrestaurant', filters: ['["amenity"="fast_food"]'] },

  { id: 'friseur', label: 'Friseur', filters: ['["shop"="hairdresser"]'] },
  { id: 'kosmetik', label: 'Kosmetik / Beauty', filters: ['["shop"="beauty"]'] },
  { id: 'nagelstudio', label: 'Nagelstudio', filters: ['["shop"="beauty"]["beauty"="nails"]', '["leisure"="nail_salon"]'] },
  { id: 'tattoo', label: 'Tattoo-Studio', filters: ['["shop"="tattoo"]'] },
  { id: 'fitness', label: 'Fitnessstudio', filters: ['["leisure"="fitness_centre"]'] },

  { id: 'baeckerei', label: 'Bäckerei', filters: ['["shop"="bakery"]'] },
  { id: 'metzgerei', label: 'Metzgerei', filters: ['["shop"="butcher"]'] },
  { id: 'blumen', label: 'Blumenladen', filters: ['["shop"="florist"]'] },
  { id: 'optiker', label: 'Optiker', filters: ['["shop"="optician"]'] },
  { id: 'juwelier', label: 'Juwelier', filters: ['["shop"="jewelry"]'] },
  { id: 'bekleidung', label: 'Bekleidungsgeschäft', filters: ['["shop"="clothes"]'] },
  { id: 'moebel', label: 'Möbelgeschäft', filters: ['["shop"="furniture"]'] },

  { id: 'arzt', label: 'Arztpraxis', filters: ['["amenity"="doctors"]', '["healthcare"="doctor"]'] },
  { id: 'zahnarzt', label: 'Zahnarzt', filters: ['["amenity"="dentist"]', '["healthcare"="dentist"]'] },
  { id: 'apotheke', label: 'Apotheke', filters: ['["amenity"="pharmacy"]'] },
  { id: 'physio', label: 'Physiotherapie', filters: ['["healthcare"="physiotherapist"]'] },
  { id: 'tierarzt', label: 'Tierarzt', filters: ['["amenity"="veterinary"]'] },

  { id: 'anwalt', label: 'Rechtsanwalt', filters: ['["office"="lawyer"]'] },
  { id: 'steuerberater', label: 'Steuerberater', filters: ['["office"="tax_advisor"]'] },
  { id: 'makler', label: 'Immobilienmakler', filters: ['["office"="estate_agent"]'] },
  { id: 'versicherung', label: 'Versicherung', filters: ['["office"="insurance"]'] },

  { id: 'elektriker', label: 'Elektriker', filters: ['["craft"="electrician"]'] },
  { id: 'installateur', label: 'Sanitär / Installateur', filters: ['["craft"="plumber"]', '["craft"="hvac"]'] },
  { id: 'maler', label: 'Maler / Lackierer', filters: ['["craft"="painter"]'] },
  { id: 'schreiner', label: 'Schreiner / Tischler', filters: ['["craft"="carpenter"]', '["craft"="joiner"]'] },
  { id: 'dachdecker', label: 'Dachdecker', filters: ['["craft"="roofer"]'] },

  { id: 'kfz', label: 'Kfz-Werkstatt', filters: ['["shop"="car_repair"]'] },
  { id: 'autohaus', label: 'Autohaus', filters: ['["shop"="car"]'] },

  { id: 'fotograf', label: 'Fotograf', filters: ['["craft"="photographer"]', '["shop"="photo"]'] },
  { id: 'reisebuero', label: 'Reisebüro', filters: ['["shop"="travel_agency"]'] },
  { id: 'reinigung', label: 'Reinigung / Textilreinigung', filters: ['["shop"="dry_cleaning"]', '["shop"="laundry"]'] },
];

export const industriesById = Object.fromEntries(industries.map((i) => [i.id, i]));

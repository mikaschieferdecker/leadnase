// Die 16 Bundesländer mit einer Auswahl der jeweils größten Städte.
// Der Nutzer kann im Frontend zusätzlich eine eigene Stadt eintippen,
// falls die gewünschte Stadt nicht in der Liste steht.
//
// Hinweis zu den Stadtstaaten (Berlin, Hamburg, Bremen): Hier ist das
// Bundesland gleichzeitig die Stadt. Deshalb steht der Stadtname identisch
// in der Städteliste.

export const regions = {
  'Baden-Württemberg': [
    'Stuttgart', 'Mannheim', 'Karlsruhe', 'Freiburg im Breisgau', 'Heidelberg',
    'Ulm', 'Heilbronn', 'Pforzheim', 'Reutlingen', 'Esslingen am Neckar',
    'Ludwigsburg', 'Tübingen', 'Konstanz', 'Baden-Baden', 'Offenburg',
  ],
  'Bayern': [
    'München', 'Nürnberg', 'Augsburg', 'Regensburg', 'Würzburg', 'Ingolstadt',
    'Fürth', 'Erlangen', 'Bayreuth', 'Bamberg', 'Landshut', 'Rosenheim',
    'Aschaffenburg', 'Kempten (Allgäu)', 'Passau',
  ],
  'Berlin': [
    'Berlin',
  ],
  'Brandenburg': [
    'Potsdam', 'Cottbus', 'Brandenburg an der Havel', 'Frankfurt (Oder)',
    'Oranienburg', 'Falkensee', 'Eberswalde', 'Bernau bei Berlin', 'Fürstenwalde/Spree',
  ],
  'Bremen': [
    'Bremen', 'Bremerhaven',
  ],
  'Hamburg': [
    'Hamburg',
  ],
  'Hessen': [
    'Frankfurt am Main', 'Wiesbaden', 'Kassel', 'Darmstadt', 'Offenbach am Main',
    'Hanau', 'Gießen', 'Marburg', 'Fulda', 'Rüsselsheim am Main', 'Wetzlar',
  ],
  'Mecklenburg-Vorpommern': [
    'Rostock', 'Schwerin', 'Neubrandenburg', 'Stralsund', 'Greifswald',
    'Wismar', 'Güstrow', 'Waren (Müritz)',
  ],
  'Niedersachsen': [
    'Hannover', 'Braunschweig', 'Oldenburg', 'Osnabrück', 'Wolfsburg',
    'Göttingen', 'Salzgitter', 'Hildesheim', 'Delmenhorst', 'Wilhelmshaven',
    'Lüneburg', 'Celle', 'Emden',
  ],
  'Nordrhein-Westfalen': [
    'Köln', 'Düsseldorf', 'Dortmund', 'Essen', 'Duisburg', 'Bochum', 'Wuppertal',
    'Bielefeld', 'Bonn', 'Münster', 'Gelsenkirchen', 'Mönchengladbach', 'Aachen',
    'Krefeld', 'Oberhausen', 'Hagen', 'Hamm', 'Leverkusen', 'Paderborn', 'Siegen',
  ],
  'Rheinland-Pfalz': [
    'Mainz', 'Ludwigshafen am Rhein', 'Koblenz', 'Trier', 'Kaiserslautern',
    'Worms', 'Neuwied', 'Neustadt an der Weinstraße', 'Speyer', 'Bad Kreuznach',
  ],
  'Saarland': [
    'Saarbrücken', 'Neunkirchen', 'Homburg', 'Völklingen', 'Sankt Ingbert',
    'Saarlouis', 'Merzig', 'Sankt Wendel',
  ],
  'Sachsen': [
    'Leipzig', 'Dresden', 'Chemnitz', 'Zwickau', 'Plauen', 'Görlitz',
    'Freiberg', 'Bautzen', 'Pirna',
  ],
  'Sachsen-Anhalt': [
    'Halle (Saale)', 'Magdeburg', 'Dessau-Roßlau', 'Wittenberg', 'Halberstadt',
    'Stendal', 'Merseburg', 'Naumburg (Saale)',
  ],
  'Schleswig-Holstein': [
    'Kiel', 'Lübeck', 'Flensburg', 'Neumünster', 'Norderstedt', 'Elmshorn',
    'Pinneberg', 'Itzehoe', 'Rendsburg', 'Husum',
  ],
  'Thüringen': [
    'Erfurt', 'Jena', 'Gera', 'Weimar', 'Gotha', 'Nordhausen', 'Eisenach',
    'Suhl', 'Mühlhausen/Thüringen', 'Altenburg',
  ],
};

export const bundeslaender = Object.keys(regions);

import { currentLanguage } from '../i18n/language';

// Traduccion al espanol de los nombres del calendario economico de biquote, que solo existe en ingles (la API no
// acepta idioma). Se traducen los nombres conocidos de alto impacto; uno nuevo se muestra en ingles hasta agregarlo
// aqui. El nombre original queda siempre como tooltip

// Instituciones con su sigla en espanol cuando existe
const INSTITUTIONS: Record<string, string> = {
  ECB: 'BCE',
  Fed: 'Fed',
  FOMC: 'FOMC',
  BoE: 'BoE',
  BoJ: 'BoJ',
  BoC: 'BoC',
  RBA: 'RBA',
  RBNZ: 'RBNZ',
  SNB: 'BNS',
  'Norges Bank': 'Norges Bank',
};

// Nombres sin sufijo de periodo (m/m, q/q, y/y)
const NAMES: Record<string, string> = {
  '10-Year Note Auction': 'Subasta de notas a 10 años',
  '30-Year Bond Auction': 'Subasta de bonos a 30 años',
  'ADP Nonfarm Employment Change': 'Cambio del empleo no agrícola ADP',
  'Average Hourly Earnings': 'Ingresos medios por hora',
  'BoJ L Money Stock': 'Masa monetaria L del BoJ',
  'CB Consumer Confidence Index': 'Confianza del consumidor (Conference Board)',
  CPI: 'IPC',
  'Consumer Price Expectations': 'Expectativas de precios al consumidor',
  'Core CPI': 'IPC subyacente',
  'Core CPI n.s.a.': 'IPC subyacente sin ajuste estacional',
  'Core PCE Price Index': 'Índice de precios PCE subyacente',
  'Core Retail Sales': 'Ventas minoristas subyacentes',
  'Durable Goods Orders': 'Pedidos de bienes duraderos',
  'ECB Deposit Facility Rate Decision': 'Decisión de tipo de la facilidad de depósito del BCE',
  'ECB Monetary Policy Press Conference': 'Rueda de prensa de política monetaria del BCE',
  'EIA Crude Oil Stocks Change': 'Variación de inventarios de crudo (EIA)',
  'EU Leaders Summit': 'Cumbre de líderes de la UE',
  'Existing Home Sales': 'Ventas de viviendas existentes',
  GDP: 'PIB',
  'GDP Sales': 'Ventas finales del PIB',
  'ISM Manufacturing PMI': 'PMI manufacturero ISM',
  'ISM Manufacturing Prices Paid': 'Precios pagados manufactureros ISM',
  'ISM Non-Manufacturing PMI': 'PMI no manufacturero ISM',
  'ISM Non-Manufacturing Prices Paid': 'Precios pagados no manufactureros ISM',
  'Initial Jobless Claims': 'Solicitudes iniciales de subsidio por desempleo',
  'JOLTS Job Openings': 'Ofertas de empleo JOLTS',
  'MNI Chicago Business Barometer': 'Barómetro empresarial de Chicago (MNI)',
  'Manufacturing PMI': 'PMI manufacturero',
  'New Home Sales': 'Ventas de viviendas nuevas',
  'Nonfarm Payrolls': 'Nóminas no agrícolas',
  PPI: 'IPP',
  'Philadelphia Fed Manufacturing Index': 'Índice manufacturero de la Fed de Filadelfia',
  'Retail Sales': 'Ventas minoristas',
  'S&P Global Manufacturing PMI': 'PMI manufacturero S&P Global',
  'S&P Global Services PMI': 'PMI de servicios S&P Global',
  'Tokyo CPI excl. Food and Energy': 'IPC de Tokio sin alimentos ni energía',
  'Unemployment Rate': 'Tasa de desempleo',
};

// Periodo de la variacion: mensual, trimestral (t/t) e interanual (a/a)
const PERIOD_SUFFIX: Record<string, string> = { 'm/m': 'm/m', 'q/q': 't/t', 'y/y': 'a/a' };

// "del BCE", pero "de la Fed"
function ofInstitution(institution: string): string {
  return institution === 'Fed' ? 'de la Fed' : `del ${institution}`;
}

const PATTERNS: { pattern: RegExp; translate: (institution: string, rest: string) => string }[] = [
  // "BoE Governor Bailey Speech", "ECB President Lagarde Speech": el cargo no se traduce para no asumir genero
  { pattern: /^(.+?) (?:Governor|President|Chair|Chairman) (.+) Speech$/, translate: (inst, who) => `Discurso de ${who} (${inst})` },
  { pattern: /^(.+?) Interest Rate Decision$/, translate: (inst) => `Decisión de tipos de interés ${ofInstitution(inst)}` },
  { pattern: /^(.+?) (?:Press|News) Conference$/, translate: (inst) => `Rueda de prensa ${ofInstitution(inst)}` },
];

export function translateEventName(name: string): string {
  // En ingles se muestra el nombre original de biquote
  if (currentLanguage() === 'en') return name;
  const suffixMatch = /\s+(m\/m|q\/q|y\/y)$/.exec(name);
  const base = suffixMatch ? name.slice(0, suffixMatch.index) : name;
  const suffix = suffixMatch?.[1] ? ` ${PERIOD_SUFFIX[suffixMatch[1]] ?? suffixMatch[1]}` : '';

  const known = NAMES[base];
  if (known) return known + suffix;

  for (const { pattern, translate } of PATTERNS) {
    const match = pattern.exec(base);
    const institution = match?.[1];
    if (!match || !institution || !(institution in INSTITUTIONS)) continue;
    return translate(INSTITUTIONS[institution] ?? institution, match[2] ?? '') + suffix;
  }

  return name;
}

/**
 * Black Hills regional business catalog contract.
 * This module contains NO live businesses, API credentials or paid service calls.
 * Overture Places imports will be performed by an audited, offline/periodic
 * pipeline; an eventual map layer will read a vetted and attributed extract.
 */
export const BLACK_HILLS_BUSINESS_REGION = Object.freeze({
  name: 'Rapid City and Black Hills region',
  // Broad research envelope including Belle Fourche, Spearfish, Sturgis,
  // Rapid City, Hill City, Custer, Hot Springs and Sundance (WY).
  south: 43.25, west: -105.05, north: 45.0, east: -102.65,
});

export const BUSINESS_CATEGORIES = Object.freeze([
  'contractors-trades', 'healthcare-care', 'retail-shopping',
  'food-drink', 'lodging-hospitality', 'automotive-equipment',
  'professional-services', 'recreation-tourism', 'government-community',
  'education', 'manufacturing-industrial', 'agriculture-ranching',
  'personal-services', 'other',
]);

const CATEGORY_SET = new Set(BUSINESS_CATEGORIES);
const CLASSIFICATION_RULES = Object.freeze([
  { category: 'contractors-trades', match: /hvac|heating|air.condition|electrician|electrical|plumb|roof|general.contract|construction|excavat|concrete|landscap|handyman|carpenter|insulation|welding|contractor/i },
  { category: 'healthcare-care', match: /hospital|doctor|clinic|dentist|medical|physical.therap|pharmacy|home.health|caregiv|optometri|chiropract/i },
  { category: 'food-drink', match: /restaurant|cafe|coffee|bakery|diner|fast.food|bar|brewery/i },
  { category: 'lodging-hospitality', match: /hotel|motel|campground|lodging|resort|bed.and.breakfast|vacation.rental/i },
  { category: 'automotive-equipment', match: /automotive|car.repair|tire|dealership|equipment.rental|auto.parts|mechanic/i },
  { category: 'professional-services', match: /accountan|attorney|lawyer|insurance|real.estate|architect|engineering|consult/i },
  { category: 'recreation-tourism', match: /museum|tourist|attraction|outdoor|recreation|tour.operator|trail|adventure/i },
  { category: 'government-community', match: /government|library|police|fire.station|community.center|post.office/i },
  { category: 'education', match: /school|college|university|education|training.center/i },
  { category: 'manufacturing-industrial', match: /manufactur|factory|industrial|warehouse/i },
  { category: 'agriculture-ranching', match: /farm|ranch|agricultur|feed.store/i },
  { category: 'personal-services', match: /salon|barber|spa|laundry|fitness|gym/i },
  { category: 'retail-shopping', match: /retail|store|shop|market|grocer|hardware|florist/i },
]);

export function categorizeBusiness(categories = []) {
  const values = Array.isArray(categories) ? categories : [];
  const text = values
    .map((value) => typeof value === 'string' ? value : value?.primary || value?.alternate || '')
    .filter(Boolean)
    .join(' ');
  return CLASSIFICATION_RULES.find(({ match }) => match.test(text))?.category || 'other';
}

export function withinBlackHillsRegion(lat, lon, bounds = BLACK_HILLS_BUSINESS_REGION) {
  return Number.isFinite(lat) && Number.isFinite(lon)
    && lat >= bounds.south && lat <= bounds.north
    && lon >= bounds.west && lon <= bounds.east;
}

function safeText(value, max = 160) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

/**
 * Strictly reduce a source place into displayable, source-attributed metadata.
 * No invented license status, ratings, opening hours or inferred geocoding.
 * A record's source identity is kept to aid deduplication and provenance.
 */
export function normalizeBusinessPlace(place, source = 'overture') {
  if (!place || !['overture', 'openstreetmap'].includes(source)) return null;
  const [lon, lat] = place.geometry?.coordinates || [];
  if (place.geometry?.type !== 'Point' || !withinBlackHillsRegion(lat, lon)) return null;
  const rawId = String(place.id ?? '');
  if (!/^[A-Za-z0-9_:-]{1,160}$/.test(rawId)) return null;
  const names = place.names;
  const name = safeText(typeof names?.primary === 'string' ? names.primary : place.name);
  if (!name) return null;
  const sourceCategories = Array.isArray(place.categories)
    ? place.categories
    : [place.categories?.primary, ...(Array.isArray(place.categories?.alternate) ? place.categories.alternate : [])].filter(Boolean);
  const category = categorizeBusiness(sourceCategories);
  if (!CATEGORY_SET.has(category)) return null;
  return {
    id: `${source}:${rawId}`,
    name, lat, lon, category,
    originalCategories: Array.isArray(sourceCategories)
      ? sourceCategories.filter((x) => typeof x === 'string').slice(0, 10)
      : [],
    source,
    // A business appearing in a public places dataset is NOT proof it is open,
    // verified, currently licensed or operating at this address.
    verification: 'unverified',
  };
}

export function businessViewportQuery(bounds, { limit = 150, category = 'all' } = {}) {
  if (!bounds || ![bounds.south, bounds.north, bounds.west, bounds.east].every(Number.isFinite)
    || bounds.south >= bounds.north || bounds.west >= bounds.east
    || bounds.south < -90 || bounds.north > 90 || bounds.west < -180 || bounds.east > 180) return null;
  if (category !== 'all' && !CATEGORY_SET.has(category)) return null;
  const count = Number.isInteger(limit) ? Math.min(300, Math.max(1, limit)) : 150;
  return { ...bounds, limit: count, category };
}

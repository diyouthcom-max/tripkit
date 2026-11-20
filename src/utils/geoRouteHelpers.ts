import type { AppLanguage, TimelineNode } from '../types';
import { getPrimaryCityName } from './itineraryHelpers';
import { getItineraryUtilsCopy } from '../i18n/packs/itineraryUtilsPack';

export interface GeoCoord {
  lat: number;
  lng: number;
  source: 'live_maps' | 'ai_node' | 'landmark_db' | 'city_fallback';
}

interface GeoAnchorEntry {
  match: RegExp;
  lat: number;
  lng: number;
}

const KNOWN_LANDMARK_COORDS: GeoAnchorEntry[] = [
  // === Paris Landmarks & Stations ===
  { match: /charles de gaulle|roissy|\bcdg\b|戴高乐机场/i, lat: 49.0097, lng: 2.5479 },
  { match: /orly|\bory\b|奥利机场/i, lat: 48.7262, lng: 2.3652 },
  { match: /gare du nord|巴黎北站|18 rue de dunkerque/i, lat: 48.8809, lng: 2.3553 },
  { match: /gare de lyon|巴黎里昂站/i, lat: 48.8443, lng: 2.3744 },
  { match: /louvre|卢浮宫|rue de rivoli/i, lat: 48.8606, lng: 2.3376 },
  { match: /orangerie|橘园/i, lat: 48.8638, lng: 2.3227 },
  { match: /tuileries|杜乐丽|concorde/i, lat: 48.8635, lng: 2.3275 },
  { match: /saint-germain|圣日耳曼|flore|花神|deux magots/i, lat: 48.854, lng: 2.3327 },
  { match: /orsay|奥赛/i, lat: 48.86, lng: 2.3266 },
  { match: /boulangerie utopie|jean-pierre timbaud/i, lat: 48.8658, lng: 2.3694 },
  { match: /sainte-chapelle|圣礼拜堂|boulevard du palais|cité/i, lat: 48.8554, lng: 2.345 },
  { match: /notre[- ]dame|巴黎圣母院/i, lat: 48.853, lng: 2.3499 },
  { match: /enfants rouges|红孩儿市集|rue de bretagne/i, lat: 48.8628, lng: 2.362 },
  { match: /marais|玛黑|archives|vosges|孚日|merci/i, lat: 48.8575, lng: 2.3584 },
  { match: /galeries lafayette|老佛爷|haussmann|opéra|歌剧院/i, lat: 48.8738, lng: 2.332 },
  { match: /vivienne|薇薇安|petits-champs/i, lat: 48.8668, lng: 2.3396 },
  { match: /eiffel|埃菲尔铁塔|gustave eiffel|champ de mars/i, lat: 48.8584, lng: 2.2945 },
  { match: /trocadéro|夏乐宫/i, lat: 48.8616, lng: 2.2893 },
  { match: /bistrot paul bert|paul bert|charonne/i, lat: 48.851, lng: 2.3852 },
  { match: /montmartre|圣心堂|sacré/i, lat: 48.8867, lng: 2.3431 },
  { match: /arc de triomphe|凯旋门|champs-élysées|香榭丽舍/i, lat: 48.8738, lng: 2.295 },
  { match: /versailles|凡尔赛/i, lat: 48.8049, lng: 2.1204 },
  { match: /pompidou|蓬皮杜/i, lat: 48.8606, lng: 2.3522 },

  // === Amsterdam Landmarks & Stations ===
  { match: /schiphol|\bams\b|史基浦|evert van de beekstraat/i, lat: 52.3105, lng: 4.7683 },
  { match: /amsterdam centraal|阿姆斯特丹中央站/i, lat: 52.3791, lng: 4.9003 },
  { match: /herengracht|绅士运河|运河区精品酒店/i, lat: 52.3688, lng: 4.8857 },
  { match: /9 straatjes|九小街|reestraat|jordaan|约旦区/i, lat: 52.3717, lng: 4.8832 },
  { match: /anne frank|安妮之家|huis marseille|keizersgracht/i, lat: 52.3752, lng: 4.884 },
  { match: /winkel 43|noordermarkt/i, lat: 52.3796, lng: 4.8858 },
  { match: /van gogh|梵高博物馆/i, lat: 52.3584, lng: 4.8811 },
  { match: /albert cuyp|de pijp/i, lat: 52.3559, lng: 4.8951 },
  { match: /foodhallen|bellamyplein|oud-west/i, lat: 52.3669, lng: 4.8685 },
  { match: /rijksmuseum|阿姆斯特丹国立博物馆|museumstraat/i, lat: 52.36, lng: 4.8852 },
  { match: /prinsengracht|运河游船|westermarkt/i, lat: 52.3736, lng: 4.8836 },
  { match: /de bijenkorf|女王百货|dam square|水坝广场|\bdam 1\b/i, lat: 52.3731, lng: 4.8936 },
  { match: /vondelpark|冯德尔/i, lat: 52.358, lng: 4.8686 },

  // === Tokyo / Kyoto / Osaka ===
  { match: /haneda|羽田/i, lat: 35.5494, lng: 139.7798 },
  { match: /narita|成田/i, lat: 35.772, lng: 140.3929 },
  { match: /senso-?ji|浅草/i, lat: 35.7148, lng: 139.7967 },
  { match: /skytree|晴空塔/i, lat: 35.7101, lng: 139.8107 },
  { match: /shibuya|涩谷/i, lat: 35.6595, lng: 139.7004 },
  { match: /shinjuku|新宿/i, lat: 35.6938, lng: 139.7034 },
  { match: /meiji|明治神宫|harajuku|原宿/i, lat: 35.6764, lng: 139.6993 },
  { match: /ginza|银座/i, lat: 35.6717, lng: 139.765 },
  { match: /tsukiji|筑地/i, lat: 35.6655, lng: 139.7707 },
  { match: /ueno|上野/i, lat: 35.7141, lng: 139.7741 },
  { match: /tokyo tower|东京塔|roppongi|六本木/i, lat: 35.6586, lng: 139.7454 },
  { match: /tokyo station|东京站/i, lat: 35.6812, lng: 139.7671 },
  { match: /kiyomizu|清水寺/i, lat: 34.9949, lng: 135.785 },
  { match: /fushimi inari|伏见稻荷/i, lat: 34.9671, lng: 135.7727 },
  { match: /arashiyama|岚山/i, lat: 35.0094, lng: 135.6668 },
  { match: /gion|祇园|nishiki|锦市场/i, lat: 35.0037, lng: 135.7755 },
  { match: /kyoto station|京都站/i, lat: 34.9858, lng: 135.7588 },
  { match: /dotonbori|道顿堀|namba|难波|shinsaibashi|心斋桥/i, lat: 34.6687, lng: 135.5013 },
  { match: /osaka castle|大阪城/i, lat: 34.6873, lng: 135.5262 },

  // === Thailand (Chiang Mai / Bangkok) ===
  { match: /chiang mai|清迈|tha phae|塔佩|nimman|宁曼/i, lat: 18.7883, lng: 98.9853 },
  { match: /doi suthep|素贴山/i, lat: 18.8049, lng: 98.9216 },
  { match: /suvarnabhumi|素万那普|bangkok|曼谷|siam|暹罗|grand palace|大皇宫/i, lat: 13.7563, lng: 100.5018 },

  // === Lisbon ===
  { match: /belém|贝伦/i, lat: 38.6916, lng: -9.216 },
  { match: /alfama|阿尔法玛/i, lat: 38.7117, lng: -9.1303 },
  { match: /baixa|rossio|chiado|里斯本/i, lat: 38.7139, lng: -9.1394 },

  // === London / UK ===
  { match: /heathrow|希思罗/i, lat: 51.47, lng: -0.4543 },
  { match: /st pancras|king's cross/i, lat: 51.5315, lng: -0.1261 },
  { match: /british museum|大英博物馆/i, lat: 51.5194, lng: -0.127 },
  { match: /tower of london|伦敦塔|tower bridge/i, lat: 51.5081, lng: -0.0759 },
  { match: /buckingham|westminster|big ben|白金汉|大本钟/i, lat: 51.5014, lng: -0.1419 },
];

const CITY_CENTER_COORDS: Array<{ match: RegExp; lat: number; lng: number }> = [
  { match: /巴黎|paris/i, lat: 48.8566, lng: 2.3522 },
  { match: /阿姆斯特丹|amsterdam/i, lat: 52.3676, lng: 4.9041 },
  { match: /东京|tokyo/i, lat: 35.6762, lng: 139.6503 },
  { match: /京都|kyoto/i, lat: 35.0116, lng: 135.7681 },
  { match: /大阪|osaka/i, lat: 34.6937, lng: 135.5023 },
  { match: /清迈|chiang mai/i, lat: 18.7883, lng: 98.9853 },
  { match: /曼谷|bangkok/i, lat: 13.7563, lng: 100.5018 },
  { match: /里斯本|lisbon/i, lat: 38.7223, lng: -9.1393 },
  { match: /伦敦|london/i, lat: 51.5072, lng: -0.1276 },
  { match: /爱丁堡|edinburgh/i, lat: 55.9533, lng: -3.1883 },
  { match: /罗马|rome/i, lat: 41.9028, lng: 12.4964 },
  { match: /佛罗伦萨|florence/i, lat: 43.7696, lng: 11.2558 },
  { match: /威尼斯|venice/i, lat: 45.4408, lng: 12.3155 },
  { match: /米兰|milan/i, lat: 45.4642, lng: 9.19 },
  { match: /巴塞罗那|barcelona/i, lat: 41.3874, lng: 2.1686 },
  { match: /马德里|madrid/i, lat: 40.4168, lng: -3.7038 },
  { match: /苏黎世|zurich/i, lat: 47.3769, lng: 8.5417 },
  { match: /新加坡|singapore/i, lat: 1.3521, lng: 103.8198 },
  { match: /香港|hong kong/i, lat: 22.3193, lng: 114.1694 },
  { match: /台北|taipei/i, lat: 25.033, lng: 121.5654 },
  { match: /首尔|seoul/i, lat: 37.5665, lng: 126.978 },
  { match: /釜山|busan/i, lat: 35.1796, lng: 129.0756 },
  { match: /纽约|new york/i, lat: 40.7128, lng: -74.006 },
  { match: /旧金山|san francisco/i, lat: 37.7749, lng: -122.4194 },
  { match: /洛杉矶|los angeles/i, lat: 34.0522, lng: -118.2437 },
  { match: /悉尼|sydney/i, lat: -33.8688, lng: 151.2093 },
  { match: /维也纳|vienna/i, lat: 48.2082, lng: 16.3738 },
  { match: /布拉格|prague/i, lat: 50.0755, lng: 14.4378 },
  { match: /冰岛|雷克雅未克|reykjavik/i, lat: 64.1466, lng: -21.9426 },
  { match: /上海|shanghai/i, lat: 31.2304, lng: 121.4737 },
  { match: /北京|beijing/i, lat: 39.9042, lng: 116.4074 },
  { match: /成都|chengdu/i, lat: 30.5728, lng: 104.0668 },
];

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001)
  );
}

function stableHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function resolveNodeGeoCoords(
  node: Pick<TimelineNode, 'title' | 'address' | 'district' | 'city' | 'lat' | 'lng'>,
  cityHint?: string,
  liveCoord?: { lat: number; lng: number } | null
): GeoCoord {
  if (liveCoord && isValidLatLng(liveCoord.lat, liveCoord.lng)) {
    return { lat: liveCoord.lat, lng: liveCoord.lng, source: 'live_maps' };
  }

  if (isValidLatLng(node.lat, node.lng)) {
    return { lat: Number(node.lat), lng: Number(node.lng), source: 'ai_node' };
  }

  const haystack = `${node.title || ''} ${node.address || ''} ${node.district || ''}`;
  for (const entry of KNOWN_LANDMARK_COORDS) {
    if (entry.match.test(haystack)) {
      return { lat: entry.lat, lng: entry.lng, source: 'landmark_db' };
    }
  }

  const cityCandidate =
    getPrimaryCityName(node.city || '') || getPrimaryCityName(cityHint || '') || node.city || cityHint || '';
  const citySearch = `${cityCandidate} ${haystack}`;
  for (const cityEntry of CITY_CENTER_COORDS) {
    if (cityEntry.match.test(citySearch)) {
      // Spread deterministically around city center (~1.1-2.6 km) based on district+title so fallback pins never stack identically
      const h1 = stableHash(`${node.district || ''}|${node.title || ''}`);
      const h2 = stableHash(`${node.address || ''}|${node.title || ''}`);
      const angle = ((h1 % 360) * Math.PI) / 180;
      const radiusDeg = 0.008 + ((h2 % 100) / 100) * 0.018;
      return {
        lat: Number((cityEntry.lat + Math.sin(angle) * radiusDeg * 0.72).toFixed(5)),
        lng: Number((cityEntry.lng + Math.cos(angle) * radiusDeg).toFixed(5)),
        source: 'city_fallback',
      };
    }
  }

  // Generic deterministic fallback centered near Paris/Europe or offset cleanly
  const h = stableHash(`${cityCandidate}|${node.title || ''}`);
  const angle = ((h % 360) * Math.PI) / 180;
  return {
    lat: Number((48.8566 + Math.sin(angle) * 0.015).toFixed(5)),
    lng: Number((2.3522 + Math.cos(angle) * 0.022).toFixed(5)),
    source: 'city_fallback',
  };
}

export function computeGeoDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sLat = Math.sin(dLat / 2);
  const sLng = Math.sin(dLng / 2);
  const h = sLat * sLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sLng * sLng;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function computeGeoBearingDeg(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function formatCompassCardinal(bearingDeg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round((((bearingDeg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx];
}

export interface ProjectedGeoPoint {
  x: number;
  z: number;
  lat: number;
  lng: number;
}

/**
 * Projects a sequence of WGS84 (lat, lng) coordinates into a clean 3D world space (x: East-West, z: North-South, -Z is North)
 * while preserving real geographic turn angles and relative proportions, and nudging nearly overlapping stops slightly apart.
 */
export function projectGeoWaypointsTo3D(
  points: Array<{ lat: number; lng: number }>,
  targetHalfSpan = 9.8
): {
  projected: ProjectedGeoPoint[];
  centerLat: number;
  centerLng: number;
  spanKm: number;
} {
  if (points.length === 0) {
    return { projected: [], centerLat: 0, centerLng: 0, spanKm: 0 };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  const centerLat = (minLat + maxLat) * 0.5;
  const centerLng = (minLng + maxLng) * 0.5;
  const cosLat = Math.max(0.25, Math.cos((centerLat * Math.PI) / 180));

  const rawOffsets = points.map((p) => {
    const eastKm = (p.lng - centerLng) * 111.32 * cosLat;
    const northKm = (p.lat - centerLat) * 110.574;
    return { eastKm, northKm, lat: p.lat, lng: p.lng };
  });

  let maxAbsExtent = 0.001;
  for (const r of rawOffsets) {
    maxAbsExtent = Math.max(maxAbsExtent, Math.abs(r.eastKm), Math.abs(r.northKm));
  }

  const spanKm = computeGeoDistanceKm(
    { lat: minLat, lng: minLng },
    { lat: maxLat, lng: maxLng }
  );

  // If all stops sit within the exact same tiny point, gently arrange in a small compass arc
  if (maxAbsExtent < 0.05 && points.length > 1) {
    return {
      projected: points.map((p, idx) => {
        const ang = (idx / points.length) * Math.PI * 1.4 - Math.PI * 0.7;
        return {
          x: Math.cos(ang) * 4.5,
          z: Math.sin(ang) * 3.8,
          lat: p.lat,
          lng: p.lng,
        };
      }),
      centerLat,
      centerLng,
      spanKm,
    };
  }

  const scale = targetHalfSpan / maxAbsExtent;
  const projected = rawOffsets.map((r) => ({
    x: r.eastKm * scale,
    // North (+northKm) maps to -Z in Three.js standard screen space (top of screen)
    z: -r.northKm * scale,
    lat: r.lat,
    lng: r.lng,
  }));

  // Gentle minimum separation pass so neighboring landmarks remain crisp in 3D without distorting turn geometry
  const minSep = 2.05;
  for (let pass = 0; pass < 3; pass += 1) {
    for (let i = 0; i < projected.length; i += 1) {
      for (let j = i + 1; j < projected.length; j += 1) {
        const dx = projected[j].x - projected[i].x;
        const dz = projected[j].z - projected[i].z;
        const dist = Math.hypot(dx, dz);
        if (dist < minSep) {
          const ux = dist > 0.01 ? dx / dist : Math.cos(j * 1.2);
          const uz = dist > 0.01 ? dz / dist : Math.sin(j * 1.2);
          const push = (minSep - dist) * 0.5;
          projected[i].x -= ux * push;
          projected[i].z -= uz * push;
          projected[j].x += ux * push;
          projected[j].z += uz * push;
        }
      }
    }
  }

  return { projected, centerLat, centerLng, spanKm };
}

export interface GeoRouteSamplePoint {
  lat: number;
  lng: number;
  headingDeg: number;
  legIndex: number;
  legT: number;
}

export interface GeoRouteWaypointInput {
  lat: number;
  lng: number;
}

/**
 * Generates smooth 2D top-down geographic curve samples passing strictly through every
 * real AI coordinate waypoint, blending urban turns cleanly and curving long cross-city hops.
 */
export function buildSmoothGeoRouteSamples(
  waypoints: GeoRouteWaypointInput[],
  samplesPerLeg = 28
): {
  samples: GeoRouteSamplePoint[];
  legDistancesKm: number[];
  totalDistanceKm: number;
  legStartSampleIndices: number[];
} {
  if (waypoints.length === 0) {
    return { samples: [], legDistancesKm: [], totalDistanceKm: 0, legStartSampleIndices: [] };
  }
  if (waypoints.length === 1) {
    return {
      samples: [{ lat: waypoints[0].lat, lng: waypoints[0].lng, headingDeg: 0, legIndex: 0, legT: 0 }],
      legDistancesKm: [],
      totalDistanceKm: 0,
      legStartSampleIndices: [0],
    };
  }

  const samples: GeoRouteSamplePoint[] = [];
  const legDistancesKm: number[] = [];
  const legStartSampleIndices: number[] = [];
  let totalDistanceKm = 0;

  const catmull = (p0: number, p1: number, p2: number, p3: number, t: number): number => {
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      0.5 *
      (2 * p1 +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
    );
  };

  for (let leg = 0; leg < waypoints.length - 1; leg += 1) {
    legStartSampleIndices.push(samples.length);
    const a = waypoints[leg];
    const b = waypoints[leg + 1];
    const pPrev = waypoints[Math.max(0, leg - 1)];
    const pNext = waypoints[Math.min(waypoints.length - 1, leg + 2)];

    const legDist = computeGeoDistanceKm(a, b);
    legDistancesKm.push(legDist);
    totalDistanceKm += legDist;

    const isLongHop = legDist >= 30;
    const dLat = b.lat - a.lat;
    const dLng = b.lng - a.lng;
    const stepCount = isLongHop ? Math.max(samplesPerLeg, 38) : samplesPerLeg;

    for (let s = 0; s < stepCount; s += 1) {
      const t = s / stepCount;
      let lat: number;
      let lng: number;

      if (isLongHop) {
        // Gentle northward geographic arc for intercity flight / high-speed rail corridors
        const curveSign = leg % 2 === 0 ? 1 : -1;
        const arcMag = Math.sin(t * Math.PI) * 0.11 * curveSign;
        lat = a.lat + dLat * t - dLng * arcMag * 0.45;
        lng = a.lng + dLng * t + dLat * arcMag * 0.65;
      } else {
        // Smooth Catmull-Rom through urban waypoints, clamped subtly to prevent overshoot
        const cLat = catmull(pPrev.lat, a.lat, b.lat, pNext.lat, t);
        const cLng = catmull(pPrev.lng, a.lng, b.lng, pNext.lng, t);
        const lLat = a.lat + dLat * t;
        const lLng = a.lng + dLng * t;
        lat = lLat * 0.3 + cLat * 0.7;
        lng = lLng * 0.3 + cLng * 0.7;
      }

      samples.push({
        lat,
        lng,
        headingDeg: 0,
        legIndex: leg,
        legT: t,
      });
    }
  }

  // Final destination sample
  legStartSampleIndices.push(samples.length);
  const last = waypoints[waypoints.length - 1];
  samples.push({
    lat: last.lat,
    lng: last.lng,
    headingDeg: 0,
    legIndex: Math.max(0, waypoints.length - 2),
    legT: 1,
  });

  // Compute smooth compass headings along tangent
  for (let i = 0; i < samples.length; i += 1) {
    const curr = samples[i];
    const next = samples[Math.min(samples.length - 1, i + 1)];
    const prev = samples[Math.max(0, i - 1)];
    const targetA = i < samples.length - 1 ? curr : prev;
    const targetB = i < samples.length - 1 ? next : curr;
    curr.headingDeg =
      computeGeoDistanceKm(targetA, targetB) > 0.0005
        ? computeGeoBearingDeg(targetA, targetB)
        : i > 0
        ? samples[i - 1].headingDeg
        : 0;
  }

  return { samples, legDistancesKm, totalDistanceKm, legStartSampleIndices };
}

export type TransportMode = 'walk' | 'metro' | 'train' | 'boat' | 'car' | 'plane';

/**
 * Infers the realistic transport mode used to reach `target` from `prev`
 * based on AI route notes, stop types, keywords, and cross-city hops.
 */
export function inferSegmentTransportMode(
  target: Pick<TimelineNode, 'title' | 'transitNote' | 'city' | 'stopType'>,
  prev?: Pick<TimelineNode, 'title' | 'transitNote' | 'city' | 'stopType'> | null
): TransportMode {
  const note = (target.transitNote || '').toLowerCase();
  const title = (target.title || '').toLowerCase();
  const combined = `${title} ${note}`;

  const prevCity = prev?.city ? getPrimaryCityName(prev.city) : '';
  const targetCity = target.city ? getPrimaryCityName(target.city) : '';
  const isCrossCity = Boolean(prevCity && targetCity && prevCity !== targetCity);

  if (/游船|渡轮|渡船|游艇|码头登船|canal cruise|boat|ferry|water taxi|gondola|bateau/.test(combined)) {
    return 'boat';
  }

  if (/飞机|航班|直飞|登机|起飞|flight|airline|boarding|takeoff|fly to/.test(combined)) {
    return 'plane';
  }

  if (
    /eurostar|thalys|tgv|shinkansen|新干线|跨国高铁|高铁|火车|机场快线|ns 机场|narita express|skyliner|heathrow express|high-speed rail|intercity/.test(
      combined
    )
  ) {
    return 'train';
  }

  if (
    /地铁|有轨电车|电车|轻轨|山手线|metro|subway|tram|u-bahn|s-bahn|tube|underground|rer\s*[a-e]|jr\s*line|tramway/.test(
      note
    ) ||
    /地铁|有轨电车|电车|rer\s*[a-e]/.test(title)
  ) {
    return 'metro';
  }

  if (/打车|出租车|专车|网约车|接机|接送机|巴士|大巴|自驾|taxi|uber|bolt|grab|lyft|cab|shuttle|bus|car|drive/.test(combined)) {
    return 'car';
  }

  if (/步行|散步|漫步|徒步|走过去|步入|沿.*走|walk|stroll|on foot|footpath/.test(note)) {
    return 'walk';
  }

  if (/机场|airport|schiphol|cdg|narita|haneda|heathrow/.test(title)) {
    return isCrossCity ? 'plane' : 'train';
  }

  if (isCrossCity) {
    const prevCombined = `${prev?.title || ''} ${prev?.transitNote || ''}`.toLowerCase();
    if (/eurostar|高铁|新干线|火车|rail|train|shinkansen|station/.test(prevCombined)) {
      return 'train';
    }
    return 'plane';
  }

  return 'walk';
}

export function getTransportModeLabel(mode: TransportMode, lang: AppLanguage): string {
  return getItineraryUtilsCopy(lang).transportModes[mode];
}

const CITY_IATA_MAP: Array<{ match: RegExp; code: string }> = [
  { match: /巴黎|paris/i, code: 'CDG' },
  { match: /阿姆斯特丹|amsterdam/i, code: 'AMS' },
  { match: /东京|tokyo/i, code: 'HND' },
  { match: /京都|kyoto/i, code: 'KYO' },
  { match: /大阪|osaka/i, code: 'KIX' },
  { match: /伦敦|london/i, code: 'LHR' },
  { match: /爱丁堡|edinburgh/i, code: 'EDI' },
  { match: /罗马|rome/i, code: 'FCO' },
  { match: /米兰|milan/i, code: 'MXP' },
  { match: /巴塞罗那|barcelona/i, code: 'BCN' },
  { match: /马德里|madrid/i, code: 'MAD' },
  { match: /苏黎世|zurich/i, code: 'ZRH' },
  { match: /新加坡|singapore/i, code: 'SIN' },
  { match: /香港|hong kong/i, code: 'HKG' },
  { match: /首尔|seoul/i, code: 'ICN' },
  { match: /曼谷|bangkok/i, code: 'BKK' },
  { match: /纽约|new york/i, code: 'JFK' },
  { match: /旧金山|san francisco/i, code: 'SFO' },
  { match: /洛杉矶|los angeles/i, code: 'LAX' },
  { match: /悉尼|sydney/i, code: 'SYD' },
  { match: /里斯本|lisbon/i, code: 'LIS' },
  { match: /维也纳|vienna/i, code: 'VIE' },
  { match: /布拉格|prague/i, code: 'PRG' },
  { match: /冰岛|雷克雅未克|reykjavik/i, code: 'KEF' },
];

export function resolveCityCode(cityName: string, fallbackIndex = 0): string {
  const clean = cityName.trim();
  for (const entry of CITY_IATA_MAP) {
    if (entry.match.test(clean)) return entry.code;
  }
  const ascii = clean.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (ascii.length >= 3) return ascii.slice(0, 3);
  const codes = ['CTY', 'DST', 'HUB', 'WAY'];
  return codes[fallbackIndex % codes.length];
}


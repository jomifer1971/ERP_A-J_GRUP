/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AntiSpoofResult {
  isSpoofed: boolean;
  score: number; // Suspicion score from 0 to 100
  reasons: string[];
  details: {
    accuracy: number;
    webdriver: boolean;
    ipCountry: string;
    ipCity: string;
    distGpsToIpKm: number;
  };
}

/**
 * Calculates distance between two coordinates in kilometers (Haversine formula)
 */
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Advanced multi-layered check to detect GPS spoofing / mock location bypasses
 */
export async function auditGpsSpoofing(
  latitude: number,
  longitude: number,
  accuracy: number
): Promise<AntiSpoofResult> {
  const reasons: string[] = [];
  let score = 0;

  // 1. WEBDRIVER / AUTOMATION CHECK
  // Many developer spoofers or automated scripts leave navigator.webdriver = true
  if (navigator.webdriver) {
    score += 50;
    reasons.push('Entorno automatizado detectado (WebDriver activo).');
  }

  // 2. SUSPICIOUS ACCURACY FLATS
  // Fake GPS software often provides perfectly static, artificial integers for accuracy (e.g. exactly 10.0 or 1.0 or exactly 0)
  // Genuine mobile satellite GPS always has decimal variation (e.g., 8.3512, 14.124) due to atmospheric/orbital noise.
  if (accuracy === 0) {
    score += 40;
    reasons.push('Precisión GPS reportada es exactamente 0 (indicio de simulación).');
  } else if (Number.isInteger(accuracy) && accuracy < 15) {
    // Exact integers under 15 are extremely suspicious for hardware mobile chips
    score += 15;
    reasons.push('Patrón de precisión sospechosamente exacto sin ruido de satélite.');
  }

  // 3. KNOWN EMULATOR COORDINATES
  // Android Emulator (Googleplex): 37.421998, -122.084
  // iOS Simulator (Apple Park): 37.33182, -122.03118
  // Null Island: 0, 0
  const isGoogleplex = Math.abs(latitude - 37.4219) < 0.01 && Math.abs(longitude - (-122.084)) < 0.01;
  const isApplePark = Math.abs(latitude - 37.3318) < 0.01 && Math.abs(longitude - (-122.0311)) < 0.01;
  const isNullIsland = Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001;

  if (isGoogleplex || isApplePark) {
    score += 90;
    reasons.push('Coordenadas por defecto de Simulador de Desarrollo (Google Mountain View / Apple Cupertino).');
  }
  if (isNullIsland) {
    score += 95;
    reasons.push('Coordenadas nulas exactas (0, 0) - Sensor inactivo o falseado.');
  }

  // 4. NETWORK CO-VALIDATION (Cross check with IP-based Geolocation)
  // We perform an instant, lightweight cross-check with a public IP API.
  // This helps confirm if the physical device IP operates in Spain while the GPS coordinates are artificially located elsewhere.
  let ipCountry = 'Desconocido';
  let ipCity = 'Desconocido';
  let distGpsToIpKm = 0;

  try {
    const aborter = new AbortController();
    const timeoutId = setTimeout(() => aborter.abort(), 2000); // Super fast 2s timeout so we don't slow down the user clock-in

    const res = await fetch('https://ipapi.co/json/', { signal: aborter.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      ipCountry = data.country_name || 'España';
      ipCity = data.city || 'Desconocido';
      
      const ipLat = Number(data.latitude);
      const ipLon = Number(data.longitude);

      if (!isNaN(ipLat) && !isNaN(ipLon)) {
        distGpsToIpKm = getDistanceKm(latitude, longitude, ipLat, ipLon);

        // IP geolocation can be inaccurate, but it's usually within 200-300km of the cell tower in the same country.
        // If the distance mismatch is massive (e.g. > 1100 kilometers) AND the IP country is different, it is highly likely a GPS spoofer.
        if (distGpsToIpKm > 1000) {
          if (data.country && data.country !== 'ES' && latitude > 35 && latitude < 44 && longitude > -10 && longitude < 5) {
            // Worker is in Spain (local GPS), but their network IP is route-proxied through another country (VPN / Proxy spoofing)
            score += 30;
            reasons.push(`Incongruencia de red: IP física en ${ipCountry} (${ipCity}) pero GPS afirma estar en España.`);
          } else if (distGpsToIpKm > 2000) {
            // General extreme distance
            score += 45;
            reasons.push(`Incongruencia geográfica masiva: Desviación de ${Math.round(distGpsToIpKm)}km entre tu IP de red (${ipCity}) y tu GPS.`);
          }
        }
      }
    }
  } catch (err) {
    // If the network request fails because of lack of internet, adblockers, or timeout, we proceed with other client telemetry checks gracefully
    console.log('AntiSpoof: IP cross-check omitido (con conexión offline o bloqueador de huella).');
  }

  // Flag as spoofed if total rating score exceeds 50
  const isSpoofed = score >= 50;

  return {
    isSpoofed,
    score: Math.min(score, 100),
    reasons,
    details: {
      accuracy,
      webdriver: !!navigator.webdriver,
      ipCountry,
      ipCity,
      distGpsToIpKm
    }
  };
}

/**
 * riskEngine.js
 * Edge-based hiking risk assessment module.
 *
 * Runs entirely in the browser (client-side) — no server round-trip needed.
 * This is a transparent, rule-based scoring algorithm. Each parameter
 * contributes an independently documented number of points. The total is
 * clamped to 0–100 and mapped to four named categories.
 *
 * ── Scoring Table ───────────────────────────────────────────────────────────
 *
 *  Parameter        | Condition                       | Points
 * ──────────────────┼─────────────────────────────────┼────────
 *  Temperature      | < 0°C  or  > 38°C               | 25
 *                   | < 5°C  or  > 35°C               | 15
 *                   | < 10°C or  > 32°C               |  8
 *                   | otherwise                        |  0
 * ──────────────────┼─────────────────────────────────┼────────
 *  Wind speed       | > 80 km/h                       | 30
 *                   | > 50 km/h                       | 20
 *                   | > 30 km/h                       | 10
 *                   | > 15 km/h                       |  4
 *                   | otherwise                        |  0
 * ──────────────────┼─────────────────────────────────┼────────
 *  Precipitation    | > 10 mm/h                       | 20
 *                   | >  5 mm/h                       | 14
 *                   | >  1 mm/h                       |  8
 *                   | >  0 mm/h                       |  3
 *                   | 0                                |  0
 * ──────────────────┼─────────────────────────────────┼────────
 *  Humidity         | > 90 %                          | 10
 *                   | > 80 %                          |  6
 *                   | > 70 %                          |  3
 *                   | otherwise                        |  0
 * ──────────────────┼─────────────────────────────────┼────────
 *  Weather code     | Thunderstorm     (WMO 95–99)    | +40 (override)
 *  (WMO code)       | Heavy snow/bliz. (WMO 71–77)    | +20
 *                   | Moderate rain    (WMO 63–67)    | +10
 *                   | otherwise                        |  0
 * ──────────────────┴─────────────────────────────────┴────────
 *
 *  Category thresholds:
 *    LOW       0 – 29
 *    MODERATE  30 – 54
 *    HIGH      55 – 74
 *    VERY HIGH 75 – 100
 *
 * Design notes:
 *  - Missing or invalid readings in any required factor make the assessment
 *    unavailable; they are never silently counted as zero risk.
 *  - Weather code overrides can push a low-looking score into VERY HIGH.
 *    This ensures thunderstorms are never presented as safe simply because
 *    temperature and humidity happen to be comfortable.
 *  - Temperature and heat index are NOT double-counted; only temperature is used.
 */

// ── Risk category definitions ─────────────────────────────────────────────────
const CATEGORIES = {
  LOW:       { label: 'LOW',       color: '#3dd68c', emoji: '🟢', minScore: 0  },
  MODERATE:  { label: 'MODERATE',  color: '#f9e547', emoji: '🟡', minScore: 30 },
  HIGH:      { label: 'HIGH',      color: '#f39c12', emoji: '🟠', minScore: 55 },
  VERY_HIGH: { label: 'VERY HIGH', color: '#e74c3c', emoji: '🔴', minScore: 75 },
};

/**
 * Returns the risk category object for a given numeric score.
 * @param {number} score  - 0–100
 */
function categorise(score) {
  if (score >= 75) return CATEGORIES.VERY_HIGH;
  if (score >= 55) return CATEGORIES.HIGH;
  if (score >= 30) return CATEGORIES.MODERATE;
  return CATEGORIES.LOW;
}

// ── Individual scoring functions ──────────────────────────────────────────────

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function scoreTemperature(temp) {
  if (!isFiniteNumber(temp) || temp < -100 || temp > 100) return { points: 0, available: false, label: 'Temperature' };
  let points = 0;
  if (temp < 0 || temp > 38)   points = 25;
  else if (temp < 5 || temp > 35) points = 15;
  else if (temp < 10 || temp > 32) points = 8;
  return { points, available: true, label: 'Temperature', value: `${temp}°C` };
}

function scoreWind(windSpeed) {
  if (!isFiniteNumber(windSpeed) || windSpeed < 0) return { points: 0, available: false, label: 'Wind Speed' };
  let points = 0;
  if (windSpeed > 80)      points = 30;
  else if (windSpeed > 50) points = 20;
  else if (windSpeed > 30) points = 10;
  else if (windSpeed > 15) points = 4;
  return { points, available: true, label: 'Wind Speed', value: `${windSpeed} km/h` };
}

function scorePrecipitation(precip) {
  if (!isFiniteNumber(precip) || precip < 0) return { points: 0, available: false, label: 'Precipitation' };
  let points = 0;
  if (precip > 10)     points = 20;
  else if (precip > 5) points = 14;
  else if (precip > 1) points = 8;
  else if (precip > 0) points = 3;
  return { points, available: true, label: 'Precipitation', value: `${precip} mm` };
}

function scoreHumidity(humidity) {
  if (!isFiniteNumber(humidity) || humidity < 0 || humidity > 100) return { points: 0, available: false, label: 'Humidity' };
  let points = 0;
  if (humidity > 90)      points = 10;
  else if (humidity > 80) points = 6;
  else if (humidity > 70) points = 3;
  return { points, available: true, label: 'Humidity', value: `${humidity}%` };
}

function scoreWeatherCode(code, description, forecast = []) {
  const forecastCodes = Array.isArray(forecast)
    ? forecast.map((entry) => entry?.weatherCode)
    : [];
  const validCodes = [code, ...forecastCodes]
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 99);
  if (validCodes.length === 0) return { points: 0, available: false, label: 'Weather Condition' };
  const severeCode = validCodes.find((value) => value >= 95);
  const snowCode = validCodes.find((value) => value >= 71 && value <= 77);
  const rainCode = validCodes.find((value) => value >= 63 && value <= 67);
  const riskCode = severeCode ?? snowCode ?? rainCode ?? code;
  let points = 0;
  if (riskCode >= 95)                    points = 40; // Thunderstorm
  else if (riskCode >= 71 && riskCode <= 77) points = 20; // Heavy snow / blizzard
  else if (riskCode >= 63 && riskCode <= 67) points = 10; // Moderate to heavy rain
  const desc = severeCode !== undefined
    ? 'Thunderstorm in current conditions or forecast'
    : riskCode !== code
    ? 'Rain or snow in current conditions or forecast'
    : description || 'Weather condition available';
  return { points, available: true, label: 'Weather Condition', value: desc };
}

// ── Safety recommendations per category ──────────────────────────────────────

function buildRecommendation(category, primaryFactor) {
  const base = {
    LOW:       'Conditions look good. Follow standard trail safety and carry water.',
    MODERATE:  'Exercise caution. Check the trail difficulty and carry extra clothing.',
    HIGH:      'Challenging conditions ahead. Consider postponing or choosing an easier route.',
    VERY_HIGH: 'Dangerous conditions. Do NOT attempt this hike today. Safety first.',
  }[category];

  const specific = {
    'Wind Speed':        ' Secure loose gear and avoid exposed ridges.',
    'Precipitation':     ' Wear waterproof clothing and watch for slippery terrain.',
    'Weather Condition': ' Seek shelter immediately if you see lightning.',
    'Temperature':       ' Layer up and monitor for signs of hypothermia or heat exhaustion.',
    'Humidity':          ' Stay hydrated and take frequent rest breaks.',
  }[primaryFactor] || '';

  return base + specific;
}

// ── Main exported function ────────────────────────────────────────────────────

/**
 * Assesses the hiking risk from a weather data object.
 *
 * @param {Object} weather - The `weather` field from the backend API response.
 *   Expected fields: temperature, humidity, precipitation, windSpeed, weatherCode, weatherDescription
 * @returns {{
 *   available: boolean,
 *   score: number | null,
 *   category: string,
 *   categoryMeta: Object,
 *   primaryFactor: string,
 *   recommendation: string,
 *   breakdown: Array<{ label, points, value, available }>,
 *   dataIssues: string[]
 * }}
 */
export function assessRisk(weather) {
  if (!weather || typeof weather !== 'object') {
    return {
      available: false,
      score: null,
      category: 'INSUFFICIENT DATA',
      categoryMeta: { label: 'INSUFFICIENT DATA', color: '#8a9bb5', emoji: '⚪' },
      primaryFactor: 'Weather data unavailable',
      recommendation: 'Weather data is unavailable. Do not hike without current conditions.',
      breakdown: [],
      dataIssues: ['No weather data was received.'],
    };
  }

  // Score each factor independently
  const factors = [
    scoreTemperature(weather.temperature),
    scoreWind(weather.windSpeed),
    scorePrecipitation(weather.precipitation),
    scoreHumidity(weather.humidity),
    scoreWeatherCode(weather.weatherCode, weather.weatherDescription, weather.forecast),
  ];

  const missingFactors = factors.filter((factor) => !factor.available);
  if (missingFactors.length > 0) {
    return {
      available: false,
      score: null,
      category: 'INSUFFICIENT DATA',
      categoryMeta: { label: 'INSUFFICIENT DATA', color: '#8a9bb5', emoji: '⚪' },
      primaryFactor: 'Required weather data is missing or invalid',
      recommendation: 'Do not rely on a risk estimate until all required weather measurements and a current or forecast weather condition are available.',
      breakdown: factors,
      dataIssues: missingFactors.map((factor) => `${factor.label} is missing or invalid.`),
    };
  }

  // Total score, clamped to 0–100
  const rawScore = factors.reduce((sum, f) => sum + f.points, 0);
  // A thunderstorm in current or forecast conditions must never appear as low risk.
  const thunderstormForecast = factors[4].available && factors[4].points === 40;
  const score = Math.min(100, Math.max(thunderstormForecast ? 55 : 0, rawScore));

  // Primary factor: the one contributing the most points
  const primaryFactorObj = factors.reduce((max, f) => (f.points > max.points ? f : max), factors[0]);
  const primaryFactor = primaryFactorObj.points > 0
    ? primaryFactorObj.label
    : 'No significant weather hazard detected';

  const categoryMeta = categorise(score);
  const category = categoryMeta.label;
  const recommendation = buildRecommendation(category, primaryFactor);

  return {
    available: true,
    score,
    category,
    categoryMeta,
    primaryFactor,
    recommendation,
    breakdown: factors,
    dataIssues: factors[4].available ? [] : ['Weather condition code is unavailable; severe weather could not be assessed.'],
  };
}

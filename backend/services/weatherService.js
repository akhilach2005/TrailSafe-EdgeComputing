/**
 * weatherService.js
 * Responsible for fetching current weather data from Open-Meteo.
 *
 * Open-Meteo is a free, open-source weather API that does NOT require an API key.
 * Docs: https://open-meteo.com/en/docs
 *
 * Part 1 — current weather variables:
 *   - temperature_2m         : Air temperature at 2 m above ground (°C)
 *   - relative_humidity_2m   : Relative humidity at 2 m above ground (%)
 *   - precipitation          : Precipitation sum for the current hour (mm)
 *   - wind_speed_10m         : Wind speed at 10 m above ground (km/h)
 *
 * Part 2 additions:
 *   - weather_code           : WMO weather interpretation code (current)
 *                              Codes 95–99 = thunderstorm (used by risk engine)
 *   - hourly forecast        : temperature_2m, relative_humidity_2m,
 *                              precipitation, wind_speed_10m, weather_code
 *                              for the next FORECAST_HOURS hours.
 */

const axios = require('axios');

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

// How many hours of hourly forecast to return to the frontend.
const FORECAST_HOURS = 6;

/**
 * Maps a WMO weather code to a human-readable description.
 * Subset covering the most relevant codes for hiking risk.
 * Full table: https://open-meteo.com/en/docs#weathervariables
 */
function describeWeatherCode(code) {
  if (code === null || code === undefined) return null;
  if (code === 0)               return 'Clear sky';
  if (code <= 2)                return 'Partly cloudy';
  if (code === 3)               return 'Overcast';
  if (code <= 49)               return 'Fog';
  if (code <= 57)               return 'Drizzle';
  if (code <= 67)               return 'Rain';
  if (code <= 77)               return 'Snow';
  if (code <= 82)               return 'Rain showers';
  if (code <= 86)               return 'Snow showers';
  if (code <= 99)               return 'Thunderstorm';
  return 'Unknown';
}

function getModelWeatherType(code) {
  if (code === null || code === undefined) return null;

  if (code === 0) return 'Sunny';

  if (code >= 1 && code <= 3) return 'Cloudy';

  // Fog is represented as Cloudy because the trained model
  // does not have a separate Fog category.
  if (code >= 45 && code <= 48) return 'Cloudy';

  // Drizzle, rain, showers and thunderstorms are represented as Rainy.
  if (code >= 51 && code <= 67) return 'Rainy';
  if (code >= 80 && code <= 82) return 'Rainy';
  if (code >= 95 && code <= 99) return 'Rainy';

  if (code >= 71 && code <= 77) return 'Snowy';
  if (code >= 85 && code <= 86) return 'Snowy';

  return null;
}

/**
 * Fetches current weather + next FORECAST_HOURS of hourly data
 * for a given latitude/longitude pair.
 *
 * @param {number} latitude   - WGS-84 latitude of the location
 * @param {number} longitude  - WGS-84 longitude of the location
 * @returns {Promise<Object>} - Cleaned weather data object
 * @throws  {Error}           - Propagates network or API errors to the route handler
 */
async function fetchCurrentWeather(latitude, longitude) {
  const params = {
    latitude,
    longitude,
    // Current weather — same 4 fields as Part 1, plus weather_code (Part 2)
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'wind_speed_10m',
      'weather_code',          // Part 2: needed by risk engine
    ].join(','),
    // Hourly forecast — Part 2
    hourly: [
  'temperature_2m',
  'relative_humidity_2m',
  'precipitation',
  'wind_speed_10m',
  'weather_code',
  'uv_index',
  'visibility',
].join(','),
    wind_speed_unit: 'kmh',
    temperature_unit: 'celsius',
    precipitation_unit: 'mm',
    forecast_days: 2,          // Only need today's data
    timezone: 'auto',
  };

  const response = await axios.get(OPEN_METEO_BASE_URL, { params, timeout: 10000 });

  const { current, current_units, hourly, hourly_units } = response.data;

  if (!current) {
    throw new Error('Unexpected response structure from Open-Meteo API.');
  }

  // ── Current weather (Part 1 shape preserved, weather_code added) ───────────
  const currentWeather = {
    temperature: current.temperature_2m ?? null,
    humidity: current.relative_humidity_2m ?? null,
    precipitation: current.precipitation ?? null,
    windSpeed: current.wind_speed_10m ?? null,
    weatherCode: current.weather_code ?? null,                 // Part 2
    weatherDescription: describeWeatherCode(current.weather_code), // Part 2
    units: {
      temperature: current_units?.temperature_2m ?? '°C',
      humidity: current_units?.relative_humidity_2m ?? '%',
      precipitation: current_units?.precipitation ?? 'mm',
      windSpeed: current_units?.wind_speed_10m ?? 'km/h',
    },
    observedAt: current.time ?? null,
    timezone: response.data.timezone ?? null,
  };

  // ── Hourly forecast — next FORECAST_HOURS hours (Part 2) ──────────────────
  let forecast = [];
  if (hourly && Array.isArray(hourly.time)) {
    // Open-Meteo returns local timestamps for the requested timezone. Use its
    // current timestamp instead of comparing those values with UTC browser time.
    const startIdx = current.time
      ? hourly.time.findIndex((time) => time >= current.time)
      : -1;

    if (startIdx >= 0) {
      forecast = hourly.time
        .slice(startIdx, startIdx + FORECAST_HOURS)
        .map((time, i) => {
          const forecastIndex = startIdx + i;
          const weatherCode = hourly.weather_code?.[forecastIndex] ?? null;
          const visibilityMeters = hourly.visibility?.[forecastIndex] ?? null;
          return {
            time,
            temperature: hourly.temperature_2m?.[forecastIndex] ?? null,
            humidity: hourly.relative_humidity_2m?.[forecastIndex] ?? null,
            precipitation: hourly.precipitation?.[forecastIndex] ?? null,
            windSpeed: hourly.wind_speed_10m?.[forecastIndex] ?? null,
            weatherCode,
            weatherDescription: describeWeatherCode(weatherCode),
            weatherType: getModelWeatherType(weatherCode),
            uvIndex: hourly.uv_index?.[forecastIndex] ?? null,
            visibility: visibilityMeters === null ? null : visibilityMeters / 1000,
          };
        });
    }
  }

  return {
    ...currentWeather,
    forecast, // Part 2: array of up to FORECAST_HOURS hourly entries
  };
}

module.exports = { fetchCurrentWeather };

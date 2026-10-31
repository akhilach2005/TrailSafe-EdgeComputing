# TrailSafe

**Edge-Based Hiking Risk Prediction System**

TrailSafe fetches current weather and a short hourly forecast for predefined trekking destinations in India. The browser calculates a transparent, rule-based weather risk estimate and saves the latest successful response per destination for offline fallback. Risk assessment is an informational demonstration, not a substitute for official forecasts or local trail advisories.

## Prerequisites

- Node.js 18 or later
- npm 8 or later
- Internet connection for live weather from Open-Meteo

Check versions with `node -v` and `npm -v`.

## Project structure

```text
trailsafe/
├── backend/
│   ├── config/locations.js
│   ├── routes/weatherRoutes.js
│   ├── services/weatherService.js
│   ├── server.js
│   └── package.json
└── frontend/
    ├── src/components/
    │   ├── CacheBanner.jsx
    │   ├── ForecastStrip.jsx
    │   ├── RiskPanel.jsx
    │   └── WeatherDashboard.jsx
    ├── src/services/
    │   ├── riskEngine.js
    │   ├── weatherApi.js
    │   └── weatherCache.js
    ├── src/App.jsx
    └── package.json
```

## Install and run

Open two terminals from the project directory.

Terminal 1 — backend:

```bash
cd trailsafe\backend
npm install
npm run dev
```

Terminal 2 — frontend:

```bash
cd trailsafe\frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The backend listens at **http://localhost:5000**. No Open-Meteo API key is required. The backend allows the Vite development origin; optionally set `FRONTEND_URL` in the backend environment for a deployed frontend.

## API

- `GET http://localhost:5000/api/health` — backend status.
- `GET http://localhost:5000/api/weather?location=tirumala` — current conditions and up to six hourly forecast entries.

Supported location slugs: `tirumala`, `araku-valley`, `nandi-hills`, `ooty`, and `manali`. Unknown slugs are rejected with HTTP 404. Weather responses include a `location` object, a `weather` object (temperature, humidity, precipitation, wind speed, WMO weather code, units, observation time, and forecast), and a `fetchedAt` timestamp. Weather is supplied by Open-Meteo.

## Local risk assessment

Risk calculation runs in the browser in `frontend/src/services/riskEngine.js`; there is no risk endpoint or machine-learning model. It uses current temperature, relative humidity, precipitation, wind speed, WMO weather code, and the next available forecast entries. A severe weather code in the current conditions or forecast is considered.

| Factor | Rule-based points |
| --- | --- |
| Temperature | < 0°C or > 38°C: 25; < 5°C or > 35°C: 15; < 10°C or > 32°C: 8 |
| Wind | > 80 km/h: 30; > 50: 20; > 30: 10; > 15: 4 |
| Precipitation | > 10 mm: 20; > 5: 14; > 1: 8; > 0: 3 |
| Humidity | > 90%: 10; > 80%: 6; > 70%: 3 |
| Weather code | Thunderstorm (WMO 95–99): 40 and minimum total score 55; heavy snow (71–77): 20; moderate/heavy rain (63–67): 10 |

Points are added and capped at 100. Categories: LOW (0–29), MODERATE (30–54), HIGH (55–74), VERY HIGH (75–100). Temperature is used directly; heat index is not double-counted. All four core numeric values and a valid weather code from current conditions or forecast are required to calculate a score. Missing weather-code data therefore produces an unavailable estimate instead of a potentially misleading LOW category. This score is not a guarantee of safety.

## Cache and offline fallback

After a successful response, the frontend stores the full weather response—including destination coordinates, forecast, and fetch timestamp—in a versioned `localStorage` entry keyed by destination slug. If a fresh request fails, only valid saved data for that same destination is eligible for fallback. The dashboard labels cached results and shows the last-saved time. Data older than six hours is marked stale with a prominent warning. If local storage is unavailable or there is no valid cache, the app reports the request failure and does not invent weather or risk data.

## Verification

No automated test runner is configured in this project. After starting both services:

1. Open the website and analyze each of the five destinations while online.
2. Verify that the dashboard shows all four current weather metrics, an assessment, and available hourly forecast.
3. Request `/api/health` and `/api/weather?location=tirumala`; confirm an unknown slug returns 404.
4. After analyzing a destination successfully, disconnect the network or stop the backend and analyze that same destination. Confirm the cached banner and timestamp appear.
5. While offline, try a destination that has not been cached. Confirm an error appears and no weather or risk result is fabricated.
6. Repeat offline fallback across two previously analyzed destinations and confirm their weather does not mix.
7. Check the responsive layout at desktop and narrow mobile widths.

The risk engine also treats missing or invalid core values or weather codes as insufficient data rather than displaying a LOW score. A thunderstorm code in the current weather or forecast produces at least HIGH risk.


/**
 * weatherApi.js
 * Frontend service for communicating with the TrailSafe backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function fetchWeather(location) {
  let url;

  if (typeof location === 'string') {
    url = `${API_BASE}/api/weather?location=${encodeURIComponent(location)}`;
  } else if (
    location &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  ) {
    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
    });

    url = `${API_BASE}/api/weather?${params.toString()}`;
  } else {
    throw new Error('Invalid weather location provided.');
  }

  let response;

  try {
    response = await fetch(url);
  } catch {
    throw new Error(
      'Could not reach the TrailSafe server. Make sure the backend is running on port 5000.'
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || `Request failed with status ${response.status}`
    );
  }

  return data;
}

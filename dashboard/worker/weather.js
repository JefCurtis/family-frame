// Current conditions + today's high/low from Open-Meteo (free, no API key).
// Vars: WEATHER_LAT, WEATHER_LON, WEATHER_UNIT ("fahrenheit" default, or "celsius").
export async function getWeather(env) {
  if (!env.WEATHER_LAT || !env.WEATHER_LON) return { error: 'Set WEATHER_LAT and WEATHER_LON' };
  const unit = env.WEATHER_UNIT === 'celsius' ? 'celsius' : 'fahrenheit';
  const url = 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
    latitude: env.WEATHER_LAT,
    longitude: env.WEATHER_LON,
    current: 'temperature_2m,apparent_temperature,weather_code,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code,sunrise,sunset',
    temperature_unit: unit,
    timezone: 'auto',
    forecast_days: '5',
  });
  // Cache upstream for 10 minutes so every frame poll doesn't hit Open-Meteo.
  const res = await fetch(url, { cf: { cacheTtl: 600, cacheEverything: true } });
  if (!res.ok) throw new Error('Open-Meteo HTTP ' + res.status);
  return shape(await res.json(), unit);
}

export function shape(w, unit) {
  const c = w.current, d = w.daily;
  return {
    unit: unit === 'celsius' ? 'C' : 'F',
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature),
    code: c.weather_code,
    day: c.is_day === 1,
    days: d.time.map((date, i) => ({
      date,
      hi: Math.round(d.temperature_2m_max[i]),
      lo: Math.round(d.temperature_2m_min[i]),
      rain: d.precipitation_probability_max[i] ?? 0,
      code: d.weather_code[i],
      // Local wall-clock times ("2026-10-12T07:03"); the frame switches light/dark on these.
      sunrise: d.sunrise[i],
      sunset: d.sunset[i],
    })),
    updated: new Date().toISOString(),
  };
}

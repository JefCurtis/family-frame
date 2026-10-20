// Current conditions, hourly outlook, and seven-day forecast from Open-Meteo (free, no API key).
// Vars: WEATHER_LAT, WEATHER_LON, WEATHER_UNIT ("fahrenheit" default, or "celsius").
export async function getWeather(env) {
  if (!env.WEATHER_LAT || !env.WEATHER_LON) return { error: 'Set WEATHER_LAT and WEATHER_LON' };
  const unit = env.WEATHER_UNIT === 'celsius' ? 'celsius' : 'fahrenheit';
  const url = 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
    latitude: env.WEATHER_LAT,
    longitude: env.WEATHER_LON,
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day',
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m,is_day',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code,sunrise,sunset,wind_speed_10m_max,uv_index_max',
    temperature_unit: unit,
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    forecast_days: '7',
  });
  // Cache upstream for 10 minutes so every frame poll doesn't hit Open-Meteo.
  const res = await fetch(url, { cf: { cacheTtl: 600, cacheEverything: true } });
  if (!res.ok) throw new Error('Open-Meteo HTTP ' + res.status);
  return shape(await res.json(), unit);
}

export function shape(w, unit) {
  const c = w.current, d = w.daily, h = w.hourly;
  const firstHour = c.time || h.time[0];
  return {
    unit: unit === 'celsius' ? 'C' : 'F',
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature),
    humidity: Math.round(c.relative_humidity_2m),
    wind: Math.round(c.wind_speed_10m),
    code: c.weather_code,
    day: c.is_day === 1,
    hours: h.time.map((time, i) => ({
      time,
      temp: Math.round(h.temperature_2m[i]),
      feels: Math.round(h.apparent_temperature[i]),
      rain: h.precipitation_probability[i] ?? 0,
      wind: Math.round(h.wind_speed_10m[i]),
      code: h.weather_code[i],
      day: h.is_day[i] === 1,
    })).filter((hour) => hour.time >= firstHour).slice(0, 12),
    days: d.time.map((date, i) => ({
      date,
      hi: Math.round(d.temperature_2m_max[i]),
      lo: Math.round(d.temperature_2m_min[i]),
      rain: d.precipitation_probability_max[i] ?? 0,
      precip: Math.round((d.precipitation_sum[i] ?? 0) * 10) / 10,
      wind: Math.round(d.wind_speed_10m_max[i]),
      uv: Math.round(d.uv_index_max[i] ?? 0),
      code: d.weather_code[i],
      // Local wall-clock times ("2026-10-12T07:03"); the frame switches light/dark on these.
      sunrise: d.sunrise[i],
      sunset: d.sunset[i],
    })),
    updated: new Date().toISOString(),
  };
}

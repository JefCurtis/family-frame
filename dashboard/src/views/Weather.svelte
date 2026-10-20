<script>
  import Icon from '../components/Icon.svelte';
  import { weather, clock } from '../lib/state.svelte.js';
  import { dayKey, dow, time, weatherInfo } from '../lib/format.js';

  let wx = $derived(weather.data);
  let today = $derived(wx?.days?.[0]);
  let current = $derived(wx ? weatherInfo(wx.code, wx.day) : null);
  let hours = $derived(wx?.hours || []);
  let days = $derived(wx?.days || []);
  let todayKey = $derived(dayKey(clock.now));

  function dayLabel(date) {
    return date === todayKey ? 'Today' : dow(date);
  }

  function hourLabel(at, index) {
    return index === 0 ? 'Now' : time(new Date(at));
  }

  function clockLabel(at) {
    return at ? time(new Date(at)) : '—';
  }
</script>

<div class="wrap">
  {#if wx && current}
    <section class="hero sheet">
      <div class="now">
        <div class="summary">
          <span class="weather-icon {current.tint}"><Icon name={current.icon} size={48} /></span>
          <div>
            <p class="eyebrow">Right now</p>
            <p class="condition">{current.label}</p>
          </div>
        </div>
        <div class="reading"><span class="num">{wx.temp}°</span><span class="feels">Feels like {wx.feels}°</span></div>
      </div>

      <div class="facts" aria-label="Current conditions">
        <div><Icon name="droplets" size={22} /><span><b>{wx.humidity}%</b> Humidity</span></div>
        <div><Icon name="wind" size={22} /><span><b>{wx.wind} km/h</b> Wind</span></div>
        <div><Icon name="sunrise" size={22} /><span><b>{clockLabel(today?.sunrise)}</b> Sunrise</span></div>
        <div><Icon name="sunset" size={22} /><span><b>{clockLabel(today?.sunset)}</b> Sunset</span></div>
      </div>
    </section>

    <section class="hourly sheet" aria-label="Next 12 hours">
      <div class="section-title"><h1>Next 12 hours</h1><span>{current.label}</span></div>
      <div class="hour-strip">
        {#each hours as hour, i (hour.time)}
          {@const info = weatherInfo(hour.code, hour.day)}
          <div class="hour">
            <span class="at">{hourLabel(hour.time, i)}</span>
            <span class="weather-icon {info.tint}"><Icon name={info.icon} size={28} /></span>
            <strong class="num">{hour.temp}°</strong>
            {#if hour.rain > 0}<span class="rain"><Icon name="droplets" size={14} />{hour.rain}%</span>{:else}<span class="rain dry">&nbsp;</span>{/if}
          </div>
        {/each}
      </div>
    </section>

    <section class="week" aria-label="Seven day forecast">
      {#each days as day (day.date)}
        {@const info = weatherInfo(day.code)}
        <article class="day sheet" class:today={day.date === todayKey}>
          <h2>{dayLabel(day.date)}</h2>
          <span class="weather-icon {info.tint}"><Icon name={info.icon} size={34} /></span>
          <p class="condition">{info.label}</p>
          <p class="temps num"><strong>{day.hi}°</strong><span>{day.lo}°</span></p>
          <div class="day-facts">
            <span><Icon name="droplets" size={15} />{day.rain}% · {day.precip} mm</span>
            <span><Icon name="wind" size={15} />{day.wind} km/h</span>
            <span>UV {day.uv}</span>
          </div>
        </article>
      {/each}
    </section>
  {:else if weather.error}
    <div class="empty sheet"><h1>Weather is unavailable</h1><p>{weather.error}</p></div>
  {:else}
    <div class="empty sheet"><h1>Loading weather…</h1></div>
  {/if}
</div>

<style>
  .wrap { height: 100%; padding: 6px 28px 28px; display: flex; flex-direction: column; gap: 14px; }
  .hero { flex: none; min-height: 142px; display: flex; align-items: center; justify-content: space-between; gap: 30px; padding: 18px 26px; }
  .now { display: flex; align-items: center; gap: 28px; min-width: 390px; }
  .summary { display: flex; align-items: center; gap: 14px; }
  .weather-icon { display: inline-flex; color: var(--secondary); }
  .weather-icon.sun { color: var(--yellow); }
  .weather-icon.rain { color: var(--blue); }
  .eyebrow, .condition, .reading { margin: 0; }
  .eyebrow { font-size: 17px; font-weight: 600; color: var(--secondary); }
  .condition { font-size: 22px; font-weight: 700; }
  .reading { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; }
  .reading .num { font-size: 64px; font-weight: 300; letter-spacing: -.04em; }
  .feels { margin-top: 6px; font-size: 16px; font-weight: 600; color: var(--secondary); }
  .facts { flex: 1; max-width: 630px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px 28px; }
  .facts div { display: flex; align-items: center; gap: 10px; color: var(--secondary); font-size: 17px; }
  .facts b { margin-right: 4px; color: var(--label); font-weight: 700; }
  .hourly { flex: none; min-height: 142px; padding: 14px 26px 12px; overflow: hidden; }
  .section-title { display: flex; align-items: baseline; gap: 12px; }
  .section-title h1 { margin: 0; font-size: 21px; font-weight: 700; }
  .section-title span { font-size: 16px; color: var(--secondary); }
  .hour-strip { display: grid; grid-template-columns: repeat(12, 1fr); margin-top: 8px; }
  .hour { min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 2px 6px; border-right: 1px solid var(--sep); }
  .hour:last-child { border-right: 0; }
  .hour .at { font-size: 15px; font-weight: 600; color: var(--secondary); }
  .hour strong { font-size: 20px; }
  .rain { min-height: 17px; display: inline-flex; align-items: center; gap: 2px; font-size: 14px; color: var(--blue-text); }
  .rain.dry { color: transparent; }
  .week { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
  .day { min-width: 0; display: flex; flex-direction: column; align-items: center; padding: 14px 10px 12px; text-align: center; }
  .day.today { background: var(--track); }
  .day h2 { margin: 0; font-size: 18px; font-weight: 700; }
  .day > .weather-icon { margin-top: 12px; }
  .day .condition { min-height: 42px; margin-top: 6px; font-size: 16px; line-height: 1.2; }
  .temps { margin: 7px 0 10px; display: flex; align-items: baseline; gap: 8px; }
  .temps strong { font-size: 28px; font-weight: 600; }
  .temps span { font-size: 20px; color: var(--secondary); }
  .day-facts { margin-top: auto; display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 14px; color: var(--secondary); }
  .day-facts span { display: flex; align-items: center; gap: 4px; white-space: nowrap; }
  .empty { margin: auto; padding: 36px 56px; text-align: center; }
  .empty h1 { margin: 0; font-size: 26px; }
  .empty p { margin: 8px 0 0; color: var(--secondary); font-size: 18px; }
</style>

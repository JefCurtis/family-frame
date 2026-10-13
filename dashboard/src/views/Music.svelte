<script>
  import Icon from '../components/Icon.svelte';
  import { ha, haUrl, callService } from '../lib/ha.svelte.js';

  // Music Assistant speakers through Home Assistant: now playing, controls, volume, speaker choice.
  let chosen = $state(localStorage.getItem('frame-music-player'));
  let player = $derived(ha.players.find((p) => p.entity_id === chosen)
    || ha.players.find((p) => p.state === 'playing') || ha.players[0]);
  let playing = $derived(ha.players.find((p) => p.state === 'playing' && p.entity_id !== player?.entity_id));
  let error = $state(null);

  function choose(p) {
    chosen = p.entity_id;
    localStorage.setItem('frame-music-player', p.entity_id);
  }
  async function run(domain, service, data = {}) {
    error = null;
    try { await callService(domain, service, data, { entity_id: player.entity_id }); }
    catch (e) { error = e.message; }
  }

  // Progress: HA reports a position and when it was taken; extrapolate once a second while visible.
  let now = $state(Date.now());
  $effect(() => {
    if (!player || player.state !== 'playing' || player.media_position == null) return; // nothing moving
    const t = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(t);
  });
  let position = $derived(!player || player.media_position == null ? null
    : player.state === 'playing' ? player.media_position + (now - Date.parse(player.media_position_updated_at)) / 1000
    : player.media_position);
  let duration = $derived(player && player.media_duration ? player.media_duration : null);
  const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  // Volume: follow HA unless the slider is being dragged; send at most every 250 ms while dragging.
  let dragging = $state(false);
  let volume = $state(50);
  $effect(() => { if (!dragging && player && player.volume_level != null) volume = Math.round(player.volume_level * 100); });
  let lastSent = 0, timer;
  function onVolume() {
    clearTimeout(timer);
    const sendNow = () => { lastSent = Date.now(); run('media_player', 'volume_set', { volume_level: volume / 100 }); };
    if (Date.now() - lastSent > 250) sendNow(); else timer = setTimeout(sendNow, 250);
  }
</script>

<div class="wrap">
  {#if ha.status === 'off'}
    <div class="sheet empty">Music isn’t set up on this frame yet.</div>
  {:else if ha.status === 'error'}
    <div class="sheet empty">{ha.error}</div>
  {:else if !player}
    <div class="sheet empty">{ha.status === 'connected' ? 'No speakers found in Home Assistant.' : 'Connecting to Home Assistant…'}</div>
  {:else}
    <div class="top">
      <div class="art sheet">
        {#if player.entity_picture}
          <img src={haUrl(player.entity_picture)} alt="" />
        {:else}
          <span class="noart"><Icon name="music" size={96} /></span>
        {/if}
      </div>

      <section class="sheet now">
        <div class="where"><Icon name="speaker" size={20} />{player.label}</div>
        {#if player.media_title}
          <h1>{player.media_title}</h1>
          <p class="artist">{player.media_artist || ''}</p>
          {#if player.media_album_name}<p class="album">{player.media_album_name}</p>{/if}
        {:else}
          <h1 class="idle">{player.state === 'off' ? 'Off' : 'Nothing playing'}</h1>
          {#if playing}<p class="artist">Playing on {playing.label}</p>{/if}
        {/if}

        {#if duration}
          <div class="progress">
            <div class="bar"><span style="transform:scaleX({Math.min(1, (position || 0) / duration)})"></span></div>
            <div class="times num"><span>{mmss(position || 0)}</span><span>-{mmss(Math.max(0, duration - (position || 0)))}</span></div>
          </div>
        {/if}

        <div class="controls">
          <button class="ctl" onclick={() => run('media_player', 'media_previous_track')} aria-label="Previous"><Icon name="skipBack" size={34} /></button>
          <button class="ctl main" onclick={() => run('media_player', 'media_play_pause')} aria-label={player.state === 'playing' ? 'Pause' : 'Play'}>
            <Icon name={player.state === 'playing' ? 'pause' : 'play'} size={40} />
          </button>
          <button class="ctl" onclick={() => run('media_player', 'media_next_track')} aria-label="Next"><Icon name="skipForward" size={34} /></button>
        </div>

        <div class="vol">
          <Icon name="volume" size={24} />
          <input type="range" min="0" max="100" step="1" bind:value={volume}
            onpointerdown={() => (dragging = true)} onpointerup={() => (dragging = false)} onpointercancel={() => (dragging = false)}
            oninput={onVolume} aria-label="Volume" style="--pct:{volume}%" />
          <span class="num">{volume}</span>
        </div>
        {#if error}<p class="err">{error}</p>{/if}
      </section>
    </div>

    <section class="sheet speakers">
      {#each ha.players as p (p.entity_id)}
        <button class="spk" class:on={p.entity_id === player.entity_id} onclick={() => choose(p)}>
          <span class="dot" class:live={p.state === 'playing'}></span>{p.label}
        </button>
      {/each}
      {#if playing && player.state !== 'playing' && player.ma && playing.ma}
        <button class="here" onclick={() => run('music_assistant', 'transfer_queue', { source_player: playing.entity_id })}>Play here</button>
      {/if}
    </section>
  {/if}
</div>

<style>
  .wrap { height: 100%; padding: 10px 28px 28px; display: flex; flex-direction: column; gap: 20px; }
  .empty { margin: auto; padding: 40px 48px; font-size: 22px; color: var(--secondary); }
  /* The art is a square as tall as the space between the tab bar and the speaker row. Sized
     explicitly (not with aspect-ratio) so the first frame after switching tabs is already laid out:
     100vh minus tab bar 86, padding 38, gap 20 and speaker row 80. */
  .top { flex: 1; min-height: 0; display: grid; grid-template-columns: calc(100vh - 224px) 1fr; gap: 20px; }
  .art { width: 100%; height: calc(100vh - 224px); padding: 0; display: grid; place-items: center; background: var(--sheet); }
  .art img { width: 100%; height: 100%; object-fit: cover; }
  .noart { color: var(--tertiary); }
  .now { min-width: 0; display: flex; flex-direction: column; padding: 28px 32px; }
  .where { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 600; color: var(--secondary); }
  h1 { margin: 14px 0 0; font-size: 36px; font-weight: 700; letter-spacing: -.02em; line-height: 1.1;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  h1.idle { color: var(--secondary); }
  .artist { margin: 8px 0 0; font-size: 24px; color: var(--secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .album { margin: 4px 0 0; font-size: 18px; color: var(--secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .progress { margin-top: auto; padding-top: 16px; }
  .bar { height: 6px; border-radius: 3px; background: var(--tertiary); overflow: hidden; }
  .bar span { display: block; height: 100%; background: var(--label); transform-origin: 0 50%; }
  .times { display: flex; justify-content: space-between; margin-top: 6px; font-size: 15px; color: var(--secondary); }
  .controls { display: flex; align-items: center; justify-content: center; gap: 36px; margin-top: 14px; }
  .ctl { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; color: var(--label); }
  .ctl.main { width: 84px; height: 84px; background: var(--label); color: var(--sheet); }
  .ctl:active { opacity: .6; }
  .vol { display: flex; align-items: center; gap: 14px; margin-top: 14px; color: var(--secondary); }
  .vol span { width: 36px; text-align: right; font-size: 17px; }
  input[type='range'] { flex: 1; -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; outline: none;
    background: linear-gradient(90deg, var(--label) var(--pct), var(--tertiary) var(--pct)); }
  input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; width: 30px; height: 30px; border-radius: 50%; background: #fff; border: 1px solid var(--sep); }
  .err { margin: 10px 0 0; font-size: 16px; color: var(--red-text); }
  .speakers { flex: none; display: flex; align-items: center; gap: 10px; padding: 14px 18px; overflow-x: auto; }
  .spk { flex: none; display: flex; align-items: center; gap: 10px; height: 52px; padding: 0 20px; border-radius: 26px; background: var(--track); font-size: 18px; font-weight: 600; }
  .spk.on { background: var(--label); color: var(--sheet); }
  .spk:active { opacity: .7; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--tertiary); }
  .dot.live { background: var(--green, #34c759); }
  .here { flex: none; margin-left: auto; height: 52px; padding: 0 22px; border-radius: 26px; font-size: 18px; font-weight: 600; color: var(--blue-text); }
</style>

<script>
  import Icon from './Icon.svelte';
  import { haUrl, callService } from '../lib/ha.svelte.js';
  import { ui } from '../lib/state.svelte.js';
  let { player } = $props();

  // The card opens the Music tab; the button pauses without leaving Home.
  function toggle(e) {
    e.stopPropagation();
    callService('media_player', 'media_play_pause', {}, { entity_id: player.entity_id }).catch(() => {});
  }
</script>

<div class="np sheet" role="button" tabindex="0" onclick={() => (ui.tab = 'music')} onkeydown={(e) => e.key === 'Enter' && (ui.tab = 'music')}>
  {#if player.entity_picture}<img src={haUrl(player.entity_picture)} alt="" />{:else}<span class="noart"><Icon name="music" size={26} /></span>{/if}
  <div class="txt">
    <div class="title">{player.media_title}</div>
    <div class="sub">{player.media_artist || player.label}</div>
  </div>
  <button class="pp" onclick={toggle} aria-label={player.state === 'playing' ? 'Pause' : 'Play'}>
    <Icon name={player.state === 'playing' ? 'pause' : 'play'} size={22} />
  </button>
</div>

<style>
  .np { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 20px; }
  .np:active { opacity: .8; }
  img, .noart { flex: none; width: 56px; height: 56px; border-radius: 10px; object-fit: cover; background: var(--track); }
  .noart { display: grid; place-items: center; color: var(--secondary); }
  .txt { flex: 1; min-width: 0; }
  .title { font-size: 19px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { margin-top: 2px; font-size: 16px; color: var(--secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pp { flex: none; width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; background: var(--track); color: var(--label); }
  .pp:active { opacity: .6; }
</style>

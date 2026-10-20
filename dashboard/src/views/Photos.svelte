<script>
  import Icon from '../components/Icon.svelte';
  import { photos } from '../lib/state.svelte.js';
  import { withKey } from '../lib/api.js';

  let selected = $state(null);
  let items = $derived(photos.items);
  let index = $derived(selected ? items.findIndex((item) => item.id === selected.id) : -1);
  const src = (item, thumb = false) => withKey('/api/photos/' + item.id + (thumb ? '?thumb=1' : ''));

  function move(by) {
    if (!items.length || index < 0) return;
    selected = items[(index + by + items.length) % items.length];
  }
</script>

<div class="wrap">
  {#if selected}
    <section class="viewer sheet" aria-label="Family photo viewer">
      <button class="close" onclick={() => (selected = null)} aria-label="Back to photos"><Icon name="close" size={28} /></button>
      <div class="full" style={'background-image:url("' + src(selected) + '")'} role="img" aria-label="From the family album"></div>
      <div class="controls">
        <button onclick={() => move(-1)} aria-label="Previous photo"><Icon name="chevronLeft" size={30} /></button>
        <span class="num">{index + 1} of {items.length}</span>
        <button onclick={() => move(1)} aria-label="Next photo"><Icon name="chevronRight" size={30} /></button>
      </div>
    </section>
  {:else if items.length}
    <header class="bar">
      <h1>Family photos <span class="count num">{items.length}</span></h1>
      <p>Newest first</p>
    </header>
    <div class="grid">
      {#each items as item (item.id)}
        <button class="tile" onclick={() => (selected = item)} aria-label="View family photo">
          <img src={src(item, true)} alt="" loading="lazy" decoding="async" />
        </button>
      {/each}
    </div>
  {:else}
    <div class="empty sheet">
      <span class="mark"><Icon name="image" size={34} /></span>
      <h1>Family photos</h1>
      <p>Photos will appear here when the shared album loads.</p>
    </div>
  {/if}
</div>

<style>
  .wrap { height: 100%; padding: 6px 28px 28px; display: flex; flex-direction: column; gap: 14px; }
  .bar { flex: none; display: flex; align-items: baseline; justify-content: space-between; padding: 0 6px; }
  h1 { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -.02em; }
  .count { margin-left: 8px; font-size: 20px; font-weight: 600; color: var(--secondary); letter-spacing: 0; }
  .bar p { margin: 0; font-size: 17px; font-weight: 600; color: var(--secondary); }
  .grid { flex: 1; min-height: 0; display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 180px; gap: 14px; overflow-y: auto; padding-right: 2px; align-content: start; }
  .tile { position: relative; display: block; overflow: hidden; border-radius: 20px; background: var(--track); content-visibility: auto; contain-intrinsic-size: 180px 280px; }
  .tile:active { opacity: .75; }
  .tile img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: cover; }
  .viewer { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; padding: 18px; overflow: hidden; background: #000000; }
  .full { width: 100%; height: 100%; background-repeat: no-repeat; background-position: center center; background-size: contain; }
  .close, .controls button { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 50%; background: var(--track); color: var(--label); }
  .close { position: absolute; z-index: 1; top: 16px; right: 16px; }
  .close:active, .controls button:active { opacity: .65; }
  .controls { position: absolute; z-index: 1; left: 50%; bottom: 16px; display: flex; align-items: center; gap: 14px; transform: translateX(-50%); }
  .controls span { min-width: 86px; padding: 0 12px; font-size: 17px; font-weight: 600; text-align: center; }
  .empty { margin: auto; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px 56px; text-align: center; }
  .empty h1 { margin-top: 8px; font-size: 26px; }
  .empty p { max-width: 340px; margin: 0; font-size: 18px; color: var(--secondary); }
  .mark { display: grid; width: 62px; height: 62px; place-items: center; border-radius: 50%; color: var(--secondary); background: var(--track); }
</style>

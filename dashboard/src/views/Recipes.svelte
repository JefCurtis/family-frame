<script module>
  // TheMealDB categories in a deliberate order: weeknight proteins, then meal types, dessert last.
  // Left out: Vegetarian and Vegan (not wanted here) and Goat (2 recipes). Miscellaneous reads as Other.
  const CATS = [
    ['Chicken'], ['Beef'], ['Pork'], ['Seafood'], ['Pasta'], ['Lamb'], ['Breakfast'], ['Starter'], ['Side'], ['Dessert'], ['Miscellaneous', 'Other'],
  ];
  // Category lists already fetched this session (the HTTP cache also keeps them for a day).
  const lists = new Map();

  // Fade a photo in once it has loaded, including one that was already cached.
  function fade(img) {
    const show = () => img.classList.add('in');
    if (img.complete && img.naturalWidth) show();
    else img.addEventListener('load', show, { once: true });
  }
</script>

<script>
  import Icon from '../components/Icon.svelte';
  import RecipePage from './RecipePage.svelte';
  import { api, cached, remember, withKey } from '../lib/api.js';
  import { recipeTitle } from '../lib/format.js';
  import { recipes, loadRecipes } from '../lib/state.svelte.js';

  // Explore (TheMealDB) and Saved (agents or Save on the frame). Tapping a card opens its page
  // over the grid, so going back keeps the scroll position and doesn't rebuild the cards.
  const startSaved = localStorage.getItem('frame-recipes-mode') === 'saved';
  let mode = $state(startSaved ? 'saved' : 'explore');
  // Each pane is built the first time it's shown and then kept; switching only hides one (no
  // rebuilding cards or re-decoding photos).
  let savedSeen = $state(startSaved);
  let exploreSeen = $state(!startSaved);
  function setMode(m) {
    mode = m;
    localStorage.setItem('frame-recipes-mode', m);
    if (m === 'saved') { savedSeen = true; loadRecipes(); }
    if (m === 'explore' && !exploreSeen) { exploreSeen = true; loadCat(cat); }
  }

  const last = cached('recipes-cards'); // { cat, cards }: the last category shows instantly on boot
  const first = CATS.some(([id]) => id === last?.cat) ? last.cat : 'Chicken';
  let cat = $state(first);
  let cards = $state(lists.get(first) || last?.cards || null);
  let error = $state(null);
  let open = $state(null);
  let grid = $state();

  async function loadCat(c) {
    const same = c === cat;
    if (!same && grid) grid.scrollTop = 0;
    cat = c; error = null;
    cards = lists.get(c) || (same ? cards : null);
    if (lists.has(c)) return;
    try {
      const list = (await api('/api/recipes/explore?c=' + encodeURIComponent(c))).recipes;
      lists.set(c, list);
      remember('recipes-cards', { cat: c, cards: list });
      if (cat === c) cards = list;
    } catch (e) { if (cat === c) error = e.message; }
  }

  // Open straight away with what the card knows (its photo is already loaded), then fill in.
  async function openRecipe(card, path) {
    open = { id: card?.id, title: card?.title || '', image: card?.thumb || null, ingredients: [], steps: [], loading: true };
    const want = open;
    try {
      const full = (await api('/api/recipes/explore?' + path)).recipe;
      if (open === want) open = full;
    } catch (e) { if (open === want) open = { ...want, loading: false, error: e.message }; }
  }

  if (!startSaved) loadCat(first);
  loadRecipes();

  const savedThumb = (r) => (r.hasImage ? withKey('/api/recipes/' + r.id + '/image') : null);
</script>

<div class="wrap">
  <div class="list" class:hidden={open}>
    <header class="bar">
      <div class="seg" role="tablist" aria-label="Recipes">
        <button role="tab" aria-selected={mode === 'explore'} class:on={mode === 'explore'} onclick={() => setMode('explore')}>Explore</button>
        <button role="tab" aria-selected={mode === 'saved'} class:on={mode === 'saved'} onclick={() => setMode('saved')}>Saved{#if recipes.saved?.length}<span class="n num">{recipes.saved.length}</span>{/if}</button>
      </div>
      {#if mode === 'explore'}
        <button class="btn tint" onclick={() => openRecipe(null, 'random=1')}><Icon name="shuffle" size={20} />Surprise me</button>
      {/if}
    </header>

    <div class="panes">
      {#if exploreSeen}
      <div class="pane" class:off={mode !== 'explore'}>
        <div class="chips">
          {#each CATS as [id, label] (id)}
            <button class="chip" class:on={id === cat} onclick={() => loadCat(id)}>{label || id}</button>
          {/each}
        </div>
        <div class="grid" bind:this={grid}>
          {#if error}
            <p class="note">Couldn’t load recipes. <button class="retry" onclick={() => loadCat(cat)}>Try again</button></p>
          {:else if !cards}
            {#each Array(10) as _, i (i)}<div class="card sheet ghost"></div>{/each}
          {:else}
            {#each cards as r (r.id)}
              <button class="card sheet" onclick={() => openRecipe(r, 'id=' + encodeURIComponent(r.id))}>
                <span class="ph"><img src={r.thumb} alt="" loading="lazy" decoding="async" use:fade /></span>
                <span class="label"><span class="title">{recipeTitle(r.title)}</span></span>
              </button>
            {/each}
          {/if}
        </div>
      </div>
      {/if}

      {#if savedSeen}
        <div class="pane" class:off={mode !== 'saved'}>
          {#if recipes.saved && !recipes.saved.length}
            <div class="sheet empty">
              <span class="empty-icon"><Icon name="bookmark" size={30} /></span>
              <h2>No saved recipes yet</h2>
              <p>Tap Save on a recipe in Explore, or ask an agent to save one from a link.</p>
              <button class="btn tint" onclick={() => setMode('explore')}>Explore recipes</button>
            </div>
          {:else}
            <div class="grid">
              {#each recipes.saved || [] as r (r.id)}
                <button class="card sheet" class:bare={!savedThumb(r)} onclick={() => (open = r)}>
                  <span class="ph">
                    {#if savedThumb(r)}<img src={savedThumb(r)} alt="" loading="lazy" decoding="async" use:fade />{:else}<span class="noimg"><Icon name="utensils" size={36} /></span>{/if}
                  </span>
                  <span class="label">
                    <span class="title">{recipeTitle(r.title)}</span>
                    {#if r.from || r.category}<span class="sub">{[r.category, r.from && 'from ' + r.from].filter(Boolean).join(' · ')}</span>{/if}
                  </span>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  {#if open}
    <div class="detail"><RecipePage recipe={open} onback={() => (open = null)} /></div>
  {/if}
</div>

<style>
  .wrap { position: relative; height: 100%; }
  .list, .detail { position: absolute; inset: 0; padding: 6px 28px 28px; display: flex; flex-direction: column; gap: 14px; }
  /* Hidden, not removed, while a recipe is open: keeps its layout and scroll position. */
  .list.hidden, .pane.off { visibility: hidden; }
  .panes { position: relative; flex: 1; min-height: 0; }
  .pane { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 14px; }
  .bar { flex: none; display: flex; align-items: center; justify-content: space-between; min-height: 56px; padding: 0 6px; }
  .seg { display: flex; padding: 3px; border-radius: 14px; background: var(--track); }
  .seg button { display: flex; align-items: center; gap: 8px; min-width: 130px; justify-content: center; height: 44px; padding: 0 18px; border-radius: 11px; font-size: 18px; font-weight: 500; }
  .seg button.on { background: var(--thumb); font-weight: 600; }
  .seg .n { font-size: 15px; color: var(--secondary); }
  .btn { display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 20px; border-radius: 24px; font-size: 18px; font-weight: 600; color: var(--blue-text); }
  .btn.tint { background: var(--track); }
  .btn:active { opacity: .7; }
  /* All categories on one row, stretched to the grid's width. */
  .chips { flex: none; display: flex; gap: 6px; }
  .chip { flex: 1 0 auto; height: 40px; padding: 0 10px; border-radius: 20px; background: var(--track); font-size: 16px; font-weight: 600; white-space: nowrap; text-align: center; }
  .chip.on { background: var(--label); color: var(--sheet); }
  .chip:not(.on):active { opacity: .6; }
  .note { grid-column: 1 / -1; margin: 0 6px; font-size: 18px; color: var(--secondary); }
  .retry { font-size: 18px; font-weight: 600; color: var(--blue-text); }
  /* Five across: each photo is ~350 device px wide on the frame, TheMealDB's /medium size. */
  .grid { flex: 1; min-height: 0; overflow-y: auto; display: grid; grid-template-columns: repeat(5, 1fr); grid-auto-rows: max-content; gap: 14px; align-content: start; }
  /* Square cards: the photo fills the card and the title sits on a dark fade at the bottom. */
  .card { position: relative; display: block; aspect-ratio: 1; padding: 0; border-radius: 18px; overflow: hidden; text-align: left; background: var(--track); content-visibility: auto; contain-intrinsic-size: auto 234px; }
  .card:active { opacity: .8; }
  .ph { position: absolute; inset: 0; }
  .ph img { display: block; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity .25s; }
  .ph :global(img.in) { opacity: 1; }
  .noimg { height: 100%; display: grid; place-items: center; padding-bottom: 40px; color: var(--tertiary); }
  .label { position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; gap: 2px; padding: 44px 14px 12px; color: #fff; background: linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, .62)); }
  .title { font-size: 16px; font-weight: 500; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .sub { font-size: 13px; opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* No photo: plain text on the grey card. */
  .bare .label { color: var(--label); background: none; }
  .bare .sub { color: var(--secondary); opacity: 1; }
  .empty { margin: auto; display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 36px 56px; text-align: center; border-radius: 26px; max-width: 560px; }
  .empty-icon { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; background: var(--track); color: var(--blue-text); }
  .empty h2 { margin: 8px 0 0; font-size: 26px; font-weight: 700; }
  .empty p { margin: 0 0 10px; font-size: 18px; color: var(--secondary); }
</style>

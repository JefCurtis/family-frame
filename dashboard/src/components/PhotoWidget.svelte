<script>
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { photos } from '../lib/state.svelte.js';
  import { withKey } from '../lib/api.js';

  const CHANGE_MS = 30 * 60 * 1000;
  let photo = $state(null);
  const src = (item) => withKey('/api/photos/' + item.id);

  function choosePhoto() {
    const items = photos.items;
    if (!items.length) return;
    const choices = items.length > 1 && photo ? items.filter((item) => item.id !== photo.id) : items;
    photo = choices[Math.floor(Math.random() * choices.length)];
  }

  $effect(() => {
    if (photos.items.length && !photos.items.some((item) => item.id === photo?.id)) choosePhoto();
  });

  onMount(() => {
    const timer = setInterval(choosePhoto, CHANGE_MS);
    return () => clearInterval(timer);
  });
</script>

{#if photo}
  <button class="photo sheet" onclick={choosePhoto} aria-label="Show another family photo">
    <img src={src(photo)} alt="From the family album" />
  </button>
{:else}
  <section class="photo sheet" aria-label="Family photo">
    <div class="empty">
      <span class="mark"><Icon name="image" size={34} /></span>
      <h2>Family photos</h2>
      <p>Connect an iCloud Shared Album to show photos here.</p>
    </div>
  </section>
{/if}

<style>
  .photo { flex: 1; min-height: 0; margin-top: 24px; overflow: hidden; padding: 0; }
  button.photo { display: block; width: 100%; text-align: left; }
  button.photo:active { opacity: .8; }
  img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 24px; text-align: center; }
  .mark { display: grid; width: 62px; height: 62px; place-items: center; border-radius: 50%; color: var(--secondary); background: var(--track); }
  h2 { margin: 8px 0 0; font-size: 22px; font-weight: 700; }
  p { max-width: 270px; margin: 0; font-size: 17px; line-height: 1.3; color: var(--secondary); }
</style>

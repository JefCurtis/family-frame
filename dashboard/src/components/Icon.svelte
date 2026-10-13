<script>
  import { ICONS } from '../lib/icons.js';
  // Lucide icons on a 24px grid, 2px round strokes. ICONS holds constant markup, so {@html} is safe.
  let { name, size = 24 } = $props();
</script>

<svg class="i" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html ICONS[name] || ''}</svg>

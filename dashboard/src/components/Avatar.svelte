<script>
  // Initials badge for a Todoist assignee, coloured consistently per person.
  let { id, name, size = 30 } = $props();
  const COLORS = ['#ff9500', '#007aff', '#af52de', '#34c759', '#ff2d55', '#5ac8fa', '#ff3b30'];
  let initials = $derived(name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?');
  let color = $derived(COLORS[[...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length]);
</script>

<span class="av" style="--c:{color};--s:{size}px" title={name} aria-label={'Assigned to ' + name}>{initials}</span>

<style>
  .av { flex: none; width: var(--s); height: var(--s); border-radius: 50%; display: grid; place-items: center;
    background: var(--c); color: #fff; font-size: calc(var(--s) * .42); font-weight: 700; letter-spacing: .02em; }
</style>

<script>
  import Icon from '../components/Icon.svelte';
  import EventRow from '../components/EventRow.svelte';
  import TaskRow from '../components/TaskRow.svelte';
  import NowPlaying from '../components/NowPlaying.svelte';
  import PhotoWidget from '../components/PhotoWidget.svelte';
  import { nowPlaying } from '../lib/ha.svelte.js';
  import { clock, calendar, weather, lists, ui, completeItem, loadCalendar, loadList } from '../lib/state.svelte.js';
  import { clockTime, longDate, eventsOn, addDays, weatherInfo, time, dow } from '../lib/format.js';

  let events = $derived(calendar.data ? calendar.data.events : []);
  let today = $derived(eventsOn(events, clock.now).filter((e) => e.allDay || Date.parse(e.end) > clock.now.getTime()));
  let upcoming = $derived.by(() => {
    const tomorrow = addDays(clock.now, 1).getTime();
    const nextMonday = addDays(clock.now, (8 - clock.now.getDay()) % 7 || 7).getTime();
    return events.filter((e) => {
      const start = e.allDay ? new Date(e.start + 'T00:00').getTime() : Date.parse(e.start);
      return start >= tomorrow && start < nextMonday;
    });
  });
  let todos = $derived(lists.todo.items || []);
  let wx = $derived(weather.data);
  let info = $derived(wx ? weatherInfo(wx.code, wx.day) : null);
  let playing = $derived(nowPlaying({ hold: true, now: clock.now.getTime() }));
  let todoNote = $derived(lists.todo.error && /TODOIST_TOKEN/.test(lists.todo.error) ? 'Todoist isn’t connected yet.' : lists.todo.error);
</script>

<div class="home">
  <section class="now">
    <div class="date">{longDate(clock.now)}</div>
    <div class="clock num">{clockTime(clock.now)}</div>
    {#if playing}<div class="np-slot"><NowPlaying player={playing} /></div>{/if}
    <PhotoWidget />
  </section>

  <section class="middle">
    <section class="sheet cal">
      <div class="scroll">
        <h2>Today</h2>
        {#if !calendar.data && calendar.offline}
          <p class="empty">Couldn’t load the calendar.</p>
        {:else}
          {#each today as e (e.uid + e.start)}
            <EventRow event={e} now={clock.now} />
          {:else}
            <p class="empty">{calendar.data ? 'No more events today' : 'Loading…'}</p>
          {/each}
        {/if}
        <h2 class="later">Upcoming</h2>
        {#each upcoming as e (e.uid + e.start)}
          <EventRow event={e} now={clock.now} showDay />
        {:else}
          <p class="empty">{calendar.data ? 'Nothing else this week' : ''}</p>
        {/each}
      </div>
      <footer>
        {#if !calendar.data && calendar.offline}
          <button class="more" onclick={loadCalendar}>Try again</button>
        {:else}
          <button class="more" onclick={() => (ui.tab = 'calendar')}>Show week</button>
          {#if calendar.offline}<span class="note">Offline · {time(new Date(calendar.data.updated))}</span>{/if}
        {/if}
      </footer>
    </section>

    {#if wx}
      <section class="sheet weather">
        <div class="wx-now">
          <span class="temp num">{wx.temp}°</span>
          <span class="cond">
            <span class="ic {info.tint}"><Icon name={info.icon} size={34} /></span>
            <span>{info.label}</span>
            <span class="hl num">H:{wx.days[0].hi}° L:{wx.days[0].lo}°</span>
          </span>
        </div>
        <div class="days">
          {#each wx.days.slice(1, 5) as d (d.date)}
            {@const di = weatherInfo(d.code)}
            <div class="day">
              <span class="dname">{dow(d.date)}</span>
              <span class="ic {di.tint}"><Icon name={di.icon} size={26} /></span>
              <span class="pop num">{d.rain >= 30 ? d.rain + '%' : ''}</span>
              <span class="num"><b>{d.hi}°</b> {d.lo}°</span>
            </div>
          {/each}
        </div>
      </section>
    {:else if weather.error}
      <section class="sheet weather"><p class="note">Weather isn’t set up yet.</p></section>
    {/if}
  </section>

  <section class="sheet todo" style="--accent:var(--blue)">
    <header>
      <h2>Tasks</h2>
      {#if lists.todo.items}<span class="count num">{todos.length}</span>{/if}
    </header>
    <div class="scroll">
      {#each todos as item (item.id)}
        <TaskRow {item} now={clock.now} ondone={(i) => completeItem('todo', i)}
          person={item.assignee ? lists.todo.people?.[item.assignee] : null}
          section={item.section ? (lists.todo.sections || []).find((x) => x.id === item.section)?.name : null} />
      {:else}
        <p class="empty">{todoNote || (lists.todo.items ? 'All done.' : 'Loading…')}</p>
      {/each}
    </div>
    <footer>
      {#if lists.todo.error && lists.todo.items}
        <span class="note warn">{todoNote.startsWith('Todoist isn') ? 'Not connected' : 'Couldn’t refresh'} · saved list</span>
        <button class="more" onclick={() => loadList('todo')}>Retry</button>
      {:else}
        <button class="more" onclick={() => (ui.tab = 'todo')}>Open list</button>
      {/if}
    </footer>
  </section>
</div>

<style>
  .home { display: grid; grid-template-columns: 412px 1fr 1fr; gap: 20px; height: 100%; padding: 10px 28px 28px; }
  .now, .middle { min-width: 0; min-height: 0; display: flex; flex-direction: column; }
  .date { font-size: 26px; font-weight: 600; color: var(--secondary); padding: 6px 4px 0; }
  .clock { font-size: 156px; font-weight: 600; line-height: 1; letter-spacing: -.04em; margin: 2px 0 0 -4px; }
  .np-slot { margin-top: 18px; }
  .middle { gap: 20px; }
  .cal { flex: 3 1 0; }
  .weather { flex: 2 1 0; min-height: 0; padding: 20px 22px 16px; }
  .wx-now { display: flex; align-items: center; gap: 18px; }
  .temp { font-size: 68px; font-weight: 300; line-height: 1; letter-spacing: -.03em; }
  .cond { display: flex; flex-direction: column; gap: 3px; font-size: 18px; font-weight: 600; }
  .hl { font-weight: 500; color: var(--secondary); }
  .days { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--sep); }
  .day { display: flex; flex-direction: column; align-items: center; gap: 5px; font-size: 16px; color: var(--secondary); }
  .day b { color: var(--label); font-weight: 600; }
  .dname { font-weight: 600; color: var(--label); }
  .pop { height: 15px; font-size: 14px; font-weight: 700; color: var(--blue-text); line-height: 15px; }
  .ic { color: var(--secondary); }
  .ic.sun { color: var(--yellow); }
  .ic.rain { color: var(--blue); }
  .cal, .todo { min-width: 0; min-height: 0; display: flex; flex-direction: column; padding-bottom: 16px; }
  .scroll { flex: 1; min-height: 0; overflow-y: auto; }
  footer { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 10px; border-top: 1px solid var(--sep); }
  h2 { margin: 0 0 4px; font-size: 24px; font-weight: 700; letter-spacing: -.01em; }
  h2.later { margin-top: 20px; color: var(--secondary); }
  .todo header { display: flex; align-items: baseline; justify-content: space-between; }
  .todo h2 { color: var(--blue-text); }
  .count { font-size: 30px; font-weight: 700; }
  .empty { margin: 8px 0 0; font-size: 19px; color: var(--secondary); }
  .note { font-size: 16px; color: var(--secondary); }
  .note.warn { color: var(--red-text); min-width: 0; }
  .more { flex: none; padding: 8px 0 0; font-size: 19px; font-weight: 600; color: var(--blue-text); }
  .more:active { opacity: .5; }
</style>

// Sample data for Demo mode (Settings), so the frame can be shown to people without real
// calendars, tasks or photos. Everything is invented and built relative to today.
import { addDays, dayKey } from './format.js';

export function demoCalendar(now) {
  const at = (days, h, m = 0) => { const d = addDays(now, days); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const date = (days) => dayKey(addDays(now, days));
  const ev = (uid, cal, title, start, end, extra = {}) => ({ uid: 'demo-' + uid, cal, title, start, end, allDay: false, ...extra });
  const allDay = (uid, cal, title, from, days) => ({ uid: 'demo-' + uid, cal, title, start: date(from), end: date(from + days), allDay: true });
  const events = [
    ev('dropoff', 0, 'School drop-off', at(0, 7, 45), at(0, 8, 15)),
    ev('standup', 1, 'Team standup', at(0, 9), at(0, 9, 30)),
    ev('soccer', 0, 'Soccer practice', at(0, 17, 30), at(0, 18, 30), { location: 'Riverside Park, Field 3' }),
    ev('dinner', 1, 'Dinner with the Parkers', at(0, 19), at(0, 21)),
    ev('dentist', 0, 'Dentist: Emma', at(1, 15), at(1, 16)),
    ev('piano', 0, 'Piano lesson', at(1, 16, 30), at(1, 17, 15)),
    ev('bookclub', 1, 'Book club', at(2, 19), at(2, 20, 30), { location: 'Sarah’s house' }),
    allDay('grandma', 0, 'Grandma visiting', 3, 3),
    ev('market', 1, 'Farmers market', at(4, 9), at(4, 11)),
    ev('brunch', 0, 'Family brunch', at(6, 11), at(6, 12, 30)),
    ev('haircut', 1, 'Haircut', at(8, 10), at(8, 10, 45)),
    ev('recital', 0, 'School recital', at(10, 18), at(10, 19, 30)),
    allDay('trip', 1, 'Lake weekend', 12, 2),
  ];
  events.sort((a, b) => (a.allDay ? Date.parse(a.start + 'T00:00') : Date.parse(a.start)) - (b.allDay ? Date.parse(b.start + 'T00:00') : Date.parse(b.start)));
  return { updated: now.toISOString(), calendars: 2, errors: [], events, demo: true };
}

export function demoList(name, now) {
  const due = (days) => dayKey(addDays(now, days));
  if (name === 'todo') {
    return [
      { id: 'd1', content: 'Schedule HVAC service', due: due(-2), section: 'ds2', assignee: 'p1' },
      { id: 'd2', content: 'Return library books', due: due(0), section: 'ds1', assignee: 'p2' },
      { id: 'd3', content: 'Sign field trip form', due: due(1), section: 'ds1', assignee: 'p1' },
      { id: 'd4', content: 'Order birthday gift for Sam', section: 'ds3', assignee: 'p2' },
      { id: 'd5', content: 'Renew car registration', section: 'ds3' },
      { id: 'd6', content: 'Plan weekend dinner' },
    ];
  }
  const aisle = { Bananas: 'gs1', Spinach: 'gs1', Lemons: 'gs1', Milk: 'gs2', Eggs: 'gs2', 'Greek yogurt': 'gs2', Rice: 'gs3', 'Olive oil': 'gs3', 'Coffee beans': 'gs3' };
  const forRecipe = { 'Chicken thighs': 'For: Sheet-pan lemon chicken', Lemons: 'For: Sheet-pan lemon chicken' };
  return ['Milk', 'Eggs', 'Sourdough bread', 'Bananas', 'Coffee beans', 'Chicken thighs', 'Spinach', 'Greek yogurt', 'Rice', 'Olive oil', 'Lemons']
    .map((content, i) => ({ id: 'g' + i, content, ...(aisle[content] ? { section: aisle[content] } : {}), ...(forRecipe[content] ? { note: forRecipe[content] } : {}) }));
}

// Sections and people for the demo Tasks board.
export function demoMeta(name) {
  if (name !== 'todo') {
    return { project: 'Groceries', sections: [{ id: 'gs1', name: 'Produce' }, { id: 'gs2', name: 'Dairy & eggs' }, { id: 'gs3', name: 'Pantry' }], people: {} };
  }
  return {
    project: 'Household',
    sections: [{ id: 'ds1', name: 'This week' }, { id: 'ds2', name: 'Around the house' }, { id: 'ds3', name: 'Errands' }],
    people: { p1: 'Alex Morgan', p2: 'Sam Rivera' },
  };
}

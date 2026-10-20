import test from 'node:test';
import assert from 'node:assert/strict';
import { demoCalendar, demoList, demoMeta, demoPhotos, demoWeather } from '../src/lib/demo.js';

const now = new Date('2026-10-20T12:00:00-07:00');

test('demo mode covers every dashboard data source', () => {
  const calendar = demoCalendar(now);
  const weather = demoWeather(now);
  const photos = demoPhotos();

  assert.ok(calendar.events.length >= 10);
  assert.ok(demoList('groceries', now).length >= 10);
  assert.ok(demoList('todo', now).length >= 6);
  assert.equal(demoMeta('groceries').sections.length, 3);
  assert.equal(demoMeta('todo').sections.length, 3);
  assert.equal(weather.hours.length, 12);
  assert.equal(weather.days.length, 7);
  assert.equal(photos.length, 8);
  assert.ok(photos.every((photo) => photo.src.startsWith('/demo-photos/')));
});

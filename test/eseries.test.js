import { test } from 'node:test';
import assert from 'node:assert/strict';

import { nearestSeries, seriesValues } from '../src/engine/eseries.js';

test('nearest E-series value scales across decades', () => {
  assert.equal(nearestSeries(4780, 'E24'), 4700);
  assert.equal(nearestSeries(4780, 'E12'), 4700);
  assert.equal(nearestSeries(0.0011, 'E24'), 0.0011);
});

test('nearest E-series refuses non-positive values and unknown series', () => {
  assert.ok(Number.isNaN(nearestSeries(0, 'E24')));
  assert.ok(Number.isNaN(nearestSeries(100, 'E48')));
});

test('series values provide selectable E-series values', () => {
  assert.ok(seriesValues('E24').includes(1.2));
  assert.ok(seriesValues('E12').includes(100));
  assert.ok(seriesValues('E24').includes(110));
  assert.deepEqual(seriesValues('E48'), []);
});
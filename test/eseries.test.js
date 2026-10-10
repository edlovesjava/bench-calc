import { test } from 'node:test';
import assert from 'node:assert/strict';

import { nearestSeries, seriesValues, bestPair } from '../src/engine/eseries.js';

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

test('best series pair lands exactly when two parts sum to the target', () => {
  assert.deepEqual(bestPair(6800, 'E12', 'series'), { a: 5600, b: 1200, value: 6800, error: 0 });
  // 2200 + 150 is also exact; the more balanced split wins the tie.
  const { a, b, error } = bestPair(2350, 'E24', 'series');
  assert.deepEqual([a, b, error], [1600, 750, 0]);
});

test('best parallel pair uses parts no smaller than the target', () => {
  const { a, b, error } = bestPair(2350, 'E24', 'parallel');
  assert.deepEqual([a, b, error], [4700, 4700, 0]);
  const near = bestPair(4780, 'E24', 'parallel');
  assert.ok(near.a >= 4780 && near.b >= 4780);
  assert.ok(Math.abs(near.error) < Math.abs((4700 - 4780) / 4780));
});

test('best pair refuses rather than guesses', () => {
  for (const pair of [
    bestPair(0, 'E24', 'series'),
    bestPair(-5, 'E24', 'parallel'),
    bestPair(100, 'E48', 'series'),
    bestPair(100, 'E24', 'bridge'),
  ]) {
    assert.ok(Object.values(pair).every(Number.isNaN));
  }
});

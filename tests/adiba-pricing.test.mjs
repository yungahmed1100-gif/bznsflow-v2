// Adiba never invents a price: only fixed catalog prices and owner-set values price a line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixedPriceMinor, priceReason, priceLines, offerTotal, offerReasons, depositMinor } from '../config/adiba-pricing.js';
import { productionTypeFor } from '../config/media-intake.js';
import { PRODUCTION_TYPES } from '../convex/hasib/mediaDomain.js';

test('only a single fixed catalog price is a price Adiba may promise', () => {
  assert.equal(fixedPriceMinor([{ type: 'fixed', amount: 450 }]), 450000);
  assert.equal(fixedPriceMinor([{ type: 'fixed', amount: 25.5 }]), 25500);
  for (const p of [{ type: 'from', minimum: 60 }, { type: 'range', minimum: 10, maximum: 20 }, { type: 'quote' }, { type: 'free' }, { type: 'recurring', amount: 25 }, { type: 'unavailable' }])
    assert.equal(fixedPriceMinor([p]), null, p.type);
  assert.equal(fixedPriceMinor([{ type: 'fixed', amount: 10 }, { type: 'fixed', amount: 20 }]), null, 'two fixed prices are a choice, not a price');
  assert.equal(fixedPriceMinor([]), null);
  assert.deepEqual([[{ type: 'range' }], [{ type: 'from' }], [{ type: 'quote' }], []].map(priceReason), ['price_range', 'price_from', 'price_quote', 'unpriced_line']);
});

test('lines are priced from owner, settings or fixed catalog values, and the rest stay unpriced', () => {
  const lines = priceLines([
    { name: 'Promo reel 60s', qty: 2, catalogPrices: [{ type: 'fixed', amount: 450 }] },
    { name: 'Extra round', settingsMinor: 25000 },
    { name: 'Drone footage', catalogPrices: [{ type: 'quote' }] },
    { name: 'Custom animation', custom: true, catalogPrices: [{ type: 'fixed', amount: 99 }] },
  ]);
  assert.deepEqual(lines.map(l => [l.priceSource, l.unitPriceMinor, l.reason]), [['catalog_fixed', 450000, undefined], ['settings', 25000, undefined], ['unpriced', undefined, 'price_quote'], ['unpriced', undefined, 'custom_deliverable']]);
  assert.equal(offerTotal(lines), null, 'no total while any line is unpriced');
  assert.equal(offerTotal(priceLines([{ name: 'A', qty: 2, ownerMinor: 1000 }, { name: 'B', settingsMinor: 500 }])), 2500);
});

test('an offer goes to the owner unless every line is fixed and the total is within an auto-quote limit', () => {
  const fixed = priceLines([{ name: 'Reel', catalogPrices: [{ type: 'fixed', amount: 450 }] }]);
  assert.deepEqual(offerReasons(fixed, { limitMinor: 500000 }), [], 'Hasib may quote this himself');
  assert.deepEqual(offerReasons(fixed, { limitMinor: 0 }), ['auto_quote_off']);
  assert.deepEqual(offerReasons(fixed, { limitMinor: 100000 }), ['above_limit']);
  assert.deepEqual(offerReasons(fixed, { limitMinor: 500000, rush: true, discountRequested: true }), ['rush', 'discount_requested']);
  assert.deepEqual(offerReasons(fixed, { limitMinor: 0, extraScope: true }), ['extra_scope'], 'extra scope is the owner’s, whatever the quote limit');
  assert.deepEqual(offerReasons(priceLines([{ name: 'X', catalogPrices: [{ type: 'from', minimum: 1 }] }]), { limitMinor: 500000 }), ['price_from']);
  assert.equal(depositMinor(450000, 20), 90000);
  assert.equal(depositMinor(1000, 150), 1000, 'never above the total');
});

test('Layla’s media need maps to a Hasib production type, or none for editing', () => {
  for (const need of ['photography', 'video', 'audio']) assert.ok(PRODUCTION_TYPES.includes(productionTypeFor(need)), need);
  assert.equal(productionTypeFor('editing'), null);
  assert.equal(productionTypeFor('anything else'), null);
});

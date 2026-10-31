import assert from 'node:assert/strict';
import { prefersDarkTariffText } from './tariff-contrast.ts';
assert.equal(prefersDarkTariffText('#ffffff'), true);
assert.equal(prefersDarkTariffText('#000000'), false);
assert.equal(prefersDarkTariffText('#d4a633'), true);
assert.equal(prefersDarkTariffText('#003366'), false);

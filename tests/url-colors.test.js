import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { applyColorsFromURL } from '../url-colors.js';

function createControls() {
  const classes = new Set(['hidden']);

  return {
    fgText: { value: '#45ad7f' },
    fgPicker: { value: '#45ad7f' },
    bgText: { value: 'hsl(159.43, 33.98%, 20.2%)' },
    bgPicker: { value: '#000000' },
    thirdText: { value: '' },
    thirdPicker: { value: '#663399' },
    enableThird: { checked: false },
    thirdContainer: {
      classList: {
        contains: (name) => classes.has(name),
        remove: (name) => classes.delete(name),
      },
    },
  };
}

function parseHex(value) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) {
    throw new Error(`Invalid color: ${value}`);
  }
  return { hex: value.toUpperCase() };
}

describe('applyColorsFromURL', () => {
  test('URL colors override defaults and enable the third color', () => {
    const controls = createControls();

    applyColorsFromURL({
      search: '?fg=%23232323&bg=%23FF415C&third=%23663399',
      parseColor: parseHex,
      ...controls,
    });

    assert.equal(controls.fgText.value, '#232323');
    assert.equal(controls.fgPicker.value, '#232323');
    assert.equal(controls.bgText.value, '#FF415C');
    assert.equal(controls.bgPicker.value, '#FF415C');
    assert.equal(controls.thirdText.value, '#663399');
    assert.equal(controls.thirdPicker.value, '#663399');
    assert.equal(controls.enableThird.checked, true);
    assert.equal(controls.thirdContainer.classList.contains('hidden'), false);
  });

  test('invalid URL colors leave existing values unchanged', () => {
    const controls = createControls();

    applyColorsFromURL({
      search: '?fg=invalid&bg=%23FF415C&third=invalid',
      parseColor: parseHex,
      ...controls,
    });

    assert.equal(controls.fgText.value, '#45ad7f');
    assert.equal(controls.fgPicker.value, '#45ad7f');
    assert.equal(controls.bgText.value, '#FF415C');
    assert.equal(controls.bgPicker.value, '#FF415C');
    assert.equal(controls.thirdText.value, '');
    assert.equal(controls.thirdPicker.value, '#663399');
    assert.equal(controls.enableThird.checked, false);
    assert.equal(controls.thirdContainer.classList.contains('hidden'), true);
  });

  test('empty or missing URL params leave controls unchanged', () => {
    const controls = createControls();

    applyColorsFromURL({
      search: '?fg=&bg=',
      parseColor: parseHex,
      ...controls,
    });

    assert.equal(controls.fgText.value, '#45ad7f');
    assert.equal(controls.fgPicker.value, '#45ad7f');
    assert.equal(controls.bgText.value, 'hsl(159.43, 33.98%, 20.2%)');
    assert.equal(controls.bgPicker.value, '#000000');
    assert.equal(controls.enableThird.checked, false);
    assert.equal(controls.thirdContainer.classList.contains('hidden'), true);
  });

  test('empty search string leaves controls unchanged', () => {
    const controls = createControls();

    applyColorsFromURL({
      search: '',
      parseColor: parseHex,
      ...controls,
    });

    assert.equal(controls.fgText.value, '#45ad7f');
    assert.equal(controls.bgText.value, 'hsl(159.43, 33.98%, 20.2%)');
    assert.equal(controls.enableThird.checked, false);
  });

  test('partial params only override specified colors', () => {
    const controls = createControls();

    applyColorsFromURL({
      search: '?bg=%23AABBCC',
      parseColor: parseHex,
      ...controls,
    });

    assert.equal(controls.fgText.value, '#45ad7f');
    assert.equal(controls.bgText.value, '#AABBCC');
    assert.equal(controls.bgPicker.value, '#AABBCC');
    assert.equal(controls.thirdText.value, '');
    assert.equal(controls.enableThird.checked, false);
  });
});

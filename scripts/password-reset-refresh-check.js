const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

for (const file of ['app-index.js', 'app-marketplace.js']) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const fn = source.slice(source.indexOf('function openPasswordReset(){'), source.indexOf('async function requestPasswordReset('));
  const elements = Object.fromEntries(['passwordResetRequestForm', 'passwordResetCompleteForm', 'passwordResetRequestError', 'passwordResetCompleteError'].map(id => [id, {}]));
  const location = { href: 'https://example.com/?reset=1&code=test-code&listing=42#browse' };
  const state = { retained: true };
  const context = {
    URL, location,
    document: { getElementById: id => elements[id] },
    history: { state, replaceState(saved, _, url) {
      assert.equal(saved, state);
      location.href = new URL(url, location.href).href;
    } },
    openModal: id => assert.equal(id, 'passwordResetModal')
  };
  vm.createContext(context);
  vm.runInContext(fn, context);
  context.openPasswordReset();
  assert.equal(elements.passwordResetCompleteForm.hidden, false, 'recovery link opens completion form');
  assert.equal(elements.passwordResetRequestForm.hidden, true);
  const refreshed = new URL(location.href);
  assert.equal(refreshed.searchParams.has('reset'), false, 'refresh cannot retrigger the reset prompt');
  assert.equal(refreshed.searchParams.get('code'), 'test-code');
  assert.equal(refreshed.searchParams.get('listing'), '42');
  assert.equal(refreshed.hash, '#browse');
  context.openPasswordReset();
  assert.equal(elements.passwordResetRequestForm.hidden, false, 'forgot password still opens request form');
  assert.equal(elements.passwordResetCompleteForm.hidden, true);
  console.log(`${file}: recovery opens once, refresh stays clear, manual reset works`);
}

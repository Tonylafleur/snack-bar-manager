import test from 'node:test'
import assert from 'node:assert/strict'

test('conversion casier vers unité de base', () => {
  const convert = (quantity, unit, equivalence) => unit === 'package' ? quantity * equivalence : quantity
  assert.equal(convert(2, 'package', 24), 48)
  assert.equal(convert(5, 'base', 24), 5)
})

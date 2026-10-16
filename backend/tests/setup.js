import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

globalThis.describe = describe;
globalThis.it = it;
globalThis.test = it;
globalThis.beforeAll = before;
globalThis.afterAll = after;
globalThis.beforeEach = beforeEach;
globalThis.afterEach = afterEach;

globalThis.expect = function expect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected);
    },
    toBeDefined() {
      assert.notStrictEqual(actual, undefined);
    },
    toBeUndefined() {
      assert.strictEqual(actual, undefined);
    },
    toBeTruthy() {
      assert.ok(actual);
    },
    toBeFalsy() {
      assert.ok(!actual);
    },
    toBeGreaterThanOrEqual(expected) {
      assert.ok(actual >= expected, `Expected ${actual} to be >= ${expected}`);
    },
    toBeGreaterThan(expected) {
      assert.ok(actual > expected, `Expected ${actual} to be > ${expected}`);
    },
    toBeLessThanOrEqual(expected) {
      assert.ok(actual <= expected, `Expected ${actual} to be <= ${expected}`);
    },
    toBeLessThan(expected) {
      assert.ok(actual < expected, `Expected ${actual} to be < ${expected}`);
    },
    toContain(expected) {
      if (typeof actual === 'string') {
        assert.ok(actual.includes(expected), `Expected "${actual}" to contain "${expected}"`);
      } else if (Array.isArray(actual)) {
        assert.ok(actual.includes(expected), `Expected array to contain ${expected}`);
      }
    },
  };
};

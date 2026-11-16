import assert from "node:assert/strict";
import { test } from "node:test";

import { add, clamp, divide, factorial, isPrime, multiply, subtract } from "./index.js";

test("add", () => {
  assert.equal(add(2, 3), 5);
});

test("subtract", () => {
  assert.equal(subtract(2, 3), -1);
});

test("multiply", () => {
  assert.equal(multiply(4, 2.5), 10);
});

test("divide", () => {
  assert.equal(divide(10, 4), 2.5);
  assert.throws(() => divide(1, 0), RangeError);
});

test("factorial", () => {
  assert.equal(factorial(0), 1);
  assert.equal(factorial(5), 120);
  assert.throws(() => factorial(-1), RangeError);
  assert.throws(() => factorial(1.5), RangeError);
});

test("isPrime", () => {
  assert.equal(isPrime(2), true);
  assert.equal(isPrime(97), true);
  assert.equal(isPrime(1), false);
  assert.equal(isPrime(100), false);
});

test("clamp", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(50, 0, 10), 10);
  assert.throws(() => clamp(1, 10, 0), RangeError);
});

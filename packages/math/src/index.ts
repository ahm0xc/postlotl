export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new RangeError("Cannot divide by zero");
  }
  return a / b;
}

export function factorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError("factorial expects a non-negative integer");
  }
  let result = 1;
  for (let i = 2; i <= n; i += 1) {
    result *= i;
  }
  return result;
}

export function isPrime(n: number): boolean {
  if (!Number.isInteger(n) || n < 2) return false;
  for (let i = 2; i * i <= n; i += 1) {
    if (n % i === 0) return false;
  }
  return true;
}

export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError("min must be less than or equal to max");
  }
  return Math.min(Math.max(value, min), max);
}

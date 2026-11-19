Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: () => null,
});

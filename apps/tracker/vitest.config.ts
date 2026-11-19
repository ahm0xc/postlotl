import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        url: "https://shop.com/",
      },
    },
    include: ["src/**/*.test.ts"],
    setupFiles: ["./src/test-setup.ts"],
  },
});

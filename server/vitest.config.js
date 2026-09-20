import { defineConfig } from "vitest/config";
import os from "node:os";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    // Tests share one real MongoDB database, so files must run one after another.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      MONGO_URI: process.env.MONGO_URI_TEST || "mongodb://localhost:27017/blogify_test",
      ACCESS_TOKEN_SECRET: "test-secret-test-secret-test-secret-123",
      BCRYPT_ROUNDS: "4",
      UPLOAD_DIR: path.join(os.tmpdir(), "blogify-test-uploads"),
    },
  },
});

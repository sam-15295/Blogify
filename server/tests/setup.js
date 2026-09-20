import fs from "node:fs";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach } from "vitest";
import { connectDB } from "../src/config/db.js";
import { uploadDir } from "../src/storage/diskStorage.js";

beforeAll(async () => {
  fs.mkdirSync(uploadDir, { recursive: true });
  await connectDB();
  // Make sure indexes (unique email, text search, TTL) exist before the first test runs.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

// Every test starts from an empty database, so tests never depend on each other.
beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

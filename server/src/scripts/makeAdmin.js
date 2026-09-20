// Promotes an existing user to ADMIN. There is deliberately no API endpoint for this:
// roles must never be settable by the people who would benefit from them.
// Usage: npm run make-admin -- user@example.com
import { connectDB, disconnectDB } from "../config/db.js";
import { User } from "../models/user.js";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run make-admin -- <email>");
  process.exit(1);
}

await connectDB();
const user = await User.findOneAndUpdate({ email }, { role: "ADMIN" }, { returnDocument: "after" });
console.log(user ? `${user.email} is now an ADMIN. Log out and back in for it to take effect.` : `No user found with email ${email}`);
await disconnectDB();

process.exit(user ? 0 : 1);

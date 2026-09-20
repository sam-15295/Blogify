// Fills the database with two demo users, a few posts and comments so a fresh install isn't empty.
// Safe to run repeatedly: existing demo users and posts are left alone.
// Usage: npm run seed
import { connectDB, disconnectDB } from "../config/db.js";
import { isProd } from "../config/env.js";
import { Blog } from "../models/blog.js";
import { Comment } from "../models/comment.js";
import { User } from "../models/user.js";

if (isProd && !process.argv.includes("--force")) {
  console.error("Refusing to seed a production database. Pass --force if you really mean it.");
  process.exit(1);
}

const DEMO_PASSWORD = "password123";
const DAY = 24 * 60 * 60 * 1000;

const users = [
  { fullName: "Alice Demo", email: "alice@example.com" },
  { fullName: "Bob Demo", email: "bob@example.com" },
];

const posts = [
  {
    author: 0,
    daysAgo: 6,
    title: "Why short-lived access tokens matter",
    body: "A JWT can't be revoked once it has been issued, so the only real defence against a stolen token is a short lifetime.\n\nThat's why Blogify issues access tokens that last 15 minutes and pairs them with a rotating refresh token stored in an httpOnly cookie. The browser silently swaps an expired token for a new one, and the user never notices.",
  },
  {
    author: 1,
    daysAgo: 5,
    title: "MongoDB indexes in plain English",
    body: "An index is a sorted shortcut the database can walk instead of reading every document.\n\nFor a feed sorted by newest first, an index on createdAt turns a full collection scan into a handful of reads. Use explain() to prove your query really uses it, and remember that every index makes writes a little slower.",
  },
  {
    author: 0,
    daysAgo: 4,
    title: "Five React hooks I use every day",
    body: "useState for local state, useEffect for talking to the outside world, useRef for values that shouldn't trigger a render, useContext for shared data such as the logged-in user, and custom hooks to package repeated logic.\n\nThe best habit is to clean up in useEffect: cancel timers, ignore stale responses and revoke object URLs.",
  },
  {
    author: 1,
    daysAgo: 3,
    title: "Express middleware order is part of your design",
    body: "Middleware runs in the order you register it. Put cheap checks first: rate limiting, then authentication, then body parsing and validation, and only then the handler.\n\nThe error handler goes last, because it can only catch what happens before it.",
  },
  {
    author: 0,
    daysAgo: 2,
    title: "Choosing the right HTTP status code",
    body: "401 means 'I don't know who you are', 403 means 'I know who you are and the answer is no'.\n\nUse 404 for missing resources, 409 for duplicates such as an email that is already registered, and 422 when the request is well-formed but the data is invalid.",
  },
  {
    author: 1,
    daysAgo: 1,
    title: "Small commits tell a story",
    body: "A good commit does one thing and explains why. When a reviewer, or your future self, reads the history, each commit should be a step they can follow.\n\nPrefer 'add validation for blog titles' over 'fixes'.",
  },
];

const comments = [
  { post: 0, author: 1, content: "Rotation is the part people usually skip. Nice explanation." },
  { post: 0, author: 0, content: "Thanks! Next I want to write about reuse detection." },
  { post: 1, author: 0, content: "explain() changed how I write queries. Highly recommended." },
  { post: 4, author: 1, content: "The 401 vs 403 distinction finally clicked for me." },
];

await connectDB();

const savedUsers = [];
for (const data of users) {
  savedUsers.push((await User.findOne({ email: data.email })) ?? (await User.create({ ...data, password: DEMO_PASSWORD })));
}

const savedPosts = [];
for (const data of posts) {
  const createdBy = savedUsers[data.author]._id;
  const existing = await Blog.findOne({ title: data.title, createdBy });
  savedPosts.push(
    existing ?? (await Blog.create({ title: data.title, body: data.body, createdBy, createdAt: new Date(Date.now() - data.daysAgo * DAY) })),
  );
}

for (const data of comments) {
  const blog = savedPosts[data.post]._id;
  const createdBy = savedUsers[data.author]._id;
  if (!(await Comment.exists({ blog, createdBy, content: data.content }))) {
    await Comment.create({ blog, createdBy, content: data.content });
  }
}

console.log(`Seeded ${savedUsers.length} users, ${savedPosts.length} posts and ${comments.length} comments.`);
console.log(`Log in with alice@example.com or bob@example.com, password: ${DEMO_PASSWORD}`);

await disconnectDB();

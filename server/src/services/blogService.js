import { Blog } from "../models/blog.js";
import { Comment } from "../models/comment.js";
import { AppError } from "../utils/AppError.js";
import { assertOwnerOrAdmin } from "../utils/permissions.js";
import { imageStorage } from "../storage/index.js";

const AUTHOR_FIELDS = "fullName";

export async function listBlogs({ page, limit, q }) {
  const filter = q ? { $text: { $search: q } } : {};
  // Relevance ordering for searches, newest-first otherwise. Body is excluded from list payloads.
  const sort = q ? { score: { $meta: "textScore" }, createdAt: -1, _id: -1 } : { createdAt: -1, _id: -1 };
  const projection = q ? { body: 0, __v: 0, score: { $meta: "textScore" } } : { body: 0, __v: 0 };

  const [items, total] = await Promise.all([
    Blog.find(filter, projection)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("createdBy", AUTHOR_FIELDS)
      .lean(),
    Blog.countDocuments(filter),
  ]);

  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getBlog(id) {
  const blog = await Blog.findById(id).populate("createdBy", AUTHOR_FIELDS);
  if (!blog) throw AppError.notFound("Blog not found");
  return blog;
}

export async function createBlog(userId, { title, body }, file) {
  const coverImageURL = file ? await imageStorage.save(file) : undefined;
  try {
    const blog = await Blog.create({ title, body, createdBy: userId, coverImageURL });
    return await blog.populate("createdBy", AUTHOR_FIELDS);
  } catch (err) {
    await imageStorage.remove(coverImageURL); // don't leave an orphaned image behind
    throw err;
  }
}

export async function updateBlog(user, id, changes, file) {
  if (!file && Object.values(changes).every((value) => value === undefined)) {
    throw new AppError(422, "VALIDATION_ERROR", "Provide at least one of: title, body, cover image");
  }

  const blog = await Blog.findById(id);
  if (!blog) throw AppError.notFound("Blog not found");
  assertOwnerOrAdmin(user, blog.createdBy);

  // The new image is stored only after the ownership check, so strangers can't upload anything.
  const previousImage = blog.coverImageURL;
  const newImage = file ? await imageStorage.save(file) : undefined;

  try {
    // Assign through the document (not findByIdAndUpdate) so the excerpt hook runs.
    blog.set(changes);
    if (newImage) blog.coverImageURL = newImage;
    await blog.save();
  } catch (err) {
    await imageStorage.remove(newImage);
    throw err;
  }

  if (newImage) await imageStorage.remove(previousImage);
  return blog.populate("createdBy", AUTHOR_FIELDS);
}

export async function deleteBlog(user, id) {
  const blog = await Blog.findById(id);
  if (!blog) throw AppError.notFound("Blog not found");
  assertOwnerOrAdmin(user, blog.createdBy);

  // Comments have no meaning without their blog. Not wrapped in a transaction (needs a replica
  // set); the worst case is orphaned comments, which are unreachable through the API.
  await Promise.all([blog.deleteOne(), Comment.deleteMany({ blog: blog._id })]);
  await imageStorage.remove(blog.coverImageURL);
}

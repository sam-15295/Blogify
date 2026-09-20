import { Blog } from "../models/blog.js";
import { Comment } from "../models/comment.js";
import { AppError } from "../utils/AppError.js";
import { assertOwnerOrAdmin } from "../utils/permissions.js";

async function assertBlogExists(blogId) {
  if (!(await Blog.exists({ _id: blogId }))) throw AppError.notFound("Blog not found");
}

export async function listComments(blogId, { page, limit }) {
  await assertBlogExists(blogId);
  const filter = { blog: blogId };

  const [items, total] = await Promise.all([
    Comment.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("createdBy", "fullName")
      .lean(),
    Comment.countDocuments(filter),
  ]);

  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function createComment(userId, blogId, { content }) {
  await assertBlogExists(blogId);
  const comment = await Comment.create({ content, blog: blogId, createdBy: userId });
  return comment.populate("createdBy", "fullName");
}

export async function deleteComment(user, commentId) {
  const comment = await Comment.findById(commentId);
  if (!comment) throw AppError.notFound("Comment not found");
  assertOwnerOrAdmin(user, comment.createdBy);
  await comment.deleteOne();
}

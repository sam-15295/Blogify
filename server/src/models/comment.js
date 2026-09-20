import { Schema, model } from "mongoose";

const commentSchema = new Schema(
  {
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    blog: { type: Schema.Types.ObjectId, ref: "Blog", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// Serves "comments of a blog, newest first" without an in-memory sort.
commentSchema.index({ blog: 1, createdAt: -1, _id: -1 });

commentSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Comment = model("Comment", commentSchema);

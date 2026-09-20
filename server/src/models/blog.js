import { Schema, model } from "mongoose";

const EXCERPT_LENGTH = 200;

const blogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true },
    excerpt: { type: String },
    coverImageURL: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

// Newest-first listing; the sort key is indexed so pagination doesn't scan the collection.
blogSchema.index({ createdAt: -1 });
// Powers ?q= search. Title matches rank higher than body matches.
blogSchema.index({ title: "text", body: "text" }, { weights: { title: 5, body: 1 } });

// Denormalised so list endpoints never have to ship the full body.
blogSchema.pre("save", function () {
  if (this.isModified("body")) {
    this.excerpt = this.body.length > EXCERPT_LENGTH ? `${this.body.slice(0, EXCERPT_LENGTH).trimEnd()}…` : this.body;
  }
});

blogSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Blog = model("Blog", blogSchema);

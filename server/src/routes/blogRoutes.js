import { Router } from "express";
import * as blogs from "../controllers/blogController.js";
import * as comments from "../controllers/commentController.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/authenticate.js";
import { uploadCoverImage } from "../middlewares/upload.js";
import { createBlogSchema, listBlogsQuery, updateBlogSchema } from "../validators/blog.js";
import { createCommentSchema } from "../validators/comment.js";
import { idParams, paginationQuery } from "../validators/common.js";

const router = Router();

router.get("/", validate({ query: listBlogsQuery }), blogs.list);
router.get("/:id", validate({ params: idParams }), blogs.getOne);

// Order matters: authenticate first (don't accept uploads from strangers),
// then multer (fills req.body from multipart), then validation.
router.post("/", authenticate, uploadCoverImage, validate({ body: createBlogSchema }), blogs.create);
router.patch(
  "/:id",
  authenticate,
  uploadCoverImage,
  validate({ params: idParams, body: updateBlogSchema }),
  blogs.update,
);
router.delete("/:id", authenticate, validate({ params: idParams }), blogs.remove);

router.get("/:id/comments", validate({ params: idParams, query: paginationQuery }), comments.list);
router.post(
  "/:id/comments",
  authenticate,
  validate({ params: idParams, body: createCommentSchema }),
  comments.create,
);

export default router;

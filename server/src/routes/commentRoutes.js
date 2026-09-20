import { Router } from "express";
import * as comments from "../controllers/commentController.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/authenticate.js";
import { idParams } from "../validators/common.js";

const router = Router();

router.delete("/:id", authenticate, validate({ params: idParams }), comments.remove);

export default router;

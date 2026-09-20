import { Router } from "express";
import * as auth from "../controllers/authController.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authLimiter } from "../middlewares/rateLimit.js";
import { loginSchema, registerSchema } from "../validators/auth.js";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), auth.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), auth.login);
router.post("/refresh", auth.refresh);
router.post("/logout", auth.logout);
router.get("/me", authenticate, auth.me);

export default router;

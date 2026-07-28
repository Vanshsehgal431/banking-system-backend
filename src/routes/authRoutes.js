import { Router } from "express";

import {
  handleRefreshToken,
  login,
  logout,
  register,
} from "../controllers/auth.controller.js";
import { authenticateUser } from "../middleware/authMiddleware.js";
import { validate_user } from "../middleware/validation.js";
const router = Router();

router.post("/register", validate_user, register);

router.post("/login", login);

router.post("/refresh", handleRefreshToken);

router.post("/logout", authenticateUser, logout);

export default router;

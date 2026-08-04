import { Router } from "express";

import { getUser, updateUser } from "../controllers/userController.js";

import { authenticateUser } from "../middleware/authMiddleware.js";

const router = Router();

router.get("/profile", authenticateUser, getUser);

router.patch("/profile", authenticateUser, updateUser);

export default router;

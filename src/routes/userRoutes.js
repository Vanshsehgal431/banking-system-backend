import { Router } from "express";
import { getUser, updateUser } from "../controllers/userController";
import { authenticateUser } from "../middleware/authMiddleware";
import { validate_user } from "../middleware/validation";

const router = Router();

router.get("/profile", authenticateUser, getUser);

router.patch("/profile", authenticateUser, validate_user, updateUser);

export default router;

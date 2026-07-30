import { Router } from "express";

import { transaction } from "../controllers/transactionController";
import { authenticateUser } from "../middleware/authMiddleware";
import { validate_transaction } from "../middleware/transactionValidation";

const router = Router();

router.post("/transfer", authenticateUser, validate_transaction, transaction);

export default router;

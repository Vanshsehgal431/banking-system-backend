import { Router } from "express";

import {
  transaction,
  transactions,
} from "../controllers/transactionController";
import { authenticateUser } from "../middleware/authMiddleware";
import { validate_transaction } from "../middleware/transactionValidation";

const router = Router();

router.post("/transfer", authenticateUser, validate_transaction, transaction);
router.get("/transactions", authenticateUser, transactions);
export default router;

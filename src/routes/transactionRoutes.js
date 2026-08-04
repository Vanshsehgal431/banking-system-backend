import { Router } from "express";

import {
  deposit,
  transaction,
  transactions,
  withdraw,
} from "../controllers/transactionController.js";

import { authenticateUser } from "../middleware/authMiddleware.js";
import { validate_transaction } from "../middleware/transactionValidation.js";

const router = Router();

router.post("/transfer", authenticateUser, validate_transaction, transaction);

router.get("/transactions", authenticateUser, transactions);

router.post("/deposit", authenticateUser, deposit);

router.post("/withdraw", authenticateUser, withdraw);
export default router;

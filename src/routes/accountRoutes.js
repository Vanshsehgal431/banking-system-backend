import express from "express";
import {
  createAccount,
  getAccount,
  getBalance,
} from "../controllers/account.controller.js";
import validateAccount from "../middleware/accountValidation.js";
import authenticateUser from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", authenticateUser, validateAccount, createAccount);
router.get("/", authenticateUser, getAccount);
router.get("/balance", authenticateUser, getBalance);

export default router;

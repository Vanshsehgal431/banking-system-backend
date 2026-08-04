import cookieParser from "cookie-parser";
import express from "express";

import accountRoutes from "./routes/accountRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);

export default app;

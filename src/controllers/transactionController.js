import pool from "../config/database.js";

// Helper function to sleep/wait between retries
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function transaction(req, res, next) {
  const { sender_account_number, receiver_account_number, amount } = req.body;

  const MAX_RETRIES = 3;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    attempts++;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verify sender account belongs to authenticated user
      const [senderRows] = await connection.execute(
        `SELECT balance
         FROM accounts
         WHERE account_number = ? AND user_id = ?
         FOR UPDATE`,
        [sender_account_number, req.user.id],
      );

      if (senderRows.length === 0) {
        await connection.rollback();
        connection.release();

        res.status(404);
        return next(
          new Error("Sender account not found or does not belong to you"),
        );
      }

      const sender_balance = Number(senderRows[0].balance);

      // Lock receiver account
      const [receiverRows] = await connection.execute(
        `SELECT balance
         FROM accounts
         WHERE account_number = ?
         FOR UPDATE`,
        [receiver_account_number],
      );

      if (receiverRows.length === 0) {
        await connection.rollback();
        connection.release();

        res.status(404);
        return next(new Error("No receiver account found"));
      }

      const receiver_balance = Number(receiverRows[0].balance);

      if (sender_balance < amount) {
        await connection.rollback();
        connection.release();

        res.status(400);
        return next(
          new Error(
            "Unable to proceed transaction, due to insufficient balance",
          ),
        );
      }

      await connection.execute(
        "UPDATE accounts SET balance = ? WHERE account_number = ?",
        [sender_balance - amount, sender_account_number],
      );

      await connection.execute(
        "UPDATE accounts SET balance = ? WHERE account_number = ?",
        [receiver_balance + amount, receiver_account_number],
      );

      await connection.execute(
        `INSERT INTO transactions
        (sender_account_number, receiver_account_number, amount, status, transaction_type)
        VALUES (?, ?, ?, ?, ?)`,
        [
          sender_account_number,
          receiver_account_number,
          amount,
          "SUCCESS",
          "TRANSFER",
        ],
      );

      await connection.commit();
      connection.release();

      return res.status(200).json({
        success: true,
        message: "Transaction successful",
        data: {
          sender_account_number,
          receiver_account_number,
          amount,
        },
      });
    } catch (error) {
      await connection.rollback();
      connection.release();

      const isDeadlock =
        error.errno === 1213 || error.code === "ER_LOCK_DEADLOCK";

      if (isDeadlock && attempts < MAX_RETRIES) {
        console.warn(
          `Deadlock detected on attempt ${attempts}. Retrying in 50ms...`,
        );
        await sleep(50);
        continue;
      }

      try {
        await pool.execute(
          `INSERT INTO transactions
          (sender_account_number, receiver_account_number, amount, status, transaction_type)
          VALUES (?, ?, ?, ?, ?)`,
          [
            sender_account_number,
            receiver_account_number,
            amount,
            "FAILED",
            "TRANSFER",
          ],
        );
      } catch (logError) {
        console.error("Failed to write system failure log:", logError.message);
      }

      return next(error);
    }
  }
}

export async function transactions(req, res, next) {
  try {
    const { account_number } = req.body;

    if (!account_number) {
      res.status(400);
      return next(
        new Error("Account number must be available for transactions"),
      );
    }

    if (typeof account_number !== "string") {
      res.status(400);
      return next(new Error("Account number must be a string"));
    }

    // Verify ownership
    const [accountRows] = await pool.execute(
      "SELECT id FROM accounts WHERE account_number = ? AND user_id = ?",
      [account_number, req.user.id],
    );

    if (accountRows.length === 0) {
      res.status(403);
      return next(new Error("You are not authorized to access this account"));
    }

    const [rows] = await pool.execute(
      `SELECT *
       FROM transactions
       WHERE sender_account_number = ?
          OR receiver_account_number = ?
       ORDER BY created_at DESC`,
      [account_number, account_number],
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No transactions related to this account",
      });
    }

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function withdraw(req, res, next) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { account_number, amount } = req.body;

    if (!account_number) {
      await connection.rollback();
      connection.release();

      res.status(400);
      return next(
        new Error("Account number must be available for transactions"),
      );
    }

    if (typeof account_number !== "string") {
      await connection.rollback();
      connection.release();

      res.status(400);
      return next(new Error("Account number must be a string"));
    }

    if (amount <= 0) {
      await connection.rollback();
      connection.release();

      res.status(400);
      return next(new Error("Amount must be positive"));
    }

    // Verify ownership
    const [rows] = await connection.execute(
      `SELECT balance
       FROM accounts
       WHERE account_number = ? AND user_id = ?
       FOR UPDATE`,
      [account_number, req.user.id],
    );

    if (rows.length === 0) {
      await connection.rollback();
      connection.release();

      res.status(404);
      return next(new Error("Account not found or does not belong to you"));
    }

    const balance = Number(rows[0].balance);

    if (balance < amount) {
      await connection.rollback();
      connection.release();

      res.status(400);
      return next(new Error("Insufficient balance."));
    }

    await connection.execute(
      "UPDATE accounts SET balance = ? WHERE account_number = ?",
      [balance - amount, account_number],
    );

    await connection.execute(
      `INSERT INTO transactions
      (sender_account_number, receiver_account_number, amount, status, transaction_type)
      VALUES (?, ?, ?, ?, ?)`,
      [account_number, null, -amount, "SUCCESS", "WITHDRAW"],
    );

    await connection.commit();
    connection.release();

    return res.status(200).json({
      success: true,
      message: "Transaction successful",
      data: {
        account_number,
        amount,
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    next(error);
  }
}

export async function deposit(req, res, next) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { account_number, amount } = req.body;

    if (!account_number) {
      await connection.rollback();
      connection.release();

      res.status(400);
      return next(
        new Error("Account number must be available for transactions"),
      );
    }

    if (typeof account_number !== "string") {
      await connection.rollback();
      connection.release();

      res.status(400);
      return next(new Error("Account number must be a string"));
    }

    if (amount <= 0) {
      await connection.rollback();
      connection.release();

      res.status(400);
      return next(new Error("Amount must be positive"));
    }

    // Verify ownership
    const [rows] = await connection.execute(
      `SELECT balance
       FROM accounts
       WHERE account_number = ? AND user_id = ?
       FOR UPDATE`,
      [account_number, req.user.id],
    );

    if (rows.length === 0) {
      await connection.rollback();
      connection.release();

      res.status(404);
      return next(new Error("Account not found or does not belong to you"));
    }

    const balance = Number(rows[0].balance);

    await connection.execute(
      "UPDATE accounts SET balance = ? WHERE account_number = ?",
      [balance + amount, account_number],
    );

    await connection.execute(
      `INSERT INTO transactions
      (sender_account_number, receiver_account_number, amount, status, transaction_type)
      VALUES (?, ?, ?, ?, ?)`,
      [null, account_number, amount, "SUCCESS", "DEPOSIT"],
    );

    await connection.commit();
    connection.release();

    return res.status(200).json({
      success: true,
      message: "Deposit successful",
      data: {
        account_number,
        amount,
      },
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    next(error);
  }
}

import pool from "../config/database";

// Helper function to sleep/wait between retries
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function transaction(req, res, next) {
  const { sender_account_number, receiver_account_number, amount } = req.body;

  const MAX_RETRIES = 3;
  let attempts = 0;

  // Loop to allow automatic retries if a deadlock happens
  while (attempts < MAX_RETRIES) {
    attempts++;
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      let [senderRows] = await connection.execute(
        "SELECT balance FROM accounts WHERE account_number = ? FOR UPDATE",
        [sender_account_number],
      );

      if (senderRows.length === 0) {
        await connection.rollback();
        connection.release();
        res.status(404);
        return next(new Error("No sender account found"));
      }
      const sender_balance = Number(senderRows[0].balance);

      let [receiverRows] = await connection.execute(
        "SELECT balance FROM accounts WHERE account_number = ? FOR UPDATE",
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

      // 5. Commit and finish successfully

      await connection.execute(
        "INSERT INTO transactions (sender_account_number, receiver_account_number, amount, status) VALUES(?,?,?,?)",
        [sender_account_number, receiver_account_number, amount, "SUCCESS"],
      );

      await connection.commit();
      connection.release();

      return res.status(200).json({
        success: true,
        message: "Transaction successful",
        data: { sender_account_number, receiver_account_number, amount },
      });
    } catch (error) {
      await connection.rollback();
      connection.release();

      // Check if the error is a MySQL Deadlock (Error Code: 1213 / 'ER_LOCK_DEADLOCK')
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
          "INSERT INTO transactions (sender_account_number, receiver_account_number, amount, status) VALUES(?,?,?,?)",
          [sender_account_number, receiver_account_number, amount, "FAILURE"],
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
    const details = req.body;

    const account_number = details.account_number;

    if (!account_number) {
      const error = new Error(
        "Account number must be available for transactions",
      );
      res.status(400);
      return next(error);
    }

    if (typeof account_number !== "string") {
      res.status(400);
      return next(new Error("Sender account number must be a string"));
    }

    const [rows] = await pool.execute(
      "SELECT * FROM transactions WHERE sender_account_number = ? OR receiver_account_number = ?",
      [account_number, account_number],
    );

    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No transactions related to this account",
      });
    }

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
}

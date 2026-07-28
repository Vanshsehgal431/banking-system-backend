import pool from "../config/database.js";

async function uniqueAccountNumber(connection) {
  const length = Math.floor(Math.random() * (14 - 10 + 1)) + 10;

  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;

  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

  const [rows] = await connection.execute(
    "SELECT COUNT(*) AS total FROM accounts WHERE account_number = ? ",
    [randomNumber],
  );

  if (rows[0].total > 0) {
    return await uniqueAccountNumber(connection);
  }
  return randomNumber;
}

export async function createAccount(req, res, next) {
  // Getting a dedicated pool connection for transaction purpose

  const connection = await pool.getConnection();

  try {
    const user = req.user;
    const bankDetails = req.body;

    await connection.beginTransaction();

    const nextAccountNumber = await uniqueAccountNumber(connection);

    const accountType = bankDetails.account_type || "SAVINGS";

    const [result] = await connection.execute(
      "INSERT INTO accounts(user_id, account_number, account_type) VALUES (?, ?, ?)",
      [user.id, nextAccountNumber, accountType],
    );
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      accountId: result.insertId,
      accountNumber: nextAccountNumber,
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function getAccount(req, res, next) {
  try {
    const user = req.user;

    const [rows] = await pool.execute(
      "SELECT * FROM accounts WHERE user_id = ?",
      [user.id],
    );

    if (rows.length === 0) {
      const error = new Error(
        "Account Fetch Failure: No account linked with this user",
      );
      error.statusCode = 404;
      return next(error);
    }
    return res.status(200).json({
      success: true,
      accounts: rows,
    });
  } catch (error) {
    next(error);
  }
}

export async function getBalance(req, res, next) {
  try {
    const user = req.user;

    const bankDetails = req.body;

    if (!bankDetails.account_number) {
      const error = new Error(
        "Balance Fetch Failure: Account number not present",
      );
      error.statusCode = 400;
      return next(error);
    }

    const [rows] = await pool.execute(
      "SELECT balance FROM accounts WHERE user_id = ? AND account_number = ?",
      [user.id, bankDetails.account_number],
    );

    if (rows.length === 0) {
      const error = new Error(
        "Account Fetch Failure: No account linked with this user",
      );
      error.statusCode = 404;
      return next(error);
    }

    return res.status(200).json({
      success: true,
      account_number: bankDetails.account_number,
      balance: rows[0].balance,
    });
  } catch (error) {
    next(error);
  }
}

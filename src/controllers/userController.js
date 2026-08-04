import pool from "../config/database.js";

export async function getUser(req, res, next) {
  try {
    const user = req.user;

    const [rows] = await pool.execute(
      `SELECT first_name, last_name, email, phone, role
       FROM users
       WHERE id = ?`,
      [user.id],
    );

    if (rows.length === 0) {
      const error = new Error("User not found");
      error.statusCode = 404;
      return next(error);
    }

    const userDetails = rows[0];

    return res.status(200).json({
      first_name: userDetails.first_name,
      last_name: userDetails.last_name,
      email: userDetails.email,
      phone: userDetails.phone,
      role: userDetails.role,
    });
  } catch (error) {
    next(error);
  }
}

// Right now supports first_name, last_name, phone, use patch method with it

export async function updateUser(req, res, next) {
  try {
    const { first_name, last_name, phone } = req.body;
    const { id } = req.user;

    await pool.execute(
      `UPDATE users
       SET first_name = ?, last_name = ?, phone = ?
       WHERE id = ?`,
      [first_name, last_name, phone, id],
    );

    return res.status(200).json({
      success: true,
      message: "User updated successfully.",
    });
  } catch (error) {
    next(error);
  }
}

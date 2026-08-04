// login,
//   logout,
//   refreshToken,
//   register,

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/database.js";
import { generateAccessToken, generateRefreshToken } from "../config/jwt.js";

const SALT_ROUNDS = 10;

export async function register(req, res, next) {
  try {
    const details = req.body;

    const [rows] = await pool.execute(
      "SELECT EXISTS(SELECT 1 FROM users WHERE email = ?) AS emailExists",
      [details.email],
    );

    const emailExists = rows[0].emailExists === 1;

    if (emailExists) {
      const error = new Error("Registration Failure: email already exists");
      error.statusCode = 409;
      return next(error);
    }

    const hashedPassword = await bcrypt.hash(details.password, SALT_ROUNDS);

    const query = `
      INSERT INTO users (first_name, last_name, email, password,phone)
      VALUES (?,?,?,?,?)
    `;

    await pool.execute(query, [
      details.first_name,
      details.last_name,
      details.email,
      hashedPassword,
      details.phone,
    ]);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const [rows] = await pool.execute(
      "SELECT id, role, email, password FROM users WHERE email = ?",
      [email],
    );

    if (rows.length === 0) {
      const error = new Error(
        "Authentication Failure: Invalid email or password",
      );
      error.statusCode = 401;
      return next(error);
    }

    const user = rows[0];

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      const error = new Error(
        "Authentication Failure: Invalid email or password",
      );
      error.statusCode = 401;
      return next(error);
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await pool.execute(
      `INSERT INTO refresh_token (user_id, token_string)
       VALUES (?, ?)`,
      [user.id, refreshToken],
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function handleRefreshToken(req, res, next) {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
      const error = new Error("Refresh token missing.");
      error.statusCode = 401;
      return next(error);
    }

    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(
        incomingRefreshToken,
        process.env.JWT_REFRESH_SECRET,
      );
    } catch (err) {
      const error = new Error("Invalid or expired refresh token.");
      error.statusCode = 403;
      return next(error);
    }

    // Find the EXACT refresh token
    const [rows] = await pool.execute(
      "SELECT * FROM refresh_token WHERE token_string = ?",
      [incomingRefreshToken],
    );

    if (rows.length === 0) {
      const error = new Error("Invalid refresh token.");
      error.statusCode = 403;
      return next(error);
    }

    const storedToken = rows[0];

    // Extra safety check
    if (storedToken.user_id !== decoded.id) {
      const error = new Error("Refresh token does not belong to this user.");
      error.statusCode = 403;
      return next(error);
    }

    // Refresh token reuse detected
    if (storedToken.is_used) {
      await pool.execute("DELETE FROM refresh_token WHERE user_id = ?", [
        storedToken.user_id,
      ]);

      const error = new Error(
        "Security Alert: Refresh token reuse detected. All sessions have been revoked.",
      );
      error.statusCode = 403;
      return next(error);
    }

    // Mark current refresh token as used
    await pool.execute("UPDATE refresh_token SET is_used = TRUE WHERE id = ?", [
      storedToken.id,
    ]);

    const payload = {
      id: storedToken.user_id,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Store new refresh token
    await pool.execute(
      `INSERT INTO refresh_token
      (user_id, token_string, parent_token_id)
      VALUES (?, ?, ?)`,
      [storedToken.user_id, newRefreshToken, storedToken.id],
    );

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "Refresh successful",
    });
  } catch (error) {
    next(error);
  }
}
export async function logout(req, res, next) {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
      const error = new Error("Refresh token missing.");
      error.statusCode = 401;
      return next(error);
    }

    const [rows] = await pool.execute(
      "SELECT * FROM refresh_token WHERE token_string = ?",
      [incomingRefreshToken],
    );

    if (rows.length === 0) {
      const error = new Error("Invalid refresh token.");
      error.statusCode = 403;
      return next(error);
    }

    const storedToken = rows[0];

    await pool.execute("DELETE FROM refresh_token WHERE user_id = ?", [
      storedToken.user_id,
    ]);

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
}

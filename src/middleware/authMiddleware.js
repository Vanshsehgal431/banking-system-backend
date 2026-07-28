import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_TOKEN;

export async function authenticateUser(req, res, next) {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      const error = new Error("Access token missing.");
      error.statusCode = 401;
      return next(error);
    }

    const decodedUser = jwt.verify(token, ACCESS_TOKEN_SECRET);

    req.user = decodedUser;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      const error = new Error("Access token has expired.");
      error.statusCode = 401;
      return next(error);
    }

    if (err.name === "JsonWebTokenError") {
      const error = new Error("Invalid access token.");
      error.statusCode = 401;
      return next(error);
    }

    next(err);
  }
}

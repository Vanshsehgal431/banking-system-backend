import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN;
function generateAccessToken(user) {
  const payload = {
    id: user.id,
    role: user.role,
  };

  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: EXPIRES_IN || "10m",
    issuer: "bank_service",
  });
}

function generateRefreshToken(user) {
  const payload = { id: user.id };

  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: EXPIRES_IN || "10m",
    issuer: "bank_service",
  });
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (error) {
    return null;
  }
}

function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};

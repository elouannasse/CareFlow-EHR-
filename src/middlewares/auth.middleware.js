import { verifyAccessToken } from "../utils/jwt.js";

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch { 
    res.status(401).json({ message: "Invalid or expired token" }); 
  }
}

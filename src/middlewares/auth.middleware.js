import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token d'accès requis",
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Compte désactivé",
      });
    }

    if (user.isSuspended) {
      return res.status(401).json({
        success: false,
        message: "Compte suspendu",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expiré",
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Token invalide",
      });
    }

    console.error("Erreur authentification:", error);
    return res.status(401).json({
      success: false,
      message: "Erreur d'authentification",
    });
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise",
      });
    }

    const userRole = req.user.role.toLowerCase().trim();
    const roles = allowedRoles.map((r) => r.toLowerCase().trim());

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Permissions insuffisantes",
        required: allowedRoles,
        current: req.user.role,
      });
    }

    next();
  };
};

export const canModifyResource = (req, res, next) => {
  const { id } = req.params;

  if (req.user.role.toLowerCase().trim() === "admin") {
    return next();
  }

  if (req.user.id === id) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Vous ne pouvez modifier que vos propres données",
  });
};

export const medicalStaffOnly = (req, res, next) => {
  const role = req.user.role.toLowerCase().trim();
  if (!["admin", "doctor", "nurse"].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Accès réservé au personnel médical",
    });
  }
  next();
};

export const adminOnly = (req, res, next) => {
  if (req.user.role.toLowerCase().trim() !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Accès réservé aux administrateurs",
    });
  }
  next();
};

export const patientAccessStaff = (req, res, next) => {
  const role = req.user.role.toLowerCase().trim();
  if (!["admin", "doctor", "nurse", "secretary"].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Accès réservé au personnel autorisé", 
    });
  }
  next();
};

export default {
  authenticate,
  authorize,
  canModifyResource,
  medicalStaffOnly,
  adminOnly,
  patientAccessStaff,
};

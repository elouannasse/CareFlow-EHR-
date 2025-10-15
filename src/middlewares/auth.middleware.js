import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Middleware d'authentification JWT
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

    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Récupérer l'utilisateur depuis la base de données
    const user = await User.findById(decoded.id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    // Vérifier si l'utilisateur est actif
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Compte désactivé",
      });
    }

    // Vérifier si l'utilisateur est suspendu
    if (user.isSuspended) {
      return res.status(401).json({
        success: false,
        message: "Compte suspendu",
      });
    }

    // Attacher l'utilisateur à la requête
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

// Middleware d'autorisation par rôles
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
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

// Middleware pour vérifier si l'utilisateur peut modifier une ressource
export const canModifyResource = (req, res, next) => {
  const { id } = req.params;

  // Admin peut tout modifier
  if (req.user.role === "admin") {
    return next();
  }

  // L'utilisateur peut modifier ses propres données
  if (req.user.id === id) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Vous ne pouvez modifier que vos propres données",
  });
};

// Middleware pour les opérations médicales (doctors, nurses)
export const medicalStaffOnly = (req, res, next) => {
  if (!["admin", "doctor", "nurse"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Accès réservé au personnel médical",
    });
  }
  next();
};

// Middleware pour les opérations administratives
export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Accès réservé aux administrateurs",
    });
  }
  next();
};

// Middleware pour le personnel avec accès patients (doctors, nurses, secretaries)
export const patientAccessStaff = (req, res, next) => {
  if (!["admin", "doctor", "nurse", "secretary"].includes(req.user.role)) {
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

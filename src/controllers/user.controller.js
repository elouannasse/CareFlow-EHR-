import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Joi from "joi";

const createUserSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string()
    .valid("admin", "doctor", "nurse", "secretary", "patient")
    .default("patient"),
  phoneNumber: Joi.string().optional(),
});

const updateUserSchema = Joi.object({
  firstName: Joi.string().optional(),
  lastName: Joi.string().optional(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().optional(),
  role: Joi.string()
    .valid("admin", "doctor", "nurse", "secretary", "patient")
    .optional(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
});

export const createUser = async (req, res) => {
  try {
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const { firstName, lastName, email, password, role, phoneNumber } = value;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Un utilisateur avec cet email existe déjà",
      });
    }

    if (["admin", "doctor"].includes(role) && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Permission insuffisante pour créer ce type d'utilisateur",
      });
    }

    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role,
      phoneNumber,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès",
      data: { user: user.toJSON() },
    });
  } catch (error) {
    console.error("Erreur création utilisateur:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = {};
    if (req.query.role) filters.role = req.query.role;
    if (req.query.isActive !== undefined)
      filters.isActive = req.query.isActive === "true";
    if (req.query.isSuspended !== undefined)
      filters.isSuspended = req.query.isSuspended === "true";

    if (req.query.search) {
      filters.$or = [
        { firstName: { $regex: req.query.search, $options: "i" } },
        { lastName: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(filters);
    const users = await User.find(filters)
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Erreur récupération utilisateurs:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Erreur récupération utilisateur:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    if (req.user.id !== id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Permission insuffisante",
      });
    }

    if (value.email && value.email !== user.email) {
      const existingUser = await User.findOne({ email: value.email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Cet email est déjà utilisé",
        });
      }
    }

    if (value.role && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Seuls les administrateurs peuvent modifier les rôles",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { ...value, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    res.json({
      success: true,
      message: "Utilisateur mis à jour avec succès",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("Erreur mise à jour utilisateur:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { id } = req.params;

    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const { currentPassword, newPassword } = value;

    if (req.user.id !== id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Permission insuffisante",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    if (req.user.role !== "admin") {
      const isCurrentPasswordValid = await user.comparePassword(
        currentPassword
      );
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: "Mot de passe actuel incorrect",
        });
      }
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Mot de passe modifié avec succès",
    });
  } catch (error) {
    console.error("Erreur changement mot de passe:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Seuls les administrateurs peuvent suspendre des utilisateurs",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    if (user.isSuspended) {
      return res.status(400).json({
        success: false,
        message: "L'utilisateur est déjà suspendu",
      });
    }

    user.isSuspended = true;
    user.suspendedBy = req.user.id;
    user.suspendedAt = new Date();
    user.suspensionReason = reason || "Aucune raison spécifiée";
    await user.save();

    res.json({
      success: true,
      message: "Utilisateur suspendu avec succès",
      data: { user: user.toJSON() },
    });
  } catch (error) {
    console.error("Erreur suspension utilisateur:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const unsuspendUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Seuls les administrateurs peuvent réactiver des utilisateurs",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    if (!user.isSuspended) {
      return res.status(400).json({
        success: false,
        message: "L'utilisateur n'est pas suspendu",
      });
    }

    user.isSuspended = false;
    user.suspendedBy = undefined;
    user.suspendedAt = undefined;
    user.suspensionReason = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Utilisateur réactivé avec succès",
      data: { user: user.toJSON() },
    });
  } catch (error) {
    console.error("Erreur réactivation utilisateur:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Seuls les administrateurs peuvent supprimer des utilisateurs",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    if (req.user.id === id) {
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas supprimer votre propre compte",
      });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: "Utilisateur supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression utilisateur:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const getUserStats = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Accès réservé aux administrateurs",
      });
    }

    const stats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
          active: { $sum: { $cond: ["$isActive", 1, 0] } },
          suspended: { $sum: { $cond: ["$isSuspended", 1, 0] } },
        },
      },
    ]);

    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const suspendedUsers = await User.countDocuments({ isSuspended: true });

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        byRole: stats,
      },
    });
  } catch (error) {
    console.error("Erreur statistiques utilisateurs:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export default {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  changePassword,
  suspendUser,
  unsuspendUser,
  deleteUser,
  getUserStats,
};

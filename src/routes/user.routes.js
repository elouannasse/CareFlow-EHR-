import express from "express";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  changePassword,
  suspendUser,
  unsuspendUser,
  deleteUser,
  getUserStats,
} from "../controllers/user.controller.js";
import {
  authenticate,
  authorize,
  canModifyResource,
  adminOnly,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

// 📝 Routes CRUD Users

/**
 * @route   POST /api/users
 * @desc    Créer un nouvel utilisateur
 * @access  Admin, Secretary (pour patients)
 */
router.post("/", authenticate, authorize("admin", "secretary"), createUser);

/**
 * @route   GET /api/users
 * @desc    Obtenir tous les utilisateurs (avec pagination et filtres)
 * @access  Admin, Secretary, Doctor, Nurse
 */
router.get(
  "/",
  authenticate,
  authorize("admin", "secretary", "doctor", "nurse"),
  getAllUsers
);

/**
 * @route   GET /api/users/stats
 * @desc    Obtenir les statistiques des utilisateurs
 * @access  Admin seulement
 */
router.get("/stats", authenticate, adminOnly, getUserStats);

/**
 * @route   GET /api/users/:id
 * @desc    Obtenir un utilisateur par ID
 * @access  Admin, ou l'utilisateur lui-même
 */
router.get("/:id", authenticate, getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Mettre à jour un utilisateur
 * @access  Admin, ou l'utilisateur lui-même
 */
router.put("/:id", authenticate, canModifyResource, updateUser);

/**
 * @route   PATCH /api/users/:id/password
 * @desc    Changer le mot de passe d'un utilisateur
 * @access  Admin, ou l'utilisateur lui-même
 */
router.patch("/:id/password", authenticate, canModifyResource, changePassword);

/**
 * @route   PATCH /api/users/:id/suspend
 * @desc    Suspendre un utilisateur
 * @access  Admin seulement
 */
router.patch("/:id/suspend", authenticate, adminOnly, suspendUser);

/**
 * @route   PATCH /api/users/:id/unsuspend
 * @desc    Réactiver un utilisateur suspendu
 * @access  Admin seulement
 */
router.patch("/:id/unsuspend", authenticate, adminOnly, unsuspendUser);

/**
 * @route   DELETE /api/users/:id
 * @desc    Supprimer un utilisateur (soft delete)
 * @access  Admin seulement
 */
router.delete("/:id", authenticate, adminOnly, deleteUser);

export default router;

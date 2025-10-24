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


router.post("/", authenticate, authorize("admin", "secretary"), createUser);


router.get(
  "/",
  authenticate,
  authorize("admin", "secretary", "doctor", "nurse"),
  getAllUsers
);


router.get("/stats", authenticate, adminOnly, getUserStats);


router.get("/:id", authenticate, getUserById);


router.put("/:id", authenticate, canModifyResource, updateUser);


router.patch("/:id/password", authenticate, canModifyResource, changePassword);


router.patch("/:id/suspend", authenticate, adminOnly, suspendUser);


router.patch("/:id/unsuspend", authenticate, adminOnly, unsuspendUser);


router.delete("/:id", authenticate, adminOnly, deleteUser);

export default router;

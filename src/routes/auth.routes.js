import express from "express";
import { register, login, refreshToken, logout } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken); 
router.post("/logout", logout);


router.post(
  "/register-role", 
  authenticate, 
  checkRole(["admin"]), 
  async (req, res) => {
    try {
      const { firstName, lastName, email, password, role } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: "Email already exists" });

      const hash = await bcrypt.hash(password, 10);
      const user = await User.create({ firstName, lastName, email, password: hash, role });

      res.status(201).json({
        success: true,
        message: "User created successfully with role",
        data: { user }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;     

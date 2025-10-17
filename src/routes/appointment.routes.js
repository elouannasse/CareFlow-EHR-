import express from "express";
import {
  createAppointment,
  getDoctorAvailability,
  updateAppointment,
} from "../controllers/appointment.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

// POST /api/v1/appointments - Créer un nouveau rendez-vous
// Accessible par : doctor, nurse, secretary, admin
router.post(
  "/",
  authenticate,
  authorize(["doctor", "nurse", "secretary", "admin"]),
  createAppointment
);

// GET /api/v1/appointments/availability/:doctorId - Obtenir la disponibilité d'un médecin
// Accessible par : tout le monde authentifié
router.get("/availability/:doctorId", authenticate, getDoctorAvailability);

// PATCH /api/v1/appointments/:id - Modifier un rendez-vous
// Accessible par : doctor, nurse, secretary, admin
router.patch(
  "/:id",
  authenticate,
  authorize(["doctor", "nurse", "secretary", "admin"]),
  updateAppointment
);

export default router;

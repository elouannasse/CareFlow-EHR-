import express from "express";
import {
  createAppointment,
  getDoctorAvailability,
  updateAppointment,
  cancelAppointment,
} from "../controllers/appointment.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorize("doctor", "nurse", "secretary", "admin"),
  createAppointment
);

router.get("/availability/:doctorId", authenticate, getDoctorAvailability);

router.patch(
  "/:id",
  authenticate,
  authorize("doctor", "nurse", "secretary", "admin"),
  updateAppointment
);

router.patch("/:id/cancel", authenticate, cancelAppointment);

export default router;

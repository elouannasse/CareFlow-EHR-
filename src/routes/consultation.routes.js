import express from "express";
import {
  createConsultation,
  getConsultation,
  updateConsultation,
  getPatientConsultations,
} from "../controllers/consultation.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authenticate, authorize("doctor"), createConsultation);

router.get(
  "/:id",
  authenticate,
  authorize(["doctor", "patient", "admin"]),
  getConsultation
);

router.get(
  "/patient/:patientId",
  authenticate,
  authorize(["doctor", "patient", "admin"]),
  getPatientConsultations
);

router.patch("/:id", authenticate, authorize(["doctor"]), updateConsultation);

export default router;

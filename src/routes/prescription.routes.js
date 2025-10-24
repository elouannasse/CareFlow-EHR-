import express from "express";
import {
  createPrescription,
  getAllPrescriptions,
  getPrescriptionById,
  updatePrescription,
  signPrescription,
  getPatientPrescriptions,
  deletePrescription,
} from "../controllers/prescription.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", authenticate, authorize("doctor"), createPrescription);

router.get(
  "/",
  authenticate,
  authorize("admin", "doctor", "nurse", "secretary", "patient"),
  getAllPrescriptions
);

router.get(
  "/:id",
  authenticate,
  authorize(["admin", "doctor", "nurse", "patient"]),
  getPrescriptionById
);

router.patch("/:id", authenticate, authorize("doctor"), updatePrescription);

router.patch(
  "/:id/sign",
  authenticate,
  authorize("doctor"),
  signPrescription
);

router.get(
  "/patient/:patientId",
  authenticate,
  authorize("admin", "doctor", "nurse", "patient"),
  getPatientPrescriptions
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "doctor"),
  deletePrescription
);

export default router;

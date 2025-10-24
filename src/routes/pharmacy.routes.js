import express from "express";
import {
  createPharmacy,
  getAllPharmacies,
  assignPrescriptionToPharmacy,
  pharmacistUpdateStatus,
  getPharmacyPrescriptions,
} from "../controllers/pharmacy.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.js";

const router = express.Router();

router.post("/", authenticate, authorize(["admin"]), createPharmacy);

router.get(
  "/",
  authenticate,
  authorize(["admin", "doctor", "nurse", "secretary"]),
  getAllPharmacies
);

router.post(
  "/prescriptions/:prescriptionId/assign",
  authenticate,
  authorize(["admin", "doctor", "nurse", "secretary"]),
  assignPrescriptionToPharmacy
);

router.patch(
  "/prescriptions/:prescriptionId/status",
  authenticate,
  authorize(["admin", "pharmacist"]),
  pharmacistUpdateStatus
);

// GET /api/pharmacies/:pharmacyId/prescriptions - Get prescriptions for a pharmacy
router.get(
  "/:pharmacyId/prescriptions",
  authenticate,
  authorize(["admin", "pharmacist", "doctor", "nurse"]),
  getPharmacyPrescriptions
);

export default router;

import express from "express";
import {
  createLabOrder,
  getAllLabOrders,
  getLabOrderById,
  updateLabOrderStatus,
  updateTestResult,
  assignToLaboratory,
  cancelLabOrder,
  getLabOrdersByPatient,
  getLabOrderStatistics,
} from "../controllers/labOrder.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.js";

const router = express.Router();

// Créer un ordre de laboratoire
router.post(
  "/",
  authenticate,
  authorize(["admin", "doctor", "nurse"]),
  createLabOrder
);

// Obtenir tous les ordres de laboratoire
router.get(
  "/",
  authenticate,
  authorize(["admin", "doctor", "nurse", "lab_technician"]),
  getAllLabOrders
);

// Obtenir un ordre spécifique
router.get(
  "/:id",
  authenticate,
  authorize(["admin", "doctor", "nurse", "lab_technician", "patient"]),
  getLabOrderById
);

// Mettre à jour le statut d'un ordre
router.patch(
  "/:id/status",
  authenticate,
  authorize(["admin", "lab_technician", "doctor"]),
  updateLabOrderStatus
);

// Mettre à jour le résultat d'un test spécifique
router.patch(
  "/:orderId/tests/:testIndex/result",
  authenticate,
  authorize(["admin", "lab_technician"]),
  updateTestResult
);

// Assigner un ordre à un laboratoire
router.post(
  "/:orderId/assign",
  authenticate,
  authorize(["admin", "doctor", "nurse"]),
  assignToLaboratory
);

// Annuler un ordre
router.patch(
  "/:id/cancel",
  authenticate,
  authorize(["admin", "doctor"]),
  cancelLabOrder
);

// Obtenir les ordres d'un patient
router.get(
  "/patient/:patientId",
  authenticate,
  authorize(["admin", "doctor", "nurse", "patient"]),
  getLabOrdersByPatient
);

// Statistiques des ordres (global ou par laboratoire)
router.get(
  "/statistics/:laboratoryId?",
  authenticate,
  authorize(["admin", "lab_technician"]),
  getLabOrderStatistics
);

export default router;

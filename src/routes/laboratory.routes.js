import express from "express";
import {
  createLaboratory,
  getAllLaboratories,
  getLaboratoryById,
  updateLaboratory,
  deleteLaboratory,
  addTestToLaboratory,
  updateTestInLaboratory,
  removeTestFromLaboratory,
  getLabOrdersByLaboratory,
  getLaboratoryStatistics,
  searchLaboratoriesByTests,
} from "../controllers/laboratory.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authorize } from "../middlewares/authorize.js";

const router = express.Router();

// Créer un laboratoire
router.post("/", authenticate, authorize(["admin"]), createLaboratory);

// Obtenir tous les laboratoires (avec filtres optionnels)
router.get(
  "/",
  authenticate,
  authorize(["admin", "doctor", "nurse", "lab_technician"]),
  getAllLaboratories
);

// Chercher les laboratoires par tests disponibles
router.get(
  "/search",
  authenticate,
  authorize(["admin", "doctor", "nurse"]),
  searchLaboratoriesByTests
);

// Obtenir un laboratoire spécifique
router.get(
  "/:id",
  authenticate,
  authorize(["admin", "doctor", "nurse", "lab_technician"]),
  getLaboratoryById
);

// Mettre à jour un laboratoire
router.put("/:id", authenticate, authorize(["admin"]), updateLaboratory);

// Supprimer un laboratoire
router.delete("/:id", authenticate, authorize(["admin"]), deleteLaboratory);

// Gestion du catalogue de tests
// Ajouter un test au laboratoire
router.post(
  "/:id/tests",
  authenticate,
  authorize(["admin", "lab_technician"]),
  addTestToLaboratory
);

// Mettre à jour un test du laboratoire
router.put(
  "/:id/tests/:testCode",
  authenticate,
  authorize(["admin", "lab_technician"]),
  updateTestInLaboratory
);

// Supprimer un test du laboratoire
router.delete(
  "/:id/tests/:testCode",
  authenticate,
  authorize(["admin", "lab_technician"]),
  removeTestFromLaboratory
);

// Gestion des ordres du laboratoire
// Obtenir tous les ordres assignés à ce laboratoire
router.get(
  "/:id/orders",
  authenticate,
  authorize(["admin", "lab_technician"]),
  getLabOrdersByLaboratory
);

// Obtenir les statistiques du laboratoire
router.get(
  "/:id/statistics",
  authenticate,
  authorize(["admin", "lab_technician"]),
  getLaboratoryStatistics
);

export default router;

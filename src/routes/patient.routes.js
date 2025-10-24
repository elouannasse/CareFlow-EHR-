import express from "express";
import {
  createPatient,
  getAllPatients,
  getPatientById,
  searchPatients,
  updatePatient,
  deletePatient,
  getPatientStats,
  getPatientProfile,
} from "../controllers/patient.controller.js";
import {
  authenticate,
  authorize,
  medicalStaffOnly,
  patientAccessStaff,
  adminOnly,
} from "../middlewares/auth.middleware.js";

const router = express.Router();


router.post("/", authenticate, patientAccessStaff, createPatient);


router.get("/", authenticate, patientAccessStaff, getAllPatients);


router.post("/search", authenticate, patientAccessStaff, searchPatients);


router.get(
  "/stats",
  authenticate,
  authorize("admin", "doctor", "nurse"),
  getPatientStats
);


router.get("/:id", authenticate, patientAccessStaff, getPatientById);


router.get(
  "/:id/profile",
  authenticate,
  authorize(["doctor", "nurse", "admin"]),
  getPatientProfile
);


router.put("/:id", authenticate, patientAccessStaff, updatePatient);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "doctor", "nurse"),
  deletePatient
);



router.post(
  "/:id/allergies",
  authenticate,
  medicalStaffOnly,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, severity, description } = req.body;

      const patient = await Patient.findById(id);
      if (!patient || !patient.isActive) {
        return res.status(404).json({
          success: false,
          message: "Patient non trouvé",
        });
      }

      patient.allergies.push({ name, severity, description });
      patient.lastUpdatedBy = req.user.id;
      await patient.save();

      res.json({
        success: true,
        message: "Allergie ajoutée avec succès",
        data: { allergies: patient.allergies },
      });
    } catch (error) {
      console.error("Erreur ajout allergie:", error);
      res.status(500).json({
        success: false,
        message: "Erreur interne du serveur",
      });
    }
  }
);


router.post(
  "/:id/medical-history",
  authenticate,
  medicalStaffOnly,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { condition, diagnosedDate, status, notes } = req.body;

      const patient = await Patient.findById(id);
      if (!patient || !patient.isActive) {
        return res.status(404).json({
          success: false,
          message: "Patient non trouvé",
        });
      }

      patient.medicalHistory.push({
        condition,
        diagnosedDate,
        status,
        notes,
      });
      patient.lastUpdatedBy = req.user.id;
      await patient.save();

      res.json({
        success: true,
        message: "Antécédent médical ajouté avec succès",
        data: { medicalHistory: patient.medicalHistory },
      });
    } catch (error) {
      console.error("Erreur ajout antécédent:", error);
      res.status(500).json({
        success: false,
        message: "Erreur interne du serveur",
      });
    }
  }
);

router.post(
  "/:id/medications",
  authenticate,
  authorize("admin", "doctor"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, dosage, frequency, startDate, prescribedBy } = req.body;

      const patient = await Patient.findById(id);
      if (!patient || !patient.isActive) {
        return res.status(404).json({
          success: false,
          message: "Patient non trouvé",
        });
      }

      patient.currentMedications.push({
        name,
        dosage,
        frequency,
        startDate: startDate || new Date(),
        prescribedBy: prescribedBy || req.user.getFullName(),
      });
      patient.lastUpdatedBy = req.user.id;
      await patient.save();

      res.json({
        success: true,
        message: "Médicament ajouté avec succès",
        data: { currentMedications: patient.currentMedications },
      });
    } catch (error) {
      console.error("Erreur ajout médicament:", error);
      res.status(500).json({
        success: false,
        message: "Erreur interne du serveur",
      });
    }
  }
);


router.delete(
  "/:id/allergies/:allergyId",
  authenticate,
  medicalStaffOnly,
  async (req, res) => {
    try {
      const { id, allergyId } = req.params;

      const patient = await Patient.findById(id);
      if (!patient || !patient.isActive) {
        return res.status(404).json({
          success: false,
          message: "Patient non trouvé",
        });
      }

      patient.allergies.id(allergyId).remove();
      patient.lastUpdatedBy = req.user.id;
      await patient.save();

      res.json({
        success: true,
        message: "Allergie supprimée avec succès",
      });
    } catch (error) {
      console.error("Erreur suppression allergie:", error);
      res.status(500).json({
        success: false,
        message: "Erreur interne du serveur",
      });
    }
  }
);

export default router;

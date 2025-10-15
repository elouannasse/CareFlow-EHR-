import express from "express";
import {
  createPatient,
  getAllPatients,
  getPatientById,
  searchPatients,
  updatePatient,
  deletePatient,
  getPatientStats,
} from "../controllers/patient.controller.js";
import {
  authenticate,
  authorize,
  medicalStaffOnly,
  patientAccessStaff,
  adminOnly,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

// 📝 Routes CRUD Patients

/**
 * @route   POST /api/patients
 * @desc    Créer un nouveau patient
 * @access  Personnel médical et secrétaires
 */
router.post("/", authenticate, patientAccessStaff, createPatient);

/**
 * @route   GET /api/patients
 * @desc    Obtenir tous les patients (avec pagination et filtres)
 * @access  Personnel médical et secrétaires
 */
router.get("/", authenticate, patientAccessStaff, getAllPatients);

/**
 * @route   POST /api/patients/search
 * @desc    Recherche avancée de patients
 * @access  Personnel médical et secrétaires
 */
router.post("/search", authenticate, patientAccessStaff, searchPatients);

/**
 * @route   GET /api/patients/stats
 * @desc    Obtenir les statistiques des patients
 * @access  Personnel médical et admin
 */
router.get(
  "/stats",
  authenticate,
  authorize("admin", "doctor", "nurse"),
  getPatientStats
);

/**
 * @route   GET /api/patients/:id
 * @desc    Obtenir un patient par ID
 * @access  Personnel médical et secrétaires
 */
router.get("/:id", authenticate, patientAccessStaff, getPatientById);

/**
 * @route   PUT /api/patients/:id
 * @desc    Mettre à jour un patient
 * @access  Personnel médical et secrétaires
 */
router.put("/:id", authenticate, patientAccessStaff, updatePatient);

/**
 * @route   DELETE /api/patients/:id
 * @desc    Supprimer un patient (soft delete)
 * @access  Personnel médical et admin
 */
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "doctor", "nurse"),
  deletePatient
);

// 📋 Routes spécialisées pour les données médicales

/**
 * @route   POST /api/patients/:id/allergies
 * @desc    Ajouter une allergie à un patient
 * @access  Personnel médical seulement
 */
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

/**
 * @route   POST /api/patients/:id/medical-history
 * @desc    Ajouter un antécédent médical à un patient
 * @access  Personnel médical seulement
 */
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

/**
 * @route   POST /api/patients/:id/medications
 * @desc    Ajouter un médicament à un patient
 * @access  Doctors seulement
 */
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

/**
 * @route   DELETE /api/patients/:id/allergies/:allergyId
 * @desc    Supprimer une allergie d'un patient
 * @access  Personnel médical seulement
 */
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

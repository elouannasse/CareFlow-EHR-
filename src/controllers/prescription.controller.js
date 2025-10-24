import Prescription from "../models/Prescription.js";
import Consultation from "../models/Consultation.js";
import User from "../models/User.js"; 
import Joi from "joi"; 

const medicationSchema = Joi.object({
  name: Joi.string().required().trim(),
  dosage: Joi.string().required().trim(), 
  route: Joi.string()
    .valid(
      "Orale",
      "Intraveineuse",
      "Intramusculaire", 
      "Sous-cutanée",
      "Topique",
      "Nasale",
      "Oculaire",
      "Auriculaire",
      "Rectale",
      "Vaginale",
      "Inhalation",
      "Sublinguale"
    )
    .required(),
  frequency: Joi.string().required().trim(),
  duration: Joi.string().required().trim(),
  renewals: Joi.number().min(0).max(12).default(0),
  instructions: Joi.string().optional().trim(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

const createPrescriptionSchema = Joi.object({
  consultationId: Joi.string().required(),
  medications: Joi.array().items(medicationSchema).min(1).required(),
  notes: Joi.string().max(1000).optional().trim(),
  pharmacy: Joi.object({
    name: Joi.string().optional().trim(),
    address: Joi.string().optional().trim(),
    phone: Joi.string().optional().trim(),
  }).optional(),
});

const updatePrescriptionSchema = Joi.object({
  medications: Joi.array().items(medicationSchema).min(1).optional(),
  notes: Joi.string().max(1000).optional().trim(),
  pharmacy: Joi.object({
    name: Joi.string().optional().trim(),
    address: Joi.string().optional().trim(),
    phone: Joi.string().optional().trim(),
  }).optional(),
});

export const createPrescription = async (req, res) => {
  try {
    const { error, value } = createPrescriptionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const { consultationId, medications, notes, pharmacy } = value;

    const consultation = await Consultation.findById(consultationId).populate([
      { path: "patient", select: "firstName lastName email" },
      { path: "doctor", select: "firstName lastName email" },
    ]);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation non trouvée",
      });
    }

    if (consultation.doctor._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message:
          "Vous ne pouvez créer une prescription que pour vos propres consultations",
      });
    }

    const existingPrescription = await Prescription.findOne({
      consultation: consultationId,
    });

    if (existingPrescription) {
      return res.status(409).json({
        success: false,
        message: "Une prescription existe déjà pour cette consultation",
        prescriptionId: existingPrescription._id,
      });
    }

    const prescriptionData = {
      consultation: consultationId,
      patient: consultation.patient._id,
      doctor: consultation.doctor._id,
      medications,
      notes: notes || "",
      pharmacy: pharmacy || {},
    };

    const newPrescription = await Prescription.create(prescriptionData);

    await newPrescription.populate([
      { path: "consultation", select: "date diagnosis" },
      { path: "patient", select: "firstName lastName email dateOfBirth" },
      { path: "doctor", select: "firstName lastName email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Prescription créée avec succès",
      data: {
        prescription: newPrescription,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la création de la prescription:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const getAllPrescriptions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { isActive: true };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.patient) {
      filter.patient = req.query.patient;
    }

    if (req.query.doctor) {
      filter.doctor = req.query.doctor;
    }

    if (req.user.role === "patient") {
      filter.patient = req.user.id;
    } else if (req.user.role === "doctor") {
      filter.doctor = req.user.id;
    }

    const prescriptions = await Prescription.find(filter)
      .populate([
        { path: "patient", select: "firstName lastName email" },
        { path: "doctor", select: "firstName lastName email" },
        { path: "consultation", select: "date diagnosis" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Prescription.countDocuments(filter);

    res.json({
      success: true,
      data: {
        prescriptions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des prescriptions:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id).populate([
      { path: "patient", select: "firstName lastName email dateOfBirth" },
      { path: "doctor", select: "firstName lastName email" },
      { path: "consultation", select: "date diagnosis symptoms treatment" },
    ]);

    if (!prescription || !prescription.isActive) {
      return res.status(404).json({
        success: false,
        message: "Prescription non trouvée",
      });
    }

    if (
      req.user.role === "patient" &&
      prescription.patient._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé à cette prescription",
      });
    }

    if (
      req.user.role === "doctor" &&
      prescription.doctor._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé à cette prescription",
      });
    }

    res.json({
      success: true,
      data: {
        prescription,
        summary: {
          totalMedications: prescription.getTotalMedications(),
          activeMedications: prescription.getActiveMedications().length,
          isExpired: prescription.isExpired(),
          canBeModified: prescription.canBeModified(),
          canBeSigned: prescription.canBeSigned(),
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la prescription:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const updatePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = updatePrescriptionSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const prescription = await Prescription.findById(id);

    if (!prescription || !prescription.isActive) {
      return res.status(404).json({
        success: false,
        message: "Prescription non trouvée",
      });
    }

    if (prescription.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez modifier que vos propres prescriptions",
      });
    }

    if (!prescription.canBeModified()) {
      return res.status(400).json({
        success: false,
        message: "Cette prescription ne peut plus être modifiée",
        currentStatus: prescription.status,
      });
    }

    Object.assign(prescription, value);
    await prescription.save();

    await prescription.populate([
      { path: "patient", select: "firstName lastName email" },
      { path: "doctor", select: "firstName lastName email" },
      { path: "consultation", select: "date diagnosis" },
    ]);

    res.json({
      success: true,
      message: "Prescription mise à jour avec succès",
      data: { prescription },
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la prescription:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const signPrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id);

    if (!prescription || !prescription.isActive) {
      return res.status(404).json({
        success: false,
        message: "Prescription non trouvée",
      });
    }

    if (prescription.doctor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez signer que vos propres prescriptions",
      });
    }

    if (!prescription.canBeSigned()) {
      return res.status(400).json({
        success: false,
        message: "Cette prescription ne peut pas être signée",
        reason:
          prescription.medications.length === 0
            ? "Aucun médicament"
            : "Statut invalide",
      });
    }

    prescription.status = "signed";
    await prescription.save();

    await prescription.populate([
      { path: "patient", select: "firstName lastName email" },
      { path: "doctor", select: "firstName lastName email" },
    ]);

    res.json({
      success: true,
      message: "Prescription signée avec succès",
      data: {
        prescription,
        signedAt: prescription.signedAt,
        validUntil: prescription.validUntil,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la signature de la prescription:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const getPatientPrescriptions = async (req, res) => {
  try {
    const { patientId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if (req.user.role === "patient" && req.user.id !== patientId) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé aux prescriptions de ce patient",
      });
    }

    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient non trouvé",
      });
    }

    const filter = { patient: patientId, isActive: true };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const prescriptions = await Prescription.find(filter)
      .populate([
        { path: "doctor", select: "firstName lastName email" },
        { path: "consultation", select: "date diagnosis" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Prescription.countDocuments(filter);

    res.json({
      success: true,
      data: {
        patient: {
          id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          email: patient.email,
        },
        prescriptions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      },
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des prescriptions du patient:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const deletePrescription = async (req, res) => {
  try {
    const { id } = req.params;

    const prescription = await Prescription.findById(id);

    if (!prescription || !prescription.isActive) {
      return res.status(404).json({
        success: false,
        message: "Prescription non trouvée",
      });
    }

    if (
      prescription.doctor.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Permission insuffisante pour supprimer cette prescription",
      });
    }

    if (prescription.status !== "draft") {
      return res.status(400).json({
        success: false,
        message:
          "Seules les prescriptions en brouillon peuvent être supprimées",
      });
    }

    prescription.isActive = false;
    await prescription.save();

    res.json({
      success: true,
      message: "Prescription supprimée avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la prescription:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};
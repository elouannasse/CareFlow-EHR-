import Pharmacy from "../models/Pharmacy.js";
import Prescription from "../models/Prescription.js";
import Joi from "joi";

export const createPharmacy = async (req, res) => {
  try {
    const pharmacy = new Pharmacy(req.body);
    await pharmacy.save();
    res.status(201).json({
      success: true,
      message: "Pharmacie créée avec succès",
      data: pharmacy,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

export const getAllPharmacies = async (req, res) => {
  try {
    const pharmacies = await Pharmacy.find({ isActive: true });
    res.status(200).json({
      success: true,
      data: pharmacies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

export const assignPrescriptionToPharmacy = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { pharmacyId } = req.body;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription non trouvée",
      });
    }

    if (prescription.status !== "signed") {
      return res.status(400).json({
        success: false,
        message: "Seules les prescriptions signées peuvent être assignées",
        currentStatus: prescription.status,
      });
    }

    prescription.pharmacyId = pharmacyId;
    prescription.status = "assigned";
    await prescription.save();

    res.status(200).json({
      success: true,
      message: "Prescription assignée avec succès",
      data: prescription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

export const pharmacistUpdateStatus = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { status } = req.body;

    const prescription = await Prescription.findById(prescriptionId);
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription non trouvée",
      });
    }

    const validStatuses = ["preparing", "ready", "delivered", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Statut invalide",
        validStatuses,
      });
    }

    prescription.status = status;
    await prescription.save();

    res.status(200).json({
      success: true,
      message: "Statut mis à jour avec succès",
      data: prescription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: error.message,
    });
  }
};

export const getPharmacyPrescriptions = async (req, res) => {
  try {
    const { pharmacyId } = req.params;
    const { page = 1, limit = 10, status = "assigned,preparing" } = req.query;

    // Vérifier que la pharmacie existe
    const pharmacy = await Pharmacy.findOne({
      _id: pharmacyId,
      isActive: true,
    });

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacie non trouvée",
      });
    }

    // Construire les filtres de statut
    const statusArray = status.split(",").map((s) => s.trim());
    const validStatuses = ["assigned", "preparing", "ready", "delivered"];
    const filteredStatuses = statusArray.filter((s) =>
      validStatuses.includes(s)
    );

    if (filteredStatuses.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Statuts invalides",
        validStatuses,
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les prescriptions avec populations
    const prescriptions = await Prescription.find({
      pharmacyId: pharmacyId,
      status: { $in: filteredStatuses },
      isActive: true,
    })
      .populate("patient", "firstName lastName phone dateOfBirth")
      .populate("doctor", "firstName lastName specialization")
      .populate("consultation", "date diagnosis")
      .sort({ assignedAt: -1, createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Compter le total pour la pagination
    const totalPrescriptions = await Prescription.countDocuments({
      pharmacyId: pharmacyId,
      status: { $in: filteredStatuses },
      isActive: true,
    });

    const totalPages = Math.ceil(totalPrescriptions / parseInt(limit));

    // Formater les données pour la réponse
    const formattedPrescriptions = prescriptions.map((prescription) => ({
      id: prescription._id,
      prescriptionNumber: prescription.prescriptionNumber,
      status: prescription.status,
      statusText: getStatusText(prescription.status),
      patient: {
        name: `${prescription.patient?.firstName || ""} ${
          prescription.patient?.lastName || ""
        }`.trim(),
        phone: prescription.patient?.phone,
        dateOfBirth: prescription.patient?.dateOfBirth,
      },
      doctor: {
        name: `${prescription.doctor?.firstName || ""} ${
          prescription.doctor?.lastName || ""
        }`.trim(),
        specialization: prescription.doctor?.specialization,
      },
      consultation: {
        date: prescription.consultation?.date,
        diagnosis: prescription.consultation?.diagnosis,
      },
      medications: prescription.medications.map((med) => ({
        name: med.name,
        dosage: med.dosage,
        route: med.route,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
      })),
      dates: {
        createdAt: prescription.createdAt,
        signedAt: prescription.signedAt,
        assignedAt: prescription.assignedAt,
        preparingStartedAt: prescription.preparingStartedAt,
        readyAt: prescription.readyAt,
        deliveredAt: prescription.deliveredAt,
      },
      notes: prescription.notes,
      pharmacyNotes: prescription.pharmacyNotes,
      validUntil: prescription.validUntil,
    }));

    res.status(200).json({
      success: true,
      data: formattedPrescriptions,
      pharmacy: {
        id: pharmacy._id,
        name: pharmacy.name,
        pharmacyCode: pharmacy.pharmacyCode,
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPrescriptions,
        limit: parseInt(limit),
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
      filters: {
        statusesIncluded: filteredStatuses,
      },
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des prescriptions de la pharmacie:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération des prescriptions",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Fonction utilitaire pour les messages de statut
const getStatusText = (status) => {
  const statusMap = {
    draft: "Brouillon",
    signed: "Signée",
    assigned: "Assignée",
    preparing: "En préparation",
    ready: "Prête",
    delivered: "Délivrée",
    rejected: "Rejetée",
  };
  return statusMap[status] || status;
};

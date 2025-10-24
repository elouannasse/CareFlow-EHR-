import Patient from "../models/Patient.js";
import Joi from "joi";

const createPatientSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  dateOfBirth: Joi.date().required(),
  gender: Joi.string().valid("M", "F", "Autre").required(),
  phoneNumber: Joi.string().required(),
  email: Joi.string().email().required(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().default("Maroc"),
  }).required(),
  emergencyContact: Joi.object({
    name: Joi.string().required(),
    relationship: Joi.string().required(),
    phoneNumber: Joi.string().required(),
  }).required(),
  bloodType: Joi.string()
    .valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Inconnu")
    .default("Inconnu"),
  allergies: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        severity: Joi.string()
          .valid("Légère", "Modérée", "Sévère", "Inconnue")
          .default("Inconnue"),
        description: Joi.string().optional(),
      })
    )
    .default([]),
  medicalHistory: Joi.array()
    .items(
      Joi.object({
        condition: Joi.string().required(),
        diagnosedDate: Joi.date().optional(),
        status: Joi.string()
          .valid("Actif", "Résolu", "Chronique", "En traitement")
          .default("Actif"),
        notes: Joi.string().optional(),
      })
    )
    .default([]),
  currentMedications: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        dosage: Joi.string().required(),
        frequency: Joi.string().required(),
        startDate: Joi.date().default(Date.now),
        prescribedBy: Joi.string().optional(),
      })
    )
    .default([]),
  insurance: Joi.object({
    provider: Joi.string().optional(),
    policyNumber: Joi.string().optional(),
    groupNumber: Joi.string().optional(),
    validUntil: Joi.date().optional(),
  }).optional(),
  notes: Joi.string().max(1000).optional(),
});

const updatePatientSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  dateOfBirth: Joi.date().optional(),
  gender: Joi.string().valid("M", "F", "Autre").optional(),
  phoneNumber: Joi.string().optional(),
  email: Joi.string().email().optional(),
  address: Joi.object({
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    country: Joi.string().optional(),
  }).optional(),
  emergencyContact: Joi.object({
    name: Joi.string().optional(),
    relationship: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
  }).optional(),
  bloodType: Joi.string()
    .valid("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Inconnu")
    .optional(),
  allergies: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        severity: Joi.string()
          .valid("Légère", "Modérée", "Sévère", "Inconnue")
          .default("Inconnue"),
        description: Joi.string().optional(),
      })
    )
    .optional(),
  medicalHistory: Joi.array()
    .items(
      Joi.object({
        condition: Joi.string().required(),
        diagnosedDate: Joi.date().optional(),
        status: Joi.string()
          .valid("Actif", "Résolu", "Chronique", "En traitement")
          .default("Actif"),
        notes: Joi.string().optional(),
      })
    )
    .optional(),
  currentMedications: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        dosage: Joi.string().required(),
        frequency: Joi.string().required(),
        startDate: Joi.date().optional(),
        prescribedBy: Joi.string().optional(),
      })
    )
    .optional(),
  insurance: Joi.object({
    provider: Joi.string().optional(),
    policyNumber: Joi.string().optional(),
    groupNumber: Joi.string().optional(),
    validUntil: Joi.date().optional(),
  }).optional(),
  notes: Joi.string().max(1000).optional(),
});

export const createPatient = async (req, res) => {
  
  try {
     
    const { error, value } = createPatientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const existingPatient = await Patient.findOne({ email: value.email });
    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: "Un patient avec cet email existe déjà",
      });
    }

    const patient = new Patient({
      ...value,
      createdBy: req.user.id,
    });

    await patient.save();

    await patient.populate("createdBy", "firstName lastName email role");

    res.status(201).json({
      success: true,
      message: "Patient créé avec succès",
      data: { patient },
    });
  } catch (error) {
    console.error("Erreur création patient:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const getAllPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = { isActive: true };

    if (req.query.gender) filters.gender = req.query.gender;
    if (req.query.bloodType) filters.bloodType = req.query.bloodType;
    if (req.query.minAge || req.query.maxAge) {
      const today = new Date();
      if (req.query.maxAge) {
        const minDate = new Date(
          today.getFullYear() - parseInt(req.query.maxAge),
          today.getMonth(),
          today.getDate()
        );
        filters.dateOfBirth = { $gte: minDate }; 
      }
      if (req.query.minAge) {
        const maxDate = new Date(
          today.getFullYear() - parseInt(req.query.minAge),
          today.getMonth(),
          today.getDate()
        );
        filters.dateOfBirth = { ...filters.dateOfBirth, $lte: maxDate };
      }
    }

    if (req.query.search) {
      filters.$or = [
        { firstName: { $regex: req.query.search, $options: "i" } },
        { lastName: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }

    let sortOptions = { createdAt: -1 };
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
      sortOptions = { [sortField]: sortOrder };
    }

    const total = await Patient.countDocuments(filters);
    const patients = await Patient.find(filters)
      .populate("createdBy", "firstName lastName email role")
      .populate("lastUpdatedBy", "firstName lastName email role")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const patientsWithAge = patients.map((patient) => ({
      ...patient.toObject(),
      age: patient.getAge(),
    }));

    res.json({
      success: true,
      data: {
        patients: patientsWithAge,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalPatients: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Erreur récupération patients:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id)
      .populate("createdBy", "firstName lastName email role")
      .populate("lastUpdatedBy", "firstName lastName email role");

    if (!patient || !patient.isActive) {
      return res.status(404).json({
        success: false,
        message: "Patient non trouvé",
      });
    }

    const patientWithAge = {
      ...patient.toObject(),
      age: patient.getAge(),
    };

    res.json({
      success: true,
      data: { patient: patientWithAge },
    });
  } catch (error) {
    console.error("Erreur récupération patient:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const searchPatients = async (req, res) => {
  try {
    const { query, filters = {} } = req.body;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let searchFilters = { isActive: true };

    if (query) {
      searchFilters.$text = { $search: query };
    }

    if (filters.gender) searchFilters.gender = filters.gender;
    if (filters.bloodType) searchFilters.bloodType = filters.bloodType;
    if (filters.city)
      searchFilters["address.city"] = { $regex: filters.city, $options: "i" };

    if (filters.allergy) {
      searchFilters["allergies.name"] = {
        $regex: filters.allergy,
        $options: "i",
      };
    }

    if (filters.condition) {
      searchFilters["medicalHistory.condition"] = {
        $regex: filters.condition,
        $options: "i",
      };
    }

    const total = await Patient.countDocuments(searchFilters);
    const patients = await Patient.find(searchFilters)
      .populate("createdBy", "firstName lastName email role")
      .sort(query ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const patientsWithAge = patients.map((patient) => ({
      ...patient.toObject(),
      age: patient.getAge(),
    }));

    res.json({
      success: true,
      data: {
        patients: patientsWithAge,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalResults: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Erreur recherche patients:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const { error, value } = updatePatientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Données invalides",
        errors: error.details.map((detail) => detail.message),
      });
    }

    const patient = await Patient.findById(id);
    if (!patient || !patient.isActive) {
      return res.status(404).json({
        success: false,
        message: "Patient non trouvé",
      });
    }

    if (value.email && value.email !== patient.email) {
      const existingPatient = await Patient.findOne({
        email: value.email,
        _id: { $ne: id },
        isActive: true,
      });
      if (existingPatient) {
        return res.status(409).json({
          success: false,
          message: "Cet email est déjà utilisé par un autre patient",
        });
      }
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      {
        ...value,
        lastUpdatedBy: req.user.id,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("createdBy lastUpdatedBy", "firstName lastName email role");

    res.json({
      success: true,
      message: "Patient mis à jour avec succès",
      data: {
        patient: {
          ...updatedPatient.toObject(),
          age: updatedPatient.getAge(),
        },
      },
    });
  } catch (error) {
    console.error("Erreur mise à jour patient:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id);
    if (!patient || !patient.isActive) {
      return res.status(404).json({
        success: false,
        message: "Patient non trouvé",
      });
    }

    patient.isActive = false;
    patient.lastUpdatedBy = req.user.id;
    await patient.save();

    res.json({
      success: true,
      message: "Patient supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression patient:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const getPatientStats = async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments({ isActive: true });

    const genderStats = await Patient.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$gender", count: { $sum: 1 } } },
    ]);

    const bloodTypeStats = await Patient.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$bloodType", count: { $sum: 1 } } },
    ]);

    const ageStats = await Patient.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          age: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), "$dateOfBirth"] },
                365.25 * 24 * 60 * 60 * 1000,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ["$age", 18] }, then: "0-17" },
                { case: { $lt: ["$age", 35] }, then: "18-34" },
                { case: { $lt: ["$age", 55] }, then: "35-54" },
                { case: { $lt: ["$age", 75] }, then: "55-74" },
              ],
              default: "75+",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        total: totalPatients,
        byGender: genderStats,
        byBloodType: bloodTypeStats,
        byAgeGroup: ageStats,
      },
    });
  } catch (error) {
    console.error("Erreur statistiques patients:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
};

export const getPatientProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "L'ID du patient est obligatoire",
      });
    }

    const patient = await Patient.findById(id).populate({
      path: "createdBy lastUpdatedBy",
      select: "firstName lastName email",
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient non trouvé",
      });
    }

    const { default: Appointment } = await import("../models/Appointment.js");

    const appointments = await Appointment.find({
      patient: id,
    })
      .populate({
        path: "doctor",
        select: "firstName lastName email role",
      })
      .sort({ startTime: -1 });

    const now = new Date();
    const upcomingAppointments = appointments.filter(
      (apt) => new Date(apt.startTime) >= now
    );
    const pastAppointments = appointments.filter(
      (apt) => new Date(apt.startTime) < now
    );

    res.status(200).json({
      success: true,
      message: "Profil patient récupéré avec succès",
      data: {
        patient: {
          id: patient._id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          fullName: `${patient.firstName} ${patient.lastName}`,
          email: patient.email,
          phoneNumber: patient.phoneNumber,
          dateOfBirth: patient.dateOfBirth,
          age: patient.age,
          gender: patient.gender,
          bloodType: patient.bloodType,
          address: patient.address,
          emergencyContact: patient.emergencyContact,
          allergies: patient.allergies,
          medications: patient.medications,
          medicalHistory: patient.medicalHistory,
          insurance: patient.insurance,
          isActive: patient.isActive,
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt,
          createdBy: patient.createdBy,
          lastUpdatedBy: patient.lastUpdatedBy,
        },
        appointments: {
          total: appointments.length,
          upcoming: {
            count: upcomingAppointments.length,
            list: upcomingAppointments,
          },
          past: {
            count: pastAppointments.length,
            list: pastAppointments,
          },
        },
        summary: {
          totalAppointments: appointments.length,
          upcomingAppointments: upcomingAppointments.length,
          pastAppointments: pastAppointments.length,
          lastAppointment: appointments.length > 0 ? appointments[0] : null,
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du profil patient:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export default {
  createPatient,
  getAllPatients,
  getPatientById,
  searchPatients,
  updatePatient,
  deletePatient,
  getPatientStats,
  getPatientProfile,
};

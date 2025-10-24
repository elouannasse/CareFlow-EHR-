import Consultation from "../models/Consultation.js";
import Appointment from "../models/Appointment.js";

export const createConsultation = async (req, res) => {
  try {
    const {
      appointmentId,
      diagnosis,
      symptoms,
      treatment,
      medicalNotes, 
      vitalSigns, 
      labTests,
      followUpDate,
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: "L'ID du rendez-vous est obligatoire",
      });
    }

    const appointment = await Appointment.findById(appointmentId).populate([
      { path: "patient", select: "firstName lastName email" },
      { path: "doctor", select: "firstName lastName email" },
    ]);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Rendez-vous non trouve",
      });
    }

    if (appointment.status !== "completed") {
      return res.status(400).json({
        success: false,
        message:
          "Le rendez-vous doit être marqué comme complété avant de créer une consultation",
        currentStatus: appointment.status,
      });
    }

    if (appointment.doctor._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message:
          "Vous ne pouvez créer une consultation que pour vos propres rendez-vous",
      });
    }

    const existingConsultation = await Consultation.findOne({
      appointment: appointmentId,
    });

    if (existingConsultation) {
      return res.status(409).json({
        success: false,
        message: "Une consultation existe déjà pour ce rendez-vous",
        consultationId: existingConsultation._id,
      });
    }

    const consultationData = {
      appointment: appointmentId,
      patient: appointment.patient._id,
      doctor: appointment.doctor._id,
      diagnosis: diagnosis || "",
      symptoms: symptoms || "",
      treatment: treatment || "",
      medicalNotes: medicalNotes || "",
    };

    if (vitalSigns) {
      consultationData.vitalSigns = {
        bloodPressure: vitalSigns.bloodPressure || null,
        temperature: vitalSigns.temperature || null,
        heartRate: vitalSigns.heartRate || null,
        weight: vitalSigns.weight || null,
        height: vitalSigns.height || null,
      };
    }

    if (labTests && Array.isArray(labTests)) {
      consultationData.labTests = labTests;
    }

    if (followUpDate) {
      consultationData.followUpDate = new Date(followUpDate);
    }

    const newConsultation = await Consultation.create(consultationData);

    await newConsultation.populate([
      { path: "appointment", select: "startTime endTime reason" },
      { path: "patient", select: "firstName lastName email dateOfBirth" },
      { path: "doctor", select: "firstName lastName email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Consultation créée avec succès",
      data: {
        consultation: {
          id: newConsultation._id,
          appointment: newConsultation.appointment,
          patient: newConsultation.patient,
          doctor: newConsultation.doctor,
          date: newConsultation.date,
          diagnosis: newConsultation.diagnosis,
          symptoms: newConsultation.symptoms,
          treatment: newConsultation.treatment,
          medicalNotes: newConsultation.medicalNotes,
          vitalSigns: newConsultation.vitalSigns,
          labTests: newConsultation.labTests,
          followUpDate: newConsultation.followUpDate,
          bmi: newConsultation.calculateBMI(), 
          needsFollowUp: newConsultation.needsFollowUp(),
          createdAt: newConsultation.createdAt,
          updatedAt: newConsultation.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors de la création de la consultation:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const getConsultation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "L'ID de la consultation est obligatoire",
      });
    }

    const consultation = await Consultation.findById(id).populate([
      {
        path: "appointment",
        select: "startTime endTime reason status",
      },
      {
        path: "patient",
        select: "firstName lastName email dateOfBirth phoneNumber",
      },
      {
        path: "doctor",
        select: "firstName lastName email role",
      },
    ]);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: "Consultation non trouvée",
      });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    let hasAccess = false;

    if (userRole === "admin") {
      hasAccess = true;
    } else if (userRole === "doctor") {
      hasAccess = consultation.doctor._id.toString() === userId;
    } else if (userRole === "patient") {
      hasAccess = consultation.patient._id.toString() === userId;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé",
        details: "Vous ne pouvez consulter que vos propres consultations",
      });
    }

    res.status(200).json({
      success: true,
      message: "Consultation récupérée avec succès",
      data: {
        consultation: {
          id: consultation._id,
          appointment: consultation.appointment,
          patient: consultation.patient,
          doctor: consultation.doctor,
          date: consultation.date,
          diagnosis: consultation.diagnosis,
          symptoms: consultation.symptoms,
          treatment: consultation.treatment,
          medicalNotes: consultation.medicalNotes,
          vitalSigns: consultation.vitalSigns,
          prescriptions: consultation.prescriptions,
          labTests: consultation.labTests,
          followUpDate: consultation.followUpDate,
          attachments: consultation.attachments,
          bmi: consultation.calculateBMI(),
          needsFollowUp: consultation.needsFollowUp(),
          summary: consultation.getSummary(),
          createdAt: consultation.createdAt,
          updatedAt: consultation.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la consultation:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const updateConsultation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      diagnosis,
      symptoms,
      treatment,
      medicalNotes,
      vitalSigns,
      labTests,
      followUpDate,
    } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "L'ID de la consultation est obligatoire",
      });
    }

    const consultation = await Consultation.findById(id).populate([
      {
        path: "appointment",
        select: "startTime endTime reason status",
      },
      {
        path: "patient",
        select: "firstName lastName email dateOfBirth phoneNumber",
      },
      {
        path: "doctor",
        select: "firstName lastName email role",
      },
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
        message: "Vous ne pouvez modifier que vos propres consultations",
      });
    }

    const updateData = {};

    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (symptoms !== undefined) updateData.symptoms = symptoms;
    if (treatment !== undefined) updateData.treatment = treatment;
    if (medicalNotes !== undefined) updateData.medicalNotes = medicalNotes;

    if (vitalSigns) {
      updateData.vitalSigns = {
        bloodPressure:
          vitalSigns.bloodPressure || consultation.vitalSigns?.bloodPressure,
        temperature:
          vitalSigns.temperature || consultation.vitalSigns?.temperature,
        heartRate: vitalSigns.heartRate || consultation.vitalSigns?.heartRate,
        weight: vitalSigns.weight || consultation.vitalSigns?.weight,
        height: vitalSigns.height || consultation.vitalSigns?.height,
      };
    }

    if (labTests !== undefined) {
      updateData.labTests = Array.isArray(labTests) ? labTests : [];
    }

    if (followUpDate !== undefined) {
      updateData.followUpDate = followUpDate ? new Date(followUpDate) : null;
    }

    const updatedConsultation = await Consultation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      {
        path: "appointment",
        select: "startTime endTime reason status",
      },
      {
        path: "patient",
        select: "firstName lastName email dateOfBirth phoneNumber",
      },
      {
        path: "doctor",
        select: "firstName lastName email role",
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Consultation mise à jour avec succès",
      data: {
        consultation: {
          id: updatedConsultation._id,
          appointment: updatedConsultation.appointment,
          patient: updatedConsultation.patient,
          doctor: updatedConsultation.doctor,
          date: updatedConsultation.date,
          diagnosis: updatedConsultation.diagnosis,
          symptoms: updatedConsultation.symptoms,
          treatment: updatedConsultation.treatment,
          medicalNotes: updatedConsultation.medicalNotes,
          vitalSigns: updatedConsultation.vitalSigns,
          prescriptions: updatedConsultation.prescriptions,
          labTests: updatedConsultation.labTests,
          followUpDate: updatedConsultation.followUpDate,
          attachments: updatedConsultation.attachments,
          bmi: updatedConsultation.calculateBMI(),
          needsFollowUp: updatedConsultation.needsFollowUp(),
          summary: updatedConsultation.getSummary(),
          createdAt: updatedConsultation.createdAt,
          updatedAt: updatedConsultation.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors de la modification de la consultation:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const getPatientConsultations = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "L'ID du patient est obligatoire",
      });
    }

    const userRole = req.user.role;
    const userId = req.user.id;

    let hasAccess = false;

    if (userRole === "admin") {
      hasAccess = true;
    } else if (userRole === "patient") {
      hasAccess = patientId === userId;
    } else if (userRole === "doctor") {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé",
        details: "Vous ne pouvez consulter que vos propres consultations",
      });
    }

    let consultations = await Consultation.find({ patient: patientId })
      .sort({ date: -1 })
      .populate([
        {
          path: "appointment",
          select: "startTime endTime reason status",
        },
        {
          path: "patient",
          select: "firstName lastName email dateOfBirth",
        },
        {
          path: "doctor",
          select: "firstName lastName email role",
        },
      ]);

    if (userRole === "doctor") {
      consultations = consultations.filter(
        (consultation) => consultation.doctor._id.toString() === userId
      );
    }

    res.status(200).json({
      success: true,
      message: "Consultations du patient récupérées avec succès",
      data: {
        patientId,
        totalConsultations: consultations.length,
        consultations: consultations.map((consultation) => ({
          id: consultation._id,
          appointment: consultation.appointment,
          patient: consultation.patient,
          doctor: consultation.doctor,
          date: consultation.date,
          diagnosis: consultation.diagnosis,
          symptoms: consultation.symptoms,
          treatment: consultation.treatment,
          medicalNotes: consultation.medicalNotes,
          vitalSigns: consultation.vitalSigns,
          labTests: consultation.labTests,
          followUpDate: consultation.followUpDate,
          bmi: consultation.calculateBMI(),
          needsFollowUp: consultation.needsFollowUp(),
          summary: consultation.getSummary(),
          createdAt: consultation.createdAt,
          updatedAt: consultation.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des consultations du patient:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

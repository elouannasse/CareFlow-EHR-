import Appointment from "../models/Appointment.js";
import User from "../models/User.js";

export const createAppointment = async (req, res) => {
  try {
    const { patient, doctor, startTime, endTime, reason } = req.body;

    if (!patient || !doctor || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message:
          "Patient, médecin, heure de début et heure de fin sont obligatoires", 
      });
    }

    const patientExists = await User.findById(patient);
    if (!patientExists) {
      return res.status(404).json({
        success: false,
        message: "Patient non trouvé",
      });
    }

    const doctorExists = await User.findById(doctor);
    if (!doctorExists) {
      return res.status(404).json({
        success: false,
        message: "Médecin non trouvé",
      });
    }

    if (doctorExists.role !== "doctor") {
      return res.status(400).json({
        success: false,
        message: "L'utilisateur sélectionné n'est pas un médecin",
      });
    }

    const appointmentStartTime = new Date(startTime);
    const appointmentEndTime = new Date(endTime);

    if (appointmentStartTime >= appointmentEndTime) {
      return res.status(400).json({
        success: false,
        message: "L'heure de fin doit être après l'heure de début",
      });
    }

    const conflictingAppointment = await Appointment.findOne({
      doctor: doctor,
      status: { $in: ["scheduled", "confirmed"] },
      $or: [
        {
          startTime: { $lte: appointmentStartTime },
          endTime: { $gt: appointmentStartTime },
        },
        {
          startTime: { $lt: appointmentEndTime },
          endTime: { $gte: appointmentEndTime },
        },
        {
          startTime: { $gte: appointmentStartTime },
          endTime: { $lte: appointmentEndTime },
        },
      ],
    });

    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        message: "Le médecin n'est pas disponible à cette heure",
        conflictTime: {
          start: conflictingAppointment.startTime,
          end: conflictingAppointment.endTime,
        },
      }); 
    }

    const newAppointment = await Appointment.create({
      patient,
      doctor,
      startTime: appointmentStartTime,
      endTime: appointmentEndTime,
      reason: reason || "",
      status: "scheduled",
    });

    await newAppointment.populate([
      { path: "patient", select: "firstName lastName email" },
      { path: "doctor", select: "firstName lastName email" },
    ]);

    res.status(201).json({
      success: true,
      message: "Rendez-vous créé avec succès",
      data: {
        appointment: newAppointment,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la création du rendez-vous:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        message: "L'ID du médecin est obligatoire",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "La date est obligatoire (format: YYYY-MM-DD)",
      });
    }

    const doctor = await User.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Médecin non trouvé",
      });
    }

    if (doctor.role !== "doctor") {
      return res.status(400).json({
        success: false,
        message: "L'utilisateur sélectionné n'est pas un médecin",
      });
    }

    const workStartHour = 8;
    const workEndHour = 18;

    const startOfDay = new Date(`${date}T08:00:00.000Z`);
    const endOfDay = new Date(`${date}T18:00:00.000Z`);
    console.log(startOfDay);

    if (isNaN(startOfDay.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Format de date invalide. Utilisez YYYY-MM-DD",
      });
    }
    const appointments = await Appointment.find({
      doctor: doctorId,
      status: { $in: ["scheduled", "confirmed"] },
      startTime: { $gte: startOfDay },
      endTime: { $lte: endOfDay },
    }).sort({ startTime: 1 });

    const availableSlots = [];
    let currentTime = new Date(startOfDay);

    for (const appointment of appointments) {
      const appointmentStart = new Date(appointment.startTime);

      if (currentTime < appointmentStart) {
        availableSlots.push({
          start: formatTime(currentTime),
          end: formatTime(appointmentStart),
        });
      }

      currentTime = new Date(appointment.endTime);
    }

    if (currentTime < endOfDay) {
      availableSlots.push({
        start: formatTime(currentTime),
        end: formatTime(endOfDay),
      });
    }

    res.status(200).json({
      success: true,
      message: "Disponibilités récupérées avec succès",
      data: {
        doctorId,
        doctorName: `${doctor.firstName} ${doctor.lastName}`,
        date,
        workingHours: {
          start: "08:00",
          end: "18:00",
        },
        availableSlots,
        totalSlotsAvailable: availableSlots.length,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des disponibilités:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, reason, notes, status } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "L'ID du rendez-vous est obligatoire",
      });
    }

    const existingAppointment = await Appointment.findById(id);

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: "Rendez-vous non trouvé",
      });
    }

    if (startTime || endTime) {
      const newStartTime = startTime
        ? new Date(startTime)
        : existingAppointment.startTime;
      const newEndTime = endTime
        ? new Date(endTime)
        : existingAppointment.endTime;

      if (newStartTime >= newEndTime) {
        return res.status(400).json({
          success: false,
          message: "L'heure de fin doit être après l'heure de début",
        });
      }

      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: id },
        doctor: existingAppointment.doctor,
        status: { $in: ["scheduled", "confirmed"] },
        $or: [
          {
            startTime: { $lte: newStartTime },
            endTime: { $gt: newStartTime },
          },

          {
            startTime: { $lt: newEndTime },
            endTime: { $gte: newEndTime },
          },

          {
            startTime: { $gte: newStartTime },
            endTime: { $lte: newEndTime },
          },
        ],
      });

      if (conflictingAppointment) {
        return res.status(409).json({
          success: false,
          message: "Conflit d'horaire",
          details: "Le médecin a déjà un rendez-vous à cette heure",
          conflictTime: {
            start: conflictingAppointment.startTime,
            end: conflictingAppointment.endTime,
          },
        });
      }
    }

    const updateData = {};

    if (startTime) updateData.startTime = new Date(startTime);
    if (endTime) updateData.endTime = new Date(endTime);
    if (reason !== undefined) updateData.reason = reason;
    if (notes !== undefined) updateData.notes = notes;
    if (status) updateData.status = status;

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: "patient", select: "firstName lastName email" },
      { path: "doctor", select: "firstName lastName email" },
    ]);

    res.status(200).json({
      success: true,
      message: "Rendez-vous modifié avec succès",
      data: {
        appointment: updatedAppointment,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la modification du rendez-vous:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "L'ID du rendez-vous est obligatoire",
      });
    }

    const appointment = await Appointment.findById(id).populate([
      { path: "patient", select: "firstName lastName email" },
      { path: "doctor", select: "firstName lastName email" },
    ]);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Rendez-vous non trouvé",
      });
    }

    if (
      req.user.role === "patient" &&
      appointment.patient._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez annuler que vos propres rendez-vous",
      });
    }

    if (appointment.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Ce rendez-vous est déjà annulé",
        data: {
          appointment: {
            id: appointment._id,
            status: appointment.status,
            cancelledAt: appointment.cancelledAt,
            cancellationReason: appointment.cancellationReason,
          },
        },
      });
    }

    appointment.status = "cancelled";

    appointment.cancelledAt = new Date();

    if (reason) {
      appointment.cancellationReason = reason;
    }

    const cancelledAppointment = await appointment.save();

    res.status(200).json({
      success: true,
      message: "Rendez-vous annulé avec succès",
      data: {
        appointment: {
          id: cancelledAppointment._id,
          patient: cancelledAppointment.patient,
          doctor: cancelledAppointment.doctor,
          startTime: cancelledAppointment.startTime,
          endTime: cancelledAppointment.endTime,
          reason: cancelledAppointment.reason,
          status: cancelledAppointment.status,
          cancelledAt: cancelledAppointment.cancelledAt,
          cancellationReason: cancelledAppointment.cancellationReason,
          updatedAt: cancelledAppointment.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'annulation du rendez-vous:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
      error: error.message,
    });
  }
};

function formatTime(date) {
  return date.toTimeString().slice(0, 5);
}

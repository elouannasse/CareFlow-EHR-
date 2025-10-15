import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    // Référence vers le patient
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Le patient est obligatoire"],
    },

    // Référence vers le médecin
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Le médecin est obligatoire"],
    },

    // Date et heure de début du rendez-vous
    startTime: {
      type: Date,
      required: [true, "L'heure de début est obligatoire"],
    },

    // Date et heure de fin du rendez-vous
    endTime: {
      type: Date,
      required: [true, "L'heure de fin est obligatoire"],
    },

    // Motif de la consultation (optionnel)
    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Le motif ne peut pas dépasser 500 caractères"],
    },

    // Notes du médecin (optionnel)
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Les notes ne peuvent pas dépasser 1000 caractères"],
    },

    // Statut du rendez-vous
    status: {
      type: String,
      enum: {
        values: ["scheduled", "confirmed", "completed", "cancelled", "no-show"],
        message:
          "Le statut doit être: scheduled, confirmed, completed, cancelled ou no-show",
      },
      default: "scheduled",
    },

    // Rappel envoyé ou non
    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Ajoute automatiquement createdAt et updatedAt
    timestamps: true,
  }
);

// Index pour améliorer les performances des recherches
appointmentSchema.index({ patient: 1, startTime: 1 });
appointmentSchema.index({ doctor: 1, startTime: 1 });
appointmentSchema.index({ status: 1 });

// Méthode pour vérifier si le rendez-vous est dans le futur
appointmentSchema.methods.isFuture = function () {
  return this.startTime > new Date();
};

// Méthode pour calculer la durée du rendez-vous en minutes
appointmentSchema.methods.getDurationInMinutes = function () {
  return Math.round((this.endTime - this.startTime) / (1000 * 60));
};

// Validation personnalisée : endTime doit être après startTime
appointmentSchema.pre("save", function (next) {
  if (this.endTime <= this.startTime) {
    const error = new Error("L'heure de fin doit être après l'heure de début");
    return next(error);
  }
  next();
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;

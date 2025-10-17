import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Le patient est obligatoire"],
    },

    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Le médecin est obligatoire"],
    },

    startTime: {
      type: Date,
      required: [true, "L'heure de début est obligatoire"],
    },

    endTime: {
      type: Date,
      required: [true, "L'heure de fin est obligatoire"],
    },

    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Le motif ne peut pas dépasser 500 caractères"],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Les notes ne peuvent pas dépasser 1000 caractères"],
    },

    status: {
      type: String,
      enum: {
        values: ["scheduled", "confirmed", "completed", "cancelled", "no-show"],
        message:
          "Le statut doit être: scheduled, confirmed, completed, cancelled ou no-show",
      },
      default: "scheduled",
    },

    reminderSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

appointmentSchema.index({ patient: 1, startTime: 1 });
appointmentSchema.index({ doctor: 1, startTime: 1 });
appointmentSchema.index({ status: 1 });

appointmentSchema.methods.isFuture = function () {
  return this.startTime > new Date();
};

appointmentSchema.methods.getDurationInMinutes = function () {
  return Math.round((this.endTime - this.startTime) / (1000 * 60));
};

appointmentSchema.pre("save", function (next) {
  if (this.endTime <= this.startTime) {
    const error = new Error("L'heure de fin doit être après l'heure de début");
    return next(error);
  }
  next();
});

const Appointment = mongoose.model("Appointment", appointmentSchema);

export default Appointment;

import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: [true, "Le rendez-vous est obligatoire"],
    },

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

    date: {
      type: Date,
      default: Date.now,
    },

    diagnosis: {
      type: String,
      trim: true,
      maxlength: [2000, "Le diagnostic ne peut pas dépasser 2000 caractères"],
    },

    symptoms: {
      type: String,
      trim: true,
      maxlength: [
        1000,
        "Les symptômes ne peuvent pas dépasser 1000 caractères",
      ],
    },

    treatment: {
      type: String,
      trim: true,
      maxlength: [1500, "Le traitement ne peut pas dépasser 1500 caractères"],
    },

    medicalNotes: {
      type: String,
      trim: true,
      maxlength: [
        2000,
        "Les notes médicales ne peuvent pas dépasser 2000 caractères",
      ],
    },

    vitalSigns: {
      bloodPressure: {
        type: String,
        trim: true,
        maxlength: [
          20,
          "La tension artérielle ne peut pas dépasser 20 caractères",
        ],
      },

      temperature: {
        type: Number,
        min: [30, "La température ne peut pas être inférieure à 30°C"],
        max: [50, "La température ne peut pas être supérieure à 50°C"],
      },

      heartRate: {
        type: Number,
        min: [30, "Le rythme cardiaque ne peut pas être inférieur à 30 bpm"],
        max: [250, "Le rythme cardiaque ne peut pas être supérieur à 250 bpm"],
      },

      weight: {
        type: Number,
        min: [0.5, "Le poids ne peut pas être inférieur à 0.5 kg"],
        max: [500, "Le poids ne peut pas être supérieur à 500 kg"],
      },

      height: {
        type: Number,
        min: [30, "La taille ne peut pas être inférieure à 30 cm"],
        max: [300, "La taille ne peut pas être supérieure à 300 cm"],
      },
    },

    prescriptions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Prescription",
      },
    ],

    labTests: [
      {
        type: String,
        trim: true,
        maxlength: [200, "Un examen ne peut pas dépasser 200 caractères"],
      },
    ],

    followUpDate: {
      type: Date,
    },

    attachments: [
      {
        type: String,
        trim: true,
        maxlength: [
          500,
          "Une URL de pièce jointe ne peut pas dépasser 500 caractères",
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

consultationSchema.index({ patient: 1, date: -1 });
consultationSchema.index({ doctor: 1, date: -1 });
consultationSchema.index({ appointment: 1 });
consultationSchema.index({ date: -1 });

consultationSchema.methods.calculateBMI = function () {
  if (this.vitalSigns?.weight && this.vitalSigns?.height) {
    const heightInMeters = this.vitalSigns.height / 100;
    const bmi = this.vitalSigns.weight / (heightInMeters * heightInMeters);
    return Math.round(bmi * 10) / 10;
  }
  return null;
};

consultationSchema.methods.needsFollowUp = function () {
  return this.followUpDate && this.followUpDate > new Date();
};

consultationSchema.methods.getSummary = function () {
  return {
    date: this.date,
    diagnosis: this.diagnosis || "Aucun diagnostic",
    treatment: this.treatment || "Aucun traitement prescrit",
    followUpNeeded: this.needsFollowUp(),
    bmi: this.calculateBMI(),
  };
};

consultationSchema.pre("save", async function (next) {
  if (this.isNew || this.isModified("doctor")) {
    try {
      const User = mongoose.model("User");
      const doctor = await User.findById(this.doctor);

      if (!doctor) {
        return next(new Error("Médecin non trouvé"));
      }

      if (doctor.role !== "doctor") {
        return next(
          new Error("L'utilisateur sélectionné n'est pas un médecin")
        );
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Consultation = mongoose.model("Consultation", consultationSchema);

export default Consultation;

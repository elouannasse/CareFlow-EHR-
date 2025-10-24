import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema(
  {
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
      required: [true, "La consultation est obligatoire"],
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
    prescriptionNumber: {
      type: String,
      unique: true,
    },
    medications: [
      {
        name: {
          type: String,
          required: [true, "Le nom du médicament est obligatoire"],
          trim: true,
        },
        dosage: {
          type: String,
          required: [true, "Le dosage est obligatoire"],
          trim: true,
        },
        route: {
          type: String,
          enum: [
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
            "Sublinguale",
          ],
          required: [true, "La voie d'administration est obligatoire"],
        },
        frequency: {
          type: String,
          required: [true, "La fréquence est obligatoire"],
          trim: true,
        },
        duration: {
          type: String,
          required: [true, "La durée est obligatoire"],
          trim: true,
        },
        renewals: {
          type: Number,
          min: 0,
          max: 12,
          default: 0,
        },
        instructions: {
          type: String,
          trim: true,
        },
        startDate: {
          type: Date,
          default: Date.now,
        },
        endDate: {
          type: Date,
        },
      },
    ],
    status: {
      type: String,
      enum: [
        "draft",
        "signed",
        "assigned",
        "preparing",
        "ready",
        "delivered",
        "rejected",
      ],
      default: "draft",
    },
    notes: {
      type: String,
      maxlength: [1000, "Les notes ne peuvent pas dépasser 1000 caractères"],
      trim: true,
    },
    signedAt: {
      type: Date,
    },
    assignedAt: {
      type: Date,
    },
    preparingStartedAt: {
      type: Date,
    },
    readyAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    pharmacyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
    },
    assignedAt: {
      type: Date,
    },
    processingStartedAt: {
      type: Date,
    },
    pharmacyNotes: {
      type: String,
      maxlength: [
        500,
        "Les notes de la pharmacie ne peuvent pas dépasser 500 caractères",
      ],
      trim: true,
    },
    pharmacy: {
      name: {
        type: String,
        trim: true,
      },
      address: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },
    validUntil: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ doctor: 1, createdAt: -1 });
prescriptionSchema.index({ prescriptionNumber: 1 });
prescriptionSchema.index({ status: 1 });
prescriptionSchema.index({ pharmacyId: 1, assignedAt: -1 });

prescriptionSchema.pre("save", function (next) {
  if (!this.prescriptionNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.prescriptionNumber = `RX${year}${month}${day}${random}`;
  }

  if (this.isModified("status")) {
    const now = new Date();
    switch (this.status) {
      case "signed":
        this.signedAt = now;
        this.validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        break;
      case "assigned":
        this.assignedAt = now;
        break;
      case "preparing":
        this.preparingStartedAt = now;
        break;
      case "ready":
        this.readyAt = now;
        break;
      case "delivered":
        this.deliveredAt = now;
        break;
      case "rejected":
        this.rejectedAt = now;
        break;
    }
  }

  next();
});

prescriptionSchema.methods.canBeModified = function () {
  return this.status === "draft";
};

prescriptionSchema.methods.canBeSigned = function () {
  return this.status === "draft" && this.medications.length > 0;
};

prescriptionSchema.methods.isExpired = function () {
  return this.validUntil && this.validUntil < new Date();
};

prescriptionSchema.methods.getTotalMedications = function () {
  return this.medications.length;
};

prescriptionSchema.methods.getActiveMedications = function () {
  const now = new Date();
  return this.medications.filter((med) => {
    if (!med.endDate) return true;
    return med.endDate > now;
  });
};

prescriptionSchema.virtual("statusText").get(function () {
  const statusMap = {
    draft: "Brouillon",
    signed: "Signée",
    assigned: "Assignée",
    preparing: "En préparation",
    ready: "Prête",
    delivered: "Délivrée",
    rejected: "Rejetée",
  };
  return statusMap[this.status] || this.status;
});

prescriptionSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  },
});

const Prescription = mongoose.model("Prescription", prescriptionSchema);
export default Prescription;

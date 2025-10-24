import mongoose from "mongoose";

const labOrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
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
    consultation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
    },
    laboratory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Laboratory",
    },
    tests: [
      {
        testCode: {
          type: String,
          required: [true, "Le code du test est obligatoire"],
          trim: true,
        },
        testName: {
          type: String,
          required: [true, "Le nom du test est obligatoire"],
          trim: true,
        },
        category: {
          type: String,
          enum: [
            "Hématologie",
            "Biochimie",
            "Immunologie",
            "Microbiologie",
            "Parasitologie",
            "Hormonologie",
            "Toxicologie",
            "Génétique",
            "Anatomie pathologique",
            "Cytologie",
            "Sérologie",
            "Allergie",
            "Coagulation",
            "Urinaire",
            "Cardiaque",
            "Hépatique",
            "Rénal",
            "Lipidique",
            "Diabète",
            "Thyroïde",
            "Autre",
          ],
          required: [true, "La catégorie est obligatoire"],
        },
        specimen: {
          type: {
            type: String,
            enum: [
              "Sang",
              "Urine",
              "Selles",
              "Salive",
              "Expectoration",
              "LCR",
              "Liquide pleural",
              "Liquide ascite",
              "Biopsie",
              "Frottis",
              "Autre",
            ],
            required: true,
          },
          container: {
            type: String,
            enum: [
              "Tube EDTA",
              "Tube héparine",
              "Tube sec",
              "Tube citrate",
              "Flacon stérile",
              "Pot stérile",
              "Lame",
              "Container spécial",
            ],
          },
          volume: String,
          collectionInstructions: String,
        },
        urgency: {
          type: String,
          enum: ["Normal", "Urgent", "STAT", "Programmé"],
          default: "Normal",
        },
        fastingRequired: {
          type: Boolean,
          default: false,
        },
        specialInstructions: String,
        estimatedDuration: String, // e.g., "2-4 heures", "24 heures"
        price: {
          type: Number,
          min: 0,
        },
        status: {
          type: String,
          enum: [
            "ordered",
            "sample_collected",
            "in_progress",
            "completed",
            "reported",
            "cancelled",
          ],
          default: "ordered",
        },
        result: {
          value: mongoose.Schema.Types.Mixed, // Can be string, number, or object
          unit: String,
          referenceRange: String,
          interpretation: String,
          comments: String,
          reportedAt: Date,
          reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        },
        collectedAt: Date,
        processedAt: Date,
        completedAt: Date,
      },
    ],
    status: {
      type: String,
      enum: [
        "pending",
        "ordered",
        "sample_collected",
        "in_progress",
        "partially_completed",
        "completed",
        "reported",
        "cancelled",
      ],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["Low", "Normal", "High", "Urgent", "STAT"],
      default: "Normal",
    },
    clinicalInfo: {
      symptoms: [String],
      diagnosis: String,
      medications: [String],
      allergies: [String],
      relevantHistory: String,
    },
    appointmentDate: Date,
    sampleCollectionDate: Date,
    expectedReportDate: Date,
    actualReportDate: Date,
    totalAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid", "refunded"],
      default: "unpaid",
    },
    notes: {
      type: String,
      maxlength: [1000, "Les notes ne peuvent pas dépasser 1000 caractères"],
      trim: true,
    },
    labNotes: {
      type: String,
      maxlength: [
        1000,
        "Les notes du laboratoire ne peuvent pas dépasser 1000 caractères",
      ],
      trim: true,
    },
    attachments: [
      {
        filename: String,
        url: String,
        type: {
          type: String,
          enum: ["image", "pdf", "document"],
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes pour optimiser les performances
labOrderSchema.index({ patient: 1, createdAt: -1 });
labOrderSchema.index({ doctor: 1, createdAt: -1 });
labOrderSchema.index({ laboratory: 1, status: 1 });
labOrderSchema.index({ orderNumber: 1 });
labOrderSchema.index({ status: 1, priority: 1 });
labOrderSchema.index({ appointmentDate: 1 });

// Génération automatique du numéro d'ordre
labOrderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.orderNumber = `LAB${year}${month}${day}${random}`;
  }

  // Calcul du montant total
  if (this.tests && this.tests.length > 0) {
    this.totalAmount = this.tests.reduce((total, test) => {
      return total + (test.price || 0);
    }, 0);
  }

  // Mise à jour des timestamps en fonction du statut
  if (this.isModified("status")) {
    const now = new Date();
    switch (this.status) {
      case "sample_collected":
        this.sampleCollectionDate = now;
        break;
      case "reported":
        this.actualReportDate = now;
        break;
    }
  }

  next();
});

// Méthodes utilitaires
labOrderSchema.methods.canBeModified = function () {
  return ["pending", "ordered"].includes(this.status);
};

labOrderSchema.methods.canBeCancelled = function () {
  return !["completed", "reported", "cancelled"].includes(this.status);
};

labOrderSchema.methods.getCompletedTests = function () {
  return this.tests.filter((test) => test.status === "completed");
};

labOrderSchema.methods.getPendingTests = function () {
  return this.tests.filter((test) =>
    ["ordered", "sample_collected", "in_progress"].includes(test.status)
  );
};

labOrderSchema.methods.updateOverallStatus = function () {
  const testStatuses = this.tests.map((test) => test.status);

  if (testStatuses.every((status) => status === "completed")) {
    this.status = "completed";
  } else if (testStatuses.some((status) => status === "completed")) {
    this.status = "partially_completed";
  } else if (testStatuses.some((status) => status === "in_progress")) {
    this.status = "in_progress";
  } else if (testStatuses.every((status) => status === "sample_collected")) {
    this.status = "sample_collected";
  }
};

labOrderSchema.methods.calculateEstimatedReportDate = function () {
  if (this.appointmentDate || this.sampleCollectionDate) {
    const baseDate = this.sampleCollectionDate || this.appointmentDate;
    // Par défaut, ajouter 24-48 heures selon l'urgence
    const hoursToAdd =
      this.priority === "STAT" ? 2 : this.priority === "Urgent" ? 6 : 48;
    this.expectedReportDate = new Date(
      baseDate.getTime() + hoursToAdd * 60 * 60 * 1000
    );
  }
};

// Virtual pour le texte du statut
labOrderSchema.virtual("statusText").get(function () {
  const statusMap = {
    pending: "En attente",
    ordered: "Commandé",
    sample_collected: "Échantillon collecté",
    in_progress: "En cours d'analyse",
    partially_completed: "Partiellement terminé",
    completed: "Terminé",
    reported: "Rapport disponible",
    cancelled: "Annulé",
  };
  return statusMap[this.status] || this.status;
});

labOrderSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  },
});

const LabOrder = mongoose.model("LabOrder", labOrderSchema);
export default LabOrder;

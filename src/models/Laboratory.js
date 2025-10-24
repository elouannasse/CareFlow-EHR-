import mongoose from "mongoose";

const laboratorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom du laboratoire est obligatoire"],
      trim: true,
      maxlength: [100, "Le nom ne peut pas dépasser 100 caractères"],
    },
    licenseNumber: {
      type: String,
      required: [true, "Le numéro de licence est obligatoire"],
      unique: true,
      trim: true,
    },
    labCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "Laboratoire général",
        "Laboratoire spécialisé",
        "Laboratoire hospitalier",
        "Laboratoire privé",
        "Centre de diagnostic",
        "Laboratoire de recherche",
      ],
      default: "Laboratoire général",
    },
    contact: {
      email: {
        type: String,
        required: [true, "L'email est obligatoire"],
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Format d'email invalide"],
      },
      phone: {
        type: String,
        required: [true, "Le téléphone est obligatoire"],
        trim: true,
      },
      fax: {
        type: String,
        trim: true,
      },
      website: {
        type: String,
        trim: true,
      },
    },
    address: {
      street: {
        type: String,
        required: [true, "L'adresse est obligatoire"],
        trim: true,
      },
      city: {
        type: String,
        required: [true, "La ville est obligatoire"],
        trim: true,
      },
      zipCode: {
        type: String,
        required: [true, "Le code postal est obligatoire"],
        trim: true,
      },
      region: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
        default: "Maroc",
      },
      coordinates: {
        latitude: {
          type: Number,
          min: -90,
          max: 90,
        },
        longitude: {
          type: Number,
          min: -180,
          max: 180,
        },
      },
    },
    operatingHours: {
      monday: {
        isOpen: { type: Boolean, default: true },
        morning: {
          open: { type: String, default: "08:00" },
          close: { type: String, default: "12:00" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "18:00" },
        },
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        morning: {
          open: { type: String, default: "08:00" },
          close: { type: String, default: "12:00" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "18:00" },
        },
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        morning: {
          open: { type: String, default: "08:00" },
          close: { type: String, default: "12:00" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "18:00" },
        },
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        morning: {
          open: { type: String, default: "08:00" },
          close: { type: String, default: "12:00" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "18:00" },
        },
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        morning: {
          open: { type: String, default: "08:00" },
          close: { type: String, default: "12:00" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "18:00" },
        },
      },
      saturday: {
        isOpen: { type: Boolean, default: true },
        morning: {
          open: { type: String, default: "08:00" },
          close: { type: String, default: "12:00" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "17:00" },
        },
      },
      sunday: {
        isOpen: { type: Boolean, default: false },
        morning: {
          open: { type: String, default: "09:00" },
          close: { type: String, default: "12:00" },
        },
      },
    },
    specialties: [
      {
        type: String,
        enum: [
          "Hématologie",
          "Biochimie clinique",
          "Immunologie",
          "Microbiologie",
          "Parasitologie",
          "Hormonologie",
          "Toxicologie",
          "Génétique médicale",
          "Anatomie pathologique",
          "Cytologie",
          "Sérologie",
          "Tests d'allergie",
          "Coagulation",
          "Analyses urinaires",
          "Marqueurs cardiaques",
          "Tests hépatiques",
          "Tests rénaux",
          "Profil lipidique",
          "Diabète",
          "Fonction thyroïdienne",
          "Tests prénataux",
          "Oncologie moléculaire",
          "Pharmacogénomique",
        ],
      },
    ],
    availableTests: [
      {
        testCode: {
          type: String,
          required: true,
        },
        testName: {
          type: String,
          required: true,
        },
        category: String,
        price: {
          type: Number,
          min: 0,
        },
        duration: String, // "2-4 heures", "24 heures", etc.
        specimen: String,
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    director: {
      name: {
        type: String,
        required: [true, "Le nom du directeur est obligatoire"],
        trim: true,
      },
      licenseNumber: {
        type: String,
        required: [true, "Le numéro de licence du directeur est obligatoire"],
        trim: true,
      },
      specialization: String,
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
    },
    accreditation: {
      accreditingBody: String, // "ISO 15189", "COFRAC", etc.
      certificateNumber: String,
      validFrom: Date,
      validUntil: Date,
      isValid: {
        type: Boolean,
        default: true,
      },
    },
    partnershipDetails: {
      contractType: {
        type: String,
        enum: ["Standard", "Premium", "Exclusif", "Ponctuel"],
        default: "Standard",
      },
      commission: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      status: {
        type: String,
        enum: ["active", "inactive", "suspended", "pending"],
        default: "active",
      },
      contractStartDate: Date,
      contractEndDate: Date,
    },
    services: [
      {
        type: String,
        enum: [
          "Analyses de routine",
          "Analyses urgentes",
          "Prélèvement à domicile",
          "Résultats en ligne",
          "Interprétation médicale",
          "Conseil scientifique",
          "Formation continue",
          "Contrôle qualité",
          "Recherche clinique",
          "Télémédecine",
        ],
      },
    ],
    equipment: [
      {
        name: String,
        type: String,
        manufacturer: String,
        model: String,
        acquisitionDate: Date,
        maintenanceDate: Date,
        isOperational: {
          type: Boolean,
          default: true,
        },
      },
    ],
    qualityMetrics: {
      turnaroundTime: {
        routine: Number, // in hours
        urgent: Number, // in hours
        stat: Number, // in hours
      },
      accuracyRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 99.5,
      },
      customerSatisfaction: {
        type: Number,
        min: 0,
        max: 5,
        default: 4.5,
      },
      onTimeDelivery: {
        type: Number,
        min: 0,
        max: 100,
        default: 95,
      },
    },
    statistics: {
      totalOrders: {
        type: Number,
        default: 0,
      },
      completedOrders: {
        type: Number,
        default: 0,
      },
      averageProcessingTime: Number, // in hours
      lastMonthOrders: {
        type: Number,
        default: 0,
      },
    },
    notes: {
      type: String,
      maxlength: [500, "Les notes ne peuvent pas dépasser 500 caractères"],
      trim: true,
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

// Indexes
laboratorySchema.index({ name: "text", "director.name": "text" });
laboratorySchema.index({ "address.city": 1 });
laboratorySchema.index({ specialties: 1 });
laboratorySchema.index({ licenseNumber: 1 });
laboratorySchema.index({ "partnershipDetails.status": 1 });

// Génération automatique du code laboratoire
laboratorySchema.pre("save", function (next) {
  if (!this.labCode && this.isNew) {
    const namePart = this.name.substring(0, 3).toUpperCase();
    const cityPart = this.address.city.substring(0, 2).toUpperCase();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.labCode = `${namePart}${cityPart}${random}`;
  }
  next();
});

// Méthodes utilitaires
laboratorySchema.methods.isOpenNow = function () {
  const now = new Date();
  const currentDay = now.toLocaleDateString("en-US", { weekday: "lowercase" });
  const currentTime = now.toTimeString().slice(0, 5);

  const daySchedule = this.operatingHours[currentDay];

  if (!daySchedule || !daySchedule.isOpen) {
    return false;
  }

  const morningOpen = daySchedule.morning.open;
  const morningClose = daySchedule.morning.close;
  const afternoonOpen = daySchedule.afternoon?.open;
  const afternoonClose = daySchedule.afternoon?.close;

  return (
    (currentTime >= morningOpen && currentTime <= morningClose) ||
    (afternoonOpen &&
      afternoonClose &&
      currentTime >= afternoonOpen &&
      currentTime <= afternoonClose)
  );
};

laboratorySchema.methods.getAvailableTest = function (testCode) {
  return this.availableTests.find(
    (test) => test.testCode === testCode && test.isActive
  );
};

laboratorySchema.methods.updateStatistics = function (newOrderCount = 1) {
  this.statistics.totalOrders += newOrderCount;
  this.statistics.lastMonthOrders += newOrderCount;
};

laboratorySchema.methods.calculateAverageProcessingTime = function (newTime) {
  if (this.statistics.completedOrders > 0) {
    const currentAvg = this.statistics.averageProcessingTime || 0;
    const totalOrders = this.statistics.completedOrders;
    this.statistics.averageProcessingTime =
      (currentAvg * totalOrders + newTime) / (totalOrders + 1);
  } else {
    this.statistics.averageProcessingTime = newTime;
  }
  this.statistics.completedOrders += 1;
};

const Laboratory = mongoose.model("Laboratory", laboratorySchema);
export default Laboratory;

import mongoose from "mongoose";

const pharmacySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom de la pharmacie est obligatoire"],
      trim: true,
      maxlength: [100, "Le nom ne peut pas dépasser 100 caractères"],
    },
    licenseNumber: {
      type: String,
      required: [true, "Le numéro de licence est obligatoire"],
      unique: true,
      trim: true,
    },
    pharmacyCode: {
      type: String,
      unique: true,
      trim: true,
    },
    contact: {
      email: {
        type: String,
        required: [true, "L'email est obligatoire"],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          "Format email invalide",
        ],
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
        default: "Maroc",
        trim: true,
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
          close: { type: String, default: "12:30" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "19:00" },
        },
      },
      tuesday: {
        isOpen: { type: Boolean, default: true },
        morning: {
          open: { type: String, default: "08:00" },
          close: { type: String, default: "12:30" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "19:00" },
        },
      },
      wednesday: {
        isOpen: { type: Boolean, default: true },
        morning: {
          open: { type: String, default: "08:00" },
          close: { type: String, default: "12:30" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "19:00" },
        },
      },
      thursday: {
        isOpen: { type: Boolean, default: true },
        morning: {
          open: { type: String, default: "08:00" },
          close: { type: String, default: "12:30" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "19:00" },
        },
      },
      friday: {
        isOpen: { type: Boolean, default: true },
        morning: {
          open: { type: String, default: "08:00" },
          close: { type: String, default: "12:30" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "19:00" },
        },
      },
      saturday: {
        isOpen: { type: Boolean, default: true },
        morning: {
          open: { type: String, default: "08:00" },
          close: { type: String, default: "12:30" },
        },
        afternoon: {
          open: { type: String, default: "14:00" },
          close: { type: String, default: "17:00" },
        },
      },
      sunday: {
        isOpen: { type: Boolean, default: false },
        morning: {
          open: { type: String },
          close: { type: String },
        },
        afternoon: {
          open: { type: String },
          close: { type: String },
        },
      },
    },
    services: [
      {
        type: String,
        enum: [
          "Délivrance médicaments",
          "Conseil pharmaceutique",
          "Vaccination",
          "Tests COVID-19",
          "Matériel médical",
          "Orthopédie",
          "Homéopathie",
          "Phytothérapie",
          "Cosmétique",
          "Parapharmacie",
          "Livraison à domicile",
          "Commande en ligne",
        ],
      },
    ],
    pharmacist: {
      name: {
        type: String,
        required: [true, "Le nom du pharmacien est obligatoire"],
        trim: true,
      },
      licenseNumber: {
        type: String,
        required: [true, "Le numéro de licence du pharmacien est obligatoire"],
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },
    partnershipDetails: {
      startDate: {
        type: Date,
        required: [true, "La date de début du partenariat est obligatoire"],
        default: Date.now,
      },
      contractType: {
        type: String,
        enum: ["Standard", "Premium", "Exclusif"],
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
        enum: ["active", "inactive", "suspended"],
        default: "active",
      },
    },
    stats: {
      totalPrescriptions: {
        type: Number,
        default: 0,
      },
      averageProcessingTime: {
        type: Number,
        default: 0,
      },
      lastActivity: {
        type: Date,
        default: Date.now,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      maxlength: [500, "Les notes ne peuvent pas dépasser 500 caractères"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

pharmacySchema.index({ "contact.email": 1 });
pharmacySchema.index({ licenseNumber: 1 });
pharmacySchema.index({ pharmacyCode: 1 });
pharmacySchema.index({ "address.city": 1 });
pharmacySchema.index({ "partnershipDetails.status": 1 });

pharmacySchema.pre("save", function (next) {
  if (!this.pharmacyCode) {
    const cityCode = this.address.city.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.pharmacyCode = `PH${cityCode}${random}`;
  }
  next();
});

pharmacySchema.methods.isOpenNow = function () {
  const now = new Date();
  const currentDay = now.toLocaleDateString("en-US", { weekday: "lowercase" });
  const currentTime = now.toTimeString().slice(0, 5);

  const daySchedule = this.operatingHours[currentDay];

  if (!daySchedule || !daySchedule.isOpen) {
    return false;
  }

  const morningOpen = daySchedule.morning.open;
  const morningClose = daySchedule.morning.close;
  const afternoonOpen = daySchedule.afternoon.open;
  const afternoonClose = daySchedule.afternoon.close;

  return (
    (currentTime >= morningOpen && currentTime <= morningClose) ||
    (afternoonOpen &&
      afternoonClose &&
      currentTime >= afternoonOpen &&
      currentTime <= afternoonClose)
  );
};

pharmacySchema.methods.getFullAddress = function () {
  const { street, city, zipCode, region, country } = this.address;
  return `${street}, ${city} ${zipCode}${
    region ? `, ${region}` : ""
  }, ${country}`;
};

pharmacySchema.methods.updateStats = function (processingTime) {
  this.stats.totalPrescriptions += 1;
  this.stats.averageProcessingTime =
    (this.stats.averageProcessingTime + processingTime) / 2;
  this.stats.lastActivity = new Date();
  return this.save();
};

pharmacySchema.virtual("isOpen").get(function () {
  return this.isOpenNow();
});

pharmacySchema.virtual("fullAddress").get(function () {
  return this.getFullAddress();
});

pharmacySchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  },
});

const Pharmacy = mongoose.model("Pharmacy", pharmacySchema);
export default Pharmacy;

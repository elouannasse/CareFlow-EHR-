import mongoose from "mongoose";

const PatientSchema = new mongoose.Schema(
  {
    
    firstName: {
      type: String,
      required: [true, "Le prénom est requis"],
      trim: true,
      maxlength: [50, "Le prénom ne peut pas dépasser 50 caractères"],
    },
    lastName: {
      type: String,
      required: [true, "Le nom est requis"],
      trim: true,
      maxlength: [50, "Le nom ne peut pas dépasser 50 caractères"],
    },
    dateOfBirth: {
      type: Date,
      required: [true, "La date de naissance est requise"],
    },
    gender: {
      type: String,
      enum: ["M", "F", "Autre"],
      required: [true, "Le sexe est requis"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Le numéro de téléphone est requis"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Format email invalide",
      ],
    },

    // Adresse
    address: {
      street: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      zipCode: { type: String, required: true, trim: true },
      country: { type: String, default: "Maroc", trim: true },
    },

    // Contact d'urgence
    emergencyContact: {
      name: { type: String, required: true, trim: true },
      relationship: { type: String, required: true, trim: true },
      phoneNumber: { type: String, required: true, trim: true },
    },

    // Informations médicales
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Inconnu"],
      default: "Inconnu",
    },

    allergies: [
      {
        name: { type: String, required: true, trim: true },
        severity: {
          type: String,
          enum: ["Légère", "Modérée", "Sévère", "Inconnue"],
          default: "Inconnue",
        },
        description: { type: String, trim: true },
      },
    ],

    medicalHistory: [
      {
        condition: { type: String, required: true, trim: true },
        diagnosedDate: { type: Date },
        status: {
          type: String,
          enum: ["Actif", "Résolu", "Chronique", "En traitement"],
          default: "Actif",
        },
        notes: { type: String, trim: true },
      },
    ],

    currentMedications: [
      {
        name: { type: String, required: true, trim: true },
        dosage: { type: String, required: true, trim: true },
        frequency: { type: String, required: true, trim: true },
        startDate: { type: Date, default: Date.now },
        prescribedBy: { type: String, trim: true },
      },
    ],

    // Informations assurance
    insurance: {
      provider: { type: String, trim: true },
      policyNumber: { type: String, trim: true },
      groupNumber: { type: String, trim: true },
      validUntil: { type: Date },
    },

    // Statut et métadonnées
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Les notes ne peuvent pas dépasser 1000 caractères"],
    },
  },
  {
    timestamps: true,
  }
);

// Index pour la recherche
PatientSchema.index({ firstName: "text", lastName: "text", email: "text" });
PatientSchema.index({ email: 1 });
PatientSchema.index({ phoneNumber: 1 });

// Méthode pour obtenir le nom complet
PatientSchema.methods.getFullName = function () {
  return `${this.firstName} ${this.lastName}`;
};

// Méthode pour calculer l'âge
PatientSchema.methods.getAge = function () {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
};

// Middleware pre-save pour la mise à jour
PatientSchema.pre("save", function (next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

const Patient = mongoose.model("Patient", PatientSchema);

export default Patient;

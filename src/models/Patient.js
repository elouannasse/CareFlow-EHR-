import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  // Informations personnelles
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email invalide']
  },
  phone: {
    type: String,
    required: [true, 'Le téléphone est requis'],
    trim: true,
    match: [/^[\+]?[0-9\s\-\(\)]{8,15}$/, 'Numéro de téléphone invalide']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'La date de naissance est requise'],
    validate: {
      validator: function(value) {
        return value < new Date();
      },
      message: 'La date de naissance doit être dans le passé'
    }
  },
  gender: {
    type: String,
    enum: {
      values: ['male', 'female', 'other'],
      message: 'Le genre doit être: male, female, ou other'
    },
    required: [true, 'Le genre est requis']
  },
  
  // Adresse
  address: {
    street: {
      type: String,
      required: [true, 'L\'adresse est requise'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'La ville est requise'],
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      required: [true, 'Le code postal est requis'],
      trim: true
    },
    country: {
      type: String,
      required: [true, 'Le pays est requis'],
      trim: true,
      default: 'France'
    }
  },

  // Contact d'urgence
  emergencyContact: {
    name: {
      type: String,
      required: [true, 'Le nom du contact d\'urgence est requis'],
      trim: true
    },
    relationship: {
      type: String,
      required: [true, 'La relation avec le contact d\'urgence est requise'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Le téléphone du contact d\'urgence est requis'],
      trim: true,
      match: [/^[\+]?[0-9\s\-\(\)]{8,15}$/, 'Numéro de téléphone invalide']
    }
  },

  // Informations d'assurance
  insurance: {
    provider: {
      type: String,
      trim: true
    },
    policyNumber: {
      type: String,
      trim: true
    },
    groupNumber: {
      type: String,
      trim: true
    },
    expiryDate: {
      type: Date
    }
  },

  // Informations médicales
  allergies: [{
    allergen: {
      type: String,
      required: true,
      trim: true
    },
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe', 'life-threatening'],
      required: true
    },
    reaction: {
      type: String,
      trim: true
    },
    dateDiscovered: {
      type: Date,
      default: Date.now
    }
  }],

  medicalHistory: [{
    condition: {
      type: String,
      required: true,
      trim: true
    },
    diagnosisDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic', 'in-remission'],
      default: 'active'
    },
    notes: {
      type: String,
      trim: true
    }
  }],

  medications: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    dosage: {
      type: String,
      required: true,
      trim: true
    },
    frequency: {
      type: String,
      required: true,
      trim: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['active', 'discontinued', 'completed'],
      default: 'active'
    }
  }],

  // Informations administratives
  patientId: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deceased'],
    default: 'active'
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastVisit: {
    type: Date
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Métadonnées
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual pour l'âge
PatientSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual pour le nom complet
PatientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index pour les recherches
PatientSchema.index({ firstName: 1, lastName: 1 });
PatientSchema.index({ email: 1 });
PatientSchema.index({ patientId: 1 });
PatientSchema.index({ phone: 1 });
PatientSchema.index({ status: 1 });

// Middleware pour générer automatiquement l'ID patient
PatientSchema.pre('save', async function(next) {
  if (this.isNew && !this.patientId) {
    const count = await this.constructor.countDocuments();
    this.patientId = `PAT${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Méthodes d'instance
PatientSchema.methods.toJSON = function() {
  const patientObject = this.toObject();
  return patientObject;
};

PatientSchema.methods.addAllergy = function(allergyData) {
  this.allergies.push(allergyData);
  return this.save();
};

PatientSchema.methods.addMedicalHistory = function(historyData) {
  this.medicalHistory.push(historyData);
  return this.save();
};

PatientSchema.methods.addMedication = function(medicationData) {
  this.medications.push(medicationData);
  return this.save();
};

const Patient = mongoose.model('Patient', PatientSchema);

export default Patient;
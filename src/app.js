import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import patientRoutes from "./routes/patient.routes.js";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API Clinique Médicale fonctionnelle!",
    timestamp: new Date(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API REST - Clinique Médicale",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      patients: "/api/v1/patients",
    },
    features: [
      "Authentification JWT",
      "Gestion des utilisateurs (CRUD)",
      "Gestion des patients (CRUD)",
      "Système de rôles",
      "Recherche et filtrage",
      "Validation des données",
      "Soft delete",
    ],
  });
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/patients", patientRoutes);

// Handle 404 errors - catch all unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint API non trouvé",
    requestedUrl: req.originalUrl,
    method: req.method,
    timestamp: new Date(),
    availableEndpoints: {
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      patients: "/api/v1/patients",
    },
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Gestionnaire d'erreur global:", error);

  // Handle specific error types
  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Erreur de validation",
      errors: Object.values(error.errors).map((err) => err.message),
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Format d'ID invalide",
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} déjà existant`,
      field: field,
    });
  }

  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Token JWT invalide",
    });
  }

  if (error.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Token JWT expiré",
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Erreur interne du serveur",
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      details: error,
    }),
  });
});

export default app;

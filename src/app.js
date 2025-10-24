import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import appointmentRoutes from "./routes/appointment.routes.js";
import consultationRoutes from "./routes/consultation.routes.js";
import prescriptionRoutes from "./routes/prescription.routes.js";
import pharmacyRoutes from "./routes/pharmacy.routes.js";
import labOrderRoutes from "./routes/labOrder.routes.js";
import laboratoryRoutes from "./routes/laboratory.routes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API Clinique Médicale",
    endpoints: [
      "/api/v1/auth",
      "/api/v1/users",
      "/api/v1/patients",
      "/api/v1/appointments",
      "/api/v1/consultations",
      "/api/v1/prescriptions",
      "/api/v1/pharmacies",
      "/api/v1/lab-orders",
      "/api/v1/laboratories",
    ],
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/consultations", consultationRoutes);
app.use("/api/v1/prescriptions", prescriptionRoutes);
app.use("/api/v1/pharmacies", pharmacyRoutes);
app.use("/api/v1/lab-orders", labOrderRoutes);
app.use("/api/v1/laboratories", laboratoryRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Route non trouvée",
    path: req.path,
  });
});

app.use((error, req, res, next) => {
  console.error("Erreur:", error.message);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      error: "Données invalides",
      message: error.message,
    });
  }

  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Token invalide",
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      error: "Données déjà existantes",
    });
  }

  res.status(500).json({
    error: "Erreur serveur",
    message: error.message,
  });
});

export default app;

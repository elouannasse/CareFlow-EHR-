import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/v1/auth", authRoutes);

app.get("/api/v1/health", (req, res) => res.json({ ok: true }));

export default app; 

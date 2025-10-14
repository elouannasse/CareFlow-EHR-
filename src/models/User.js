import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["admin","doctor","nurse","secretary","patient"], default: "patient" },
  refreshToken: { type: String },
}, { timestamps: true });

export default mongoose.model("User", userSchema);

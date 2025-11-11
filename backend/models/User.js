import mongoose from "mongoose";

export const INTERESTS = ["games", "tools", "daily", "professional", "technology"];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  isSuperAdmin: { type: Boolean, default: false },

  // verification
  verified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationExpires: { type: Date },

  // prefs
  interests: [{ type: String, enum: INTERESTS }],
  darkMode: { type: Boolean, default: false },

  googleId: { type: String },
}, { timestamps: true });

export default mongoose.model("User", userSchema);

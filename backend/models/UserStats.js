// models/UserStats.js
import mongoose from "mongoose";

const UserStatsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  totalPoints: { type: Number, default: 0 },
  plays: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  lastPlayAt: { type: Date },
  streak: { type: Number, default: 0 }, // consecutive days
  streakLastAwardedAt: { type: Date, default: null }, // date when daily reward awarded
});

export default mongoose.models.UserStats || mongoose.model("UserStats", UserStatsSchema);

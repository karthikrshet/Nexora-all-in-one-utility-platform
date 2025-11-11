// backend/models/GameSession.js
import mongoose from "mongoose";

const { Schema } = mongoose;

const gameSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String },
    gameSlug: { type: String, required: true },
    points: { type: Number, default: 0 },
    won: { type: Boolean, default: false },
    durationSeconds: { type: Number, default: 0 },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.GameSession || mongoose.model("GameSession", gameSessionSchema);

import mongoose from "mongoose";

export const APP_CATEGORIES = ["games", "tools", "daily", "professional", "technology", "other"];

const appSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    icon: { type: String, default: "📦" },
    image: String,
    url: String,
    clicks: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    category: {
      type: String,
      enum: APP_CATEGORIES,
      required: true,
      default: "tools",  
       // ✅ default so no crash
    },
  },
  { timestamps: true }
);

export default mongoose.model("App", appSchema);

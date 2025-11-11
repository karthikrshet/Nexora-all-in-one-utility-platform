// models/Comment.js
import mongoose from "mongoose";
const { Schema } = mongoose;

const AdminReplySchema = new Schema(
  {
    text: { type: String, required: true },
    by: { type: Schema.Types.ObjectId, ref: "User" },
    byName: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CommentSchema = new Schema(
  {
    appId: { type: Schema.Types.ObjectId, ref: "App", index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    user: String,                       // display name
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, index: true },

    status: { type: String, enum: ["open", "resolved", "hidden"], default: "open", index: true },
    pinned: { type: Boolean, default: false, index: true },

    adminReplies: [AdminReplySchema],
  },
  { timestamps: true }
);

export default mongoose.models.Comment || mongoose.model("Comment", CommentSchema);

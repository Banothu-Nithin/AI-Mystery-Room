const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    theme: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    suspects: { type: Array, required: true },
    clues: { type: Array, required: true },
    culpritId: { type: String, required: true },
    explanation: { type: String, required: true },
    discoveredClues: { type: [String], default: [] },
    hintsUsed: { type: Number, default: 0 },
    hintHistory: { type: [String], default: [] },
    score: { type: Number, required: true },
    status: {
      type: String,
      enum: ["investigating", "completed"],
      default: "investigating",
    },
    accusation: { type: String, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Case", caseSchema);
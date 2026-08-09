import mongoose from "mongoose";

const personaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    friendName: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ["short_term", "long_term"],
      required: true,
    },
    sourceFilename: {
      type: String,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    shortTermContext: {
      type: String,
    },
    datasetFilePath: {
      type: String,
    },
  },
  { timestamps: true }
);

const Persona = mongoose.model("Persona", personaSchema);
export default Persona;
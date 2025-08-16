import mongoose from "mongoose";

// This is the Mongoose schema for an Achiever.
// It defines the structure and data types for documents in the 'achievers' collection.
const achieverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    field: {
      type: String,
      required: true,
    },
    achievement: {
      type: String,
      required: true,
    },
    completionTime: {
      type: String,
    },
    borderColor: {
      type: String,
    },
    textColor: {
      type: String,
    },
    bgColor: {
      type: String,
    },
  },
  { timestamps: true }
); // Automatically adds createdAt and updatedAt fields

// This creates the Mongoose model from the schema.
// Mongoose will automatically look for the plural, lowercase version of this name
// for the collection (i.e., 'achievers').
const Achiever = mongoose.model("Achiever", achieverSchema);

export default Achiever;

import Achiever from "../models/Achiever.js"; // Now imports the Mongoose model

class AchieverController {
  // Get all achievers from the database
  static async getAllAchievers(req, res) {
    try {
      // This now queries the MongoDB database for all documents.
      const achievers = await Achiever.find({});
      res.json(achievers);
    } catch (error) {
      console.error("Error fetching achievers:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch achievers",
        message: error.message,
      });
    }
  }

  // Get a single achiever by ID from the database
  static async getAchieverById(req, res) {
    try {
      const { id } = req.params;
      // Finds a single document by its _id field.
      const achiever = await Achiever.findById(id);

      if (!achiever) {
        return res.status(404).json({
          success: false,
          error: "Achiever not found",
        });
      }

      res.json({ success: true, achiever });
    } catch (error) {
      console.error("Error fetching achiever:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch achiever",
        message: error.message,
      });
    }
  }

  // Get achievers by field
  static async getAchieversByField(req, res) {
    try {
      const { field } = req.params;
      const achievers = await Achiever.find({ field });

      res.json({
        success: true,
        field,
        count: achievers.length,
        achievers,
      });
    } catch (error) {
      console.error("Error fetching achievers by field:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch achievers by field",
        message: error.message,
      });
    }
  }

  // Create new achiever (for future use)
  static async createAchiever(req, res) {
    try {
      const { name, image, field, achievement, completionTime } = req.body;

      if (!name || !field || !achievement) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
          message: "Name, field, and achievement are required",
        });
      }

      const newAchiever = new Achiever(
        Date.now(),
        name,
        image,
        field,
        achievement,
        completionTime
      );

      res.status(201).json({
        success: true,
        message: "Achiever created successfully",
        achiever: newAchiever,
      });
    } catch (error) {
      console.error("Error creating achiever:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create achiever",
        message: error.message,
      });
    }
  }
}

export default AchieverController;

import Testimonial from "../models/Testimonial.js";

class TestimonialController {
  // Get all testimonials from the database
  static async getAllTestimonials(req, res) {
    try {
      // This now queries the MongoDB database.
      const testimonials = await Testimonial.find({});
      res.json(testimonials);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch testimonials",
        message: error.message,
      });
    }
  }

  // Get testimonial by ID
  static async getTestimonialById(req, res) {
    try {
      const { id } = req.params;
      const testimonial = Testimonial.findById(id);

      if (!testimonial) {
        return res.status(404).json({
          success: false,
          error: "Testimonial not found",
          message: `No testimonial found with ID ${id}`,
        });
      }

      res.json({
        success: true,
        testimonial,
      });
    } catch (error) {
      console.error("Error fetching testimonial:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch testimonial",
        message: error.message,
      });
    }
  }

  // Create new testimonial (for future use)
  static async createTestimonial(req, res) {
    try {
      const { text, author, role, rating } = req.body;

      if (!text || !author || !role) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields",
          message: "Text, author, and role are required",
        });
      }

      const newTestimonial = new Testimonial(
        Date.now(),
        text,
        author,
        role,
        rating || 5
      );

      res.status(201).json({
        success: true,
        message: "Testimonial created successfully",
        testimonial: newTestimonial,
      });
    } catch (error) {
      console.error("Error creating testimonial:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create testimonial",
        message: error.message,
      });
    }
  }
}

export default TestimonialController;

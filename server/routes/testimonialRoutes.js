import express from "express";
import TestimonialController from "../controllers/testimonialController.js";

const router = express.Router();

// GET /api/testimonials - Get all testimonials
router.get("/", TestimonialController.getAllTestimonials);

// GET /api/testimonials/:id - Get testimonial by ID
router.get("/:id", TestimonialController.getTestimonialById);

// POST /api/testimonials - Create new testimonial
router.post("/", TestimonialController.createTestimonial);

export default router;

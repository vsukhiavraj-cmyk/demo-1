// 404 middleware for API routes
const notFound = (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      error: "API endpoint not found",
      message: `The endpoint ${req.originalUrl} does not exist`,
      availableEndpoints: [
        "/api/health",
        "/api/voice/status",
        "/api/voice/process",
        "/api/voice/test",
        "/api/testimonials",
        "/api/achievers",
        "/api/goals",
        "/api/fields",
        "/api/chat",
        "/api/chat/suggestions",
      ],
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

export default notFound;

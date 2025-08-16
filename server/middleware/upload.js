// File upload middleware is no longer needed
// Files are now stored locally in browser localStorage using LocalFileManager
// This middleware is kept for backward compatibility but returns an error

const upload = {
  single: (fieldName) => {
    return (req, res, next) => {
      res.status(410).json({
        success: false,
        message: "File upload functionality has been moved to client-side local storage. Files are now stored directly in the browser.",
      });
    };
  }
};

export default upload;

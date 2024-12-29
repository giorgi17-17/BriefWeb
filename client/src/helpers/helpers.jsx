

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL



export const getFileIcon = (fileType) => {
    switch (fileType) {
      case "application/pdf":
        return "📄"; // PDF icon
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return "📝"; // DOCX icon
      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        return "📊"; // PPTX icon
      default:
        return "📁"; // Default file icon
    }
  };

  export const handleFilePreview = (file) => {
    // For PDFs, we can display them directly in a new tab
    if (file.type === "application/pdf") {
      window.open(file.url, "_blank");
      return;
    }

    // For DOCX and PPTX, we'll use Google Docs Viewer
    const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
      file.url
    )}&embedded=true`;
    window.open(googleDocsUrl, "_blank");
  };
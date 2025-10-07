import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { FiUpload, FiEye, FiDownload } from "react-icons/fi";
import {
  BsFiletypePdf,
  BsFiletypeDocx,
  BsFiletypePptx,
  BsFileEarmark,
} from "react-icons/bs";
import { supabase } from "../utils/supabaseClient";

const getFileIcon = (type) => {
  // Extract file extension from file type or name
  const fileExt = type.split("/").pop()?.toLowerCase() || type.toLowerCase();

  switch (fileExt) {
    case "pdf":
    case "application/pdf":
      return <BsFiletypePdf className="text-red-500" size={24} />;
    case "docx":
    case "doc":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/msword":
      return <BsFiletypeDocx className="text-blue-500" size={24} />;
    case "pptx":
    case "ppt":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    case "application/vnd.ms-powerpoint":
      return <BsFiletypePptx className="text-orange-500" size={24} />;
    default:
      return <BsFileEarmark className="text-gray-500" size={24} />;
  }
};

// Helper function to handle file preview
const previewFile = async (file) => {
  if (!file || !file.url) return;

  try {
    // Get a fresh public URL for the file to avoid expired links
    if (file.path) {
      console.log("Previewing file with path:", file.path);
      const { data } = await supabase.storage
        .from("lecture-files")
        .getPublicUrl(file.path);

      if (data && data.publicUrl) {
        const fileType = file.type?.toLowerCase() || "";
        console.log("Generated public URL for preview:", data.publicUrl);

        // For PDFs, we can display them directly in a new tab
        if (fileType.includes("pdf")) {
          window.open(data.publicUrl, "_blank");
          return;
        }

        // For DOCX and PPTX, we'll use Google Docs Viewer
        const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
          data.publicUrl
        )}&embedded=true`;
        window.open(googleDocsUrl, "_blank");
      }
    } else {
      // Fallback to the stored URL if path is not available
      console.log("No path available, using stored URL for preview:", file.url);
      window.open(file.url, "_blank");
    }
  } catch (error) {
    console.error("Error previewing file:", error);
    // Fallback to the original URL if there's an error
    window.open(file.url, "_blank");
  }
};

const FilesLayout = ({
  files = [],
  isUploading = false,
  handleFileUpload = () => {},
}) => {
  const { t } = useTranslation();

  // Handle download with proper URL
  const handleDownload = async (file) => {
    try {
      if (file.path) {
        console.log("Downloading file with path:", file.path);
        const { data } = await supabase.storage
          .from("lecture-files")
          .getPublicUrl(file.path);

        if (data && data.publicUrl) {
          console.log("Generated public URL for download:", data.publicUrl);
          // Create a temporary anchor element to trigger download
          const a = document.createElement("a");
          a.href = data.publicUrl;
          a.download = file.name || "download";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
      }

      // Fallback to the stored URL
      console.log(
        "No path available, using stored URL for download:",
        file.url
      );
      window.open(file.url, "_blank");
    } catch (error) {
      console.error("Error downloading file:", error);
      // Fallback to the original URL if there's an error
      window.open(file.url, "_blank");
    }
  };

  return (
    <div className="space-y-4">
      <div className="theme-bg-primary p-6 rounded-xl shadow-sm theme-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
            <label
              className="relative cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm"
              onClick={(e) => {
                // Ensure mobile tap events work properly
                if (isUploading) {
                  e.preventDefault();
                }
              }}
            >
              <FiUpload className={`${isUploading ? "animate-bounce" : ""}`} />
              <span>
                {isUploading
                  ? t("lectures.lectureDetails.files.uploading")
                  : t("lectures.lectureDetails.files.uploadFile")}
              </span>
              <input
                type="file"
                className="sr-only"
                accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
            <p className="text-sm theme-text-secondary flex items-center gap-2 flex-wrap">
              <span>{t("lectures.lectureDetails.files.supportedFormats")}</span>
              <span className="flex items-center gap-1">
                <BsFiletypePdf className="text-red-500" />
                <span className="hidden sm:inline">PDF</span>
              </span>
              <span className="flex items-center gap-1">
                <BsFiletypeDocx className="text-blue-500" />
                <span className="hidden sm:inline">DOCX</span>
              </span>
              <span className="flex items-center gap-1">
                <BsFiletypePptx className="text-orange-500" />
                <span className="hidden sm:inline">PPTX</span>
              </span>
            </p>
          </div>
        </div>

        {files.length > 0 ? (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 theme-bg-secondary rounded-xl theme-border hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all duration-200 gap-4"
              >
                <div className="flex items-center space-x-4 w-full sm:w-auto">
                  <div className="p-2 theme-bg-primary rounded-lg shadow-sm flex-shrink-0">
                    {getFileIcon(file.type || file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium theme-text-primary truncate">
                      {file.name}
                    </h3>
                    <p className="text-sm theme-text-secondary">
                      {t("lectures.lectureDetails.files.uploadedOn")}{" "}
                      {new Date(
                        file.uploaded_at || file.created_at || Date.now()
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => previewFile(file)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title={t("lectures.lectureDetails.files.preview")}
                    aria-label={`${t(
                      "lectures.lectureDetails.files.preview"
                    )} ${file.name}`}
                  >
                    <FiEye size={20} />
                  </button>
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    title={t("lectures.lectureDetails.files.download")}
                    aria-label={`${t(
                      "lectures.lectureDetails.files.download"
                    )} ${file.name}`}
                  >
                    <FiDownload size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 theme-bg-secondary rounded-xl border-2 border-dashed theme-border-primary">
            <p className="theme-text-secondary">
              {t("lectures.lectureDetails.files.noFiles")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

FilesLayout.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string.isRequired,
      type: PropTypes.string,
      url: PropTypes.string.isRequired,
      path: PropTypes.string,
      uploaded_at: PropTypes.string,
      created_at: PropTypes.string,
    })
  ).isRequired,
  isUploading: PropTypes.bool.isRequired,
  handleFileUpload: PropTypes.func.isRequired,
};

export default FilesLayout;

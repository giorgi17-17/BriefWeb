import { handleFilePreview } from "../helpers/helpers";
import PropTypes from "prop-types";
import { FiUpload, FiEye, FiDownload, FiTrash2 } from "react-icons/fi";
import {
  BsFiletypePdf,
  BsFiletypeDocx,
  BsFiletypePptx,
  BsFileEarmark,
} from "react-icons/bs";

const getFileIcon = (type) => {
  switch (type.toLowerCase()) {
    case "pdf":
      return <BsFiletypePdf className="text-red-500" size={24} />;
    case "docx":
      return <BsFiletypeDocx className="text-blue-500" size={24} />;
    case "pptx":
      return <BsFiletypePptx className="text-orange-500" size={24} />;
    default:
      return <BsFileEarmark className="text-gray-500" size={24} />;
  }
};

const FilesLayout = ({
  files = [],
  isUploading = false,
  handleFileUpload = () => {},
  handleDeleteFile = () => {},
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <label className="relative cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm">
              <FiUpload className={`${isUploading ? "animate-bounce" : ""}`} />
              <span>{isUploading ? "Uploading..." : "Upload File"}</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.pptx"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-2">
              <span>Supported formats:</span>
              <BsFiletypePdf className="text-red-500" />
              <BsFiletypeDocx className="text-blue-500" />
              <BsFiletypePptx className="text-orange-500" />
            </p>
          </div>
        </div>

        {files.length > 0 ? (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {file.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Uploaded on{" "}
                      {new Date(file.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleFilePreview(file)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <FiEye size={20} />
                  </button>
                  <a
                    href={file.url}
                    download={file.name}
                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download"
                  >
                    <FiDownload size={20} />
                  </a>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <FiTrash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600">
            <p className="text-gray-500 dark:text-gray-400">
              No files uploaded yet
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
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
      uploaded_at: PropTypes.string.isRequired,
    })
  ).isRequired,
  isUploading: PropTypes.bool.isRequired,
  handleFileUpload: PropTypes.func.isRequired,
  handleDeleteFile: PropTypes.func.isRequired,
};

export default FilesLayout;

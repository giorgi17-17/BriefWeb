import { getFileIcon, handleFilePreview } from "../helpers/helpers";
import PropTypes from 'prop-types';

const FilesLayout = ({ files, isUploading, handleFileUpload, handleDeleteFile }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <label className="relative cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
          <span>{isUploading ? "Uploading..." : "Upload File"}</span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.pptx"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
        </label>
        <p className="text-sm text-gray-500">
          Supported formats: PDF, DOCX, PPTX
        </p>
      </div>

      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <span
                  className="text-2xl"
                  role="img"
                  aria-label="file type"
                >
                  {getFileIcon(file.type)}
                </span>
                <div className="flex-1">
                  <h3 className="font-medium">{file.name}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(file.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleFilePreview(file)}
                  className="text-blue-500 hover:text-blue-600 px-3 py-1 rounded-md hover:bg-blue-50"
                >
                  Preview
                </button>
                <a
                  href={file.url}
                  download={file.name}
                  className="text-green-500 hover:text-green-600 px-3 py-1 rounded-md hover:bg-green-50"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </a>
                <button
                  onClick={() => handleDeleteFile(file.id)}
                  className="text-red-500 hover:text-red-600 px-3 py-1 rounded-md hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-4">
          No files uploaded yet
        </p>
      )}
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

FilesLayout.defaultProps = {
  files: [],
  isUploading: false,
};

export default FilesLayout;

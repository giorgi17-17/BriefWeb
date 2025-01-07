import { handleFilePreview } from "../helpers/helpers";
import PropTypes from 'prop-types';
import { FiUpload, FiEye, FiDownload, FiTrash2 } from 'react-icons/fi';
import { 
  BsFiletypePdf, 
  BsFiletypeDocx, 
  BsFiletypePptx,
  BsFileEarmark
} from 'react-icons/bs';

const getFileIcon = (type) => {
  switch(type.toLowerCase()) {
    case 'pdf':
      return <BsFiletypePdf className="text-red-500" size={24} />;
    case 'docx':
      return <BsFiletypeDocx className="text-blue-500" size={24} />;
    case 'pptx':
      return <BsFiletypePptx className="text-orange-500" size={24} />;
    default:
      return <BsFileEarmark className="text-gray-500" size={24} />;
  }
};

const FilesLayout = ({
  files = [], 
  isUploading = false, 
  handleFileUpload = () => {}, 
  handleDeleteFile = () => {} 
}) => {
  return (
    <div className="space-y-4 mt-10">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <label className="relative cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 shadow-sm">
              <FiUpload className={`${isUploading ? 'animate-bounce' : ''}`} />
              <span>{isUploading ? "Uploading..." : "Upload File"}</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.pptx"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
            <p className="text-sm text-gray-500 flex items-center space-x-2">
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
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {getFileIcon(file.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{file.name}</h3>
                    <p className="text-sm text-gray-500">
                      Uploaded on {new Date(file.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleFilePreview(file)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Preview"
                  >
                    <FiEye size={20} />
                  </button>
                  <a
                    href={file.url}
                    download={file.name}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download"
                  >
                    <FiDownload size={20} />
                  </a>
                  <button
                    onClick={() => handleDeleteFile(file.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <FiTrash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500">
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

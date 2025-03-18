import PropTypes from "prop-types";

export const FileSelector = ({ files, selectedFile, onFileSelect }) => {
  return (
    <div className="flex items-start space-x-10">
      <select
        className="w-50 p-2 rounded-lg min-w-[200px] max-w-[200px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onChange={(e) => {
          const file = files.find((f) => f.id === e.target.value);
          if (file) onFileSelect(file);
        }}
        value={selectedFile?.id || ""}
      >
        <option value="" className="text-gray-600 dark:text-gray-400">
          Select a file
        </option>
        {files.map((file) => (
          <option
            key={file.id}
            value={file.id}
            className="text-gray-800 dark:text-gray-200"
          >
            {file.name}
          </option>
        ))}
      </select>
    </div>
  );
};

FileSelector.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedFile: PropTypes.shape({
    id: PropTypes.string,
  }),
  onFileSelect: PropTypes.func.isRequired,
};

// FileSelector.defaultProps = {
//   selectedFile: null,
// };

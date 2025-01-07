
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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

// export const FileSelector = ({ files, selectedFile, onFileSelect }) => {
//   console.log(selectedFile)
//   return (
//     <div className="flex items-start space-x-10">
//       <select
//         className="w-50 p-2 rounded-lg"
//         onChange={(e) => {
//           const file = files.find((f) => f.id === e.target.value);
//           if (file) onFileSelect(file);
//         }}
//         value={selectedFile?.id || ""}
//       >
//         <option value="">Select a file</option>
//         {files.map((file) => (
//           <option key={file.id} value={file.id}>
//             {file.name}
//           </option>
//         ))}
//       </select>
//     </div>
//   );
// };

// FileSelector.propTypes = {
//   files: PropTypes.arrayOf(
//     PropTypes.shape({
//       id: PropTypes.string.isRequired,
//       name: PropTypes.string.isRequired,
//     })
//   ).isRequired,
//   selectedFile: PropTypes.shape({
//     id: PropTypes.string,
//   }),
//   onFileSelect: PropTypes.func.isRequired,
// };

// // FileSelector.defaultProps = {
// //   selectedFile: null,
// // };

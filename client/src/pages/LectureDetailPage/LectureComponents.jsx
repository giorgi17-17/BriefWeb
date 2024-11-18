// // FileUploader.js
// import { useState } from 'react';
// import { supabase } from "../../utils/supabaseClient";
// import PropTypes from 'prop-types';

// export const FileUploader = ({ user, lectureId, name, onFileUpload, isUploading }) => {
//   const [error, setError] = useState(null);
// console.log(name)
//   const handleFileUpload = async (event) => {
//     try {
//       const file = event.target.files[0];
//       const allowedTypes = [
//         "application/pdf",
//         "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "application/vnd.openxmlformats-officedocument.presentationml.presentation",
//       ];

//       if (!allowedTypes.includes(file.type)) {
//         throw new Error("Only PDF, DOCX, and PPTX files are allowed");
//       }

//       const fileExt = file.name.split(".").pop();
//       const fileName = `${crypto.randomUUID()}.${fileExt}`;
//       const filePath = `${user.id}/${lectureId}/${fileName}`;

//       const { error: uploadError, data } = await supabase.storage
//         .from("lecture-files")
//         .upload(filePath, file);

//       if (uploadError) throw uploadError;
//       console.log(data)

//       const { data: { publicUrl } } = supabase.storage
//         .from("lecture-files")
//         .getPublicUrl(filePath);

//       const newFile = {
//         id: crypto.randomUUID(),
//         name: file.name,
//         type: file.type,
//         size: file.size,
//         url: publicUrl,
//         path: filePath,
//         uploaded_at: new Date().toISOString(),
//       };

//       await onFileUpload(newFile);
//     } catch (error) {
//       console.error("Error uploading file:", error);
//       setError(error.message);
//     }
//   };

//   FileUploader.propTypes = {
//     user: PropTypes.shape({
//       id: PropTypes.string.isRequired,
//     }).isRequired,
//     lectureId: PropTypes.string.isRequired,
//     name: PropTypes.string.isRequired,
//     onFileUpload: PropTypes.func.isRequired,
//     isUploading: PropTypes.bool.isRequired
//   };

//   return (
//     <div className="flex items-center space-x-4">
//       <label className="relative cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
//         <span>{isUploading ? "Uploading..." : "Upload File"}</span>
//         <input
//           type="file"
//           className="hidden"
//           accept=".pdf,.docx,.pptx"
//           onChange={handleFileUpload}
//           disabled={isUploading}
//         />
//       </label>
//       <p className="text-sm text-gray-500">Supported formats: PDF, DOCX, PPTX</p>
//       {error && <div className="text-red-500">{error}</div>}
//     </div>
//   );
// };

// // FileList.js
// const FileList = ({ files, onDelete, onPreview }) => {
//   const getFileIcon = (fileType) => {
//     switch (fileType) {
//       case "application/pdf": return "📄";
//       case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": return "📝";
//       case "application/vnd.openxmlformats-officedocument.presentationml.presentation": return "📊";
//       default: return "📁";
//     }
//   };

//   return (
//     <div className="space-y-2">
//       {files.map((file) => (
//         <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
//           <div className="flex items-center space-x-4">
//             <span className="text-2xl" role="img" aria-label="file type">
//               {getFileIcon(file.type)}
//             </span>
//             <div className="flex-1">
//               <h3 className="font-medium">{file.name}</h3>
//               <p className="text-sm text-gray-500">
//                 {new Date(file.uploaded_at).toLocaleDateString()}
//               </p>
//             </div>
//           </div>
//           <FileActions file={file} onDelete={onDelete} onPreview={onPreview} />
//         </div>
//       ))}
//     </div>
//   );
  
// };
// FileList.propTypes = {
//     files: PropTypes.arrayOf(
//       PropTypes.shape({
//         id: PropTypes.string.isRequired,
//         name: PropTypes.string.isRequired,
//         type: PropTypes.string.isRequired,
//         size: PropTypes.number.isRequired,
//         url: PropTypes.string.isRequired,
//         path: PropTypes.string.isRequired,
//         uploaded_at: PropTypes.string.isRequired
//       })
//     ).isRequired,
//     onDelete: PropTypes.func.isRequired,
//     onPreview: PropTypes.func.isRequired
//   };
// // FileActions.js
// const FileActions = ({ file, onDelete, onPreview }) => {
//   return (
//     <div className="flex items-center space-x-3">
//       <button
//         onClick={() => onPreview(file)}
//         className="text-blue-500 hover:text-blue-600 px-3 py-1 rounded-md hover:bg-blue-50"
//       >
//         Preview
//       </button>
//       <a
//         href={file.url}
//         download={file.name}
//         className="text-green-500 hover:text-green-600 px-3 py-1 rounded-md hover:bg-green-50"
//         target="_blank"
//         rel="noopener noreferrer"
//       >
//         Download
//       </a>
//       <button
//         onClick={() => onDelete(file.id)}
//         className="text-red-500 hover:text-red-600 px-3 py-1 rounded-md hover:bg-red-50"
//       >
//         Delete
//       </button>
//     </div>
//   );
// };

// // FlashcardGenerator.js
// const FlashcardGenerator = ({ files, onGenerate }) => {
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [isGenerating, setIsGenerating] = useState(false);

//   const handleGenerate = async () => {
//     if (!selectedFile) return;
//     setIsGenerating(true);
//     await onGenerate(selectedFile);
//     setIsGenerating(false);
//   };

//   return (
//     <div className="space-y-4">
//       <div className="mb-4">
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Select a file to generate flashcards from:
//         </label>
//         <select
//           className="w-full p-2 border rounded"
//           onChange={(e) => {
//             const file = files.find((f) => f.id === e.target.value);
//             if (file) setSelectedFile(file);
//           }}
//           value={selectedFile?.id || ""}
//         >
//           <option value="">Select a file</option>
//           {files.map((file) => (
//             <option key={file.id} value={file.id}>
//               {file.name}
//             </option>
//           ))}
//         </select>
//       </div>

//       {selectedFile && (
//         <button
//           onClick={handleGenerate}
//           className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
//           disabled={isGenerating}
//         >
//           {isGenerating ? "Generating Flashcards..." : "Generate Flashcards"}
//         </button>
//       )}
//     </div>
//   );
// };

// // TabNavigation.js
// const TabNavigation = ({ activeTab, onTabChange }) => {
//   const tabs = ["flashcards", "briefs", "files"];
  
//   return (
//     <nav className="flex border-b">
//       {tabs.map(tab => (
//         <button
//           key={tab}
//           className={`px-6 py-3 ${
//             activeTab === tab
//               ? "border-b-2 border-blue-500 text-blue-500"
//               : "text-gray-500"
//           }`}
//           onClick={() => onTabChange(tab)}
//         >
//           {tab.charAt(0).toUpperCase() + tab.slice(1)}
//         </button>
//       ))}
//     </nav>
//   );
// };

// // BriefsList.js
// const BriefsList = ({ briefs, onAddBrief }) => {
//   return (
//     <div className="space-y-4">
//       <button
//         onClick={onAddBrief}
//         className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
//       >
//         Add Brief
//       </button>
//       {briefs.map((brief) => (
//         <div key={brief.id} className="border rounded-lg p-4 space-y-2">
//           <input
//             type="text"
//             placeholder="Brief Title"
//             className="w-full p-2 border rounded"
//             value={brief.title}
//           />
//           <textarea
//             placeholder="Brief Content"
//             className="w-full p-2 border rounded"
//             rows="4"
//           />
//         </div>
//       ))}
//     </div>
//   );
// };




// FileActions.propTypes = {
//     file: PropTypes.shape({
//       id: PropTypes.string.isRequired,
//       name: PropTypes.string.isRequired,
//       url: PropTypes.string.isRequired
//     }).isRequired,
//     onDelete: PropTypes.func.isRequired,
//     onPreview: PropTypes.func.isRequired
//   };


//   FlashcardGenerator.propTypes = {
//     files: PropTypes.arrayOf(
//       PropTypes.shape({
//         id: PropTypes.string.isRequired,
//         name: PropTypes.string.isRequired
//       })
//     ).isRequired,
//     onGenerate: PropTypes.func.isRequired
//   };


//   TabNavigation.propTypes = {
//     activeTab: PropTypes.oneOf(['flashcards', 'briefs', 'files']).isRequired,
//     onTabChange: PropTypes.func.isRequired
//   };


//   BriefsList.propTypes = {
//     briefs: PropTypes.arrayOf(
//       PropTypes.shape({
//         id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
//         title: PropTypes.string.isRequired,
//         content: PropTypes.string
//       })
//     ).isRequired,
//     onAddBrief: PropTypes.func.isRequired
//   };
import axios from "axios";

export const handleProcessPdf = async (userId, lectureId, fileId) => {
//   const apiUrl = "http://localhost:5000/api/process-pdf";
  console.log(userId, lectureId, fileId);
  axios.post('/api/process-pdf', {
    userId,
    lectureId,
    fileId,
  })
  .then(function (response) {
    console.log(response);
  })
  .catch(function (error) {
    console.log(error);
  });

//   const res = response.data;

};

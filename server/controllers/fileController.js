// import multer from 'multer';
// import pdf from 'pdf-parse';
// import supabase from '../config/supabaseClient.js';
import multer from "multer";


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, "./public/images");
  },
  filename:function(req,file,cb) {

    return cb(null, `${Date.now()}_${file.originalname}`);
  }
});
export const upload = multer({storage})
export const testCall = () => {
  console.log("sdfsf");
};

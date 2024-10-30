import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  photoURL: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema); 
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

export const geminiAI = new GoogleGenAI({
  apiKey: process.env.VITE_GEMINI_API_KEY,
});

export const geminiModel = "gemini-2.0-flash-lite";

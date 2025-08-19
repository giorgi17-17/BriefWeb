import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

export const geminiAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
export const geminiModel = "gemini-2.0-flash-lite";
export const geminiModelFlashCard = "gemini-2.0-flash-lite";
export const geminiModelBrief = "gemini-2.5-flash";
export const geminiModelQuiz = "gemini-2.0-flash-lite";

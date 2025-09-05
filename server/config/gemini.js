import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

export const geminiAI = new GoogleGenAI({
  apiKey: "AIzaSyClGRl_js0aJwjvebgJC3NTsU36ckbIovA"
});
export const geminiModel = "gemini-2.0-flash-lite";
export const geminiModelFlashCard = "gemini-2.0-flash-lite";
export const geminiModelBrief = "gemini-2.5-flash-lite";
export const geminiModelQuiz = "gemini-2.0-flash-lite";

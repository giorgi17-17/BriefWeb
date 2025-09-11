import {GoogleGenAI} from '@posthog/ai'
import { PostHog } from 'posthog-node';
import dotenv from "dotenv";

dotenv.config();

export const posthog = new PostHog(
  process.env.POSTHOG_API_KEY,
  { 
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    flushAt: 20,
    flushInterval: 10000,
  }
);

export const geminiAI = new GoogleGenAI({
  apiKey: "AIzaSyClGRl_js0aJwjvebgJC3NTsU36ckbIovA",
  posthog: posthog,
});

export const geminiModel = "gemini-2.0-flash-lite";
export const geminiModelFlashCard = "gemini-2.0-flash-lite";
export const geminiModelBrief = "gemini-2.5-flash-lite";
export const geminiModelQuiz = "gemini-2.0-flash-lite";

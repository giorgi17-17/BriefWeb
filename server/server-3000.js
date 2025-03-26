// server-3000.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import apiRoutes from "./routes/api.js";

dotenv.config();

const app = express();
// This server will run on port 3000
const port = 3000;

// Enable CORS for your frontend domain
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// Simple test route
app.get("/test", (req, res) => {
  res.json({ message: "Backup server on port 3000 is running correctly" });
});

// Routes
app.use("/api", apiRoutes);

app.listen(port, () => {
  console.log(`Backup server is running at http://localhost:${port}`);
});

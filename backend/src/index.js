import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import uploadRoute from "./routes/upload.js";
import visionRoute from "./routes/vision.js";
import llmRoute from "./routes/llm.js";
import incidentRoute from "./routes/incident.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use("/api", uploadRoute);
app.use("/api/vision", visionRoute);
app.use("/api/llm", llmRoute);
app.use("/api/incident", incidentRoute);

app.get("/", (req, res) => {
  res.json({ status: "CityPulse backend running" });
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

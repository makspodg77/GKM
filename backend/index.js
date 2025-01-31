const express = require("express");
const path = require("path");
const cors = require("cors");

const timetableRouter = require("./routes/timetable");
const routesRouter = require("./routes/routes");
const transportLinesRouter = require("./routes/transportLines");
const transportStopsRouter = require("./routes/transportStops");
const newsRouter = require("./routes/news");

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

// API routes
app.use("/api/timetable", timetableRouter);
app.use("/api/routes", routesRouter);
app.use("/api/transportLines", transportLinesRouter);
app.use("/api/transportStops", transportStopsRouter);
app.use("/api/news", newsRouter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, "frontend", "dist")));

// If no API route or static file matches, serve the frontend index.html
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
});

// Health check endpoint
app.get("/health", (req, res) => {
  console.log("Health check endpoint hit");
  res.status(200).send("OK");
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

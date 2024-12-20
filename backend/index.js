const express = require("express");
const path = require("path");

const timetableRouter = require("./routes/timetable");
const routesRouter = require("./routes/routes");
const transportLinesRouter = require("./routes/transportLines");
const transportStopsRouter = require("./routes/transportStops");
const newsRouter = require("./routes/news");

const app = express();
const port = process.env.PORT || 3000;

app.use("/api/timetable", timetableRouter);
app.use("/api/routes", routesRouter);
app.use("/api/transportLines", transportLinesRouter);
app.use("/api/transportStops", transportStopsRouter);
app.use("/api/news", newsRouter);

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

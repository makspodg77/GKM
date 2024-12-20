const express = require("express");
const sql = require("mssql");
const config = require("../utils/config");
const router = express.Router();

const addMinutesToTime = (time, minutesToAdd) => {
  let [hours, minutes] = time.split(":").map(Number);
  let date = new Date();

  date.setHours(hours);
  date.setMinutes(minutes);

  date.setMinutes(date.getMinutes() + minutesToAdd);

  let newHours = date.getHours().toString().padStart(2, "0");
  let newMinutes = date.getMinutes().toString().padStart(2, "0");

  return `${newHours}:${newMinutes}`;
};

const executeQuery = async (query) => {
  try {
    await sql.connect(config);
    const result = await sql.query(query);
    return result.recordset;
  } catch (err) {
    console.error("Query error:", err);
    throw err;
  } finally {
    await sql.close();
  }
};

// GET /api/routes/route
// Returns one line's schedule identified by its line id
router.get("/route", async (req, res) => {
  const { lineNr, direction } = req.query;
  const query = `
    SELECT r.*, l.*, s.*
    FROM routes r
    LEFT JOIN transport_lines l ON r.line_id = l.id
    LEFT JOIN transport_stops s ON r.stop_id = s.id
    WHERE r.line_id = ${lineNr}
    AND s.stop_direction = ${direction}`;

  try {
    const results = await executeQuery(query);
    const modifiedResults = results.map((result) => ({
      travel_time: result.travel_time,
      is_on_request: result.is_on_request,
      stop_name: result.stop_name,
    }));
    res.json(modifiedResults);
  } catch (err) {
    res.status(500).send("Error running query.");
  }
});

router.get("/specificRouteTimetable/:departure_id", async (req, res) => {
  const { departure_id } = req.params;
  const query = `
    SELECT ts.stop_name, r.stop_id, tt.departure_time, r.travel_time, tl.line_name, lt.line_type_name, r.route_number, r.stop_number
    FROM timetable tt
    JOIN routes r ON tt.route_number = r.route_number
    JOIN transport_lines tl ON tl.id = r.line_id
    JOIN transport_stops ts ON ts.id = r.stop_id
    JOIN line_types lt ON lt.id = tl.line_type_id
    WHERE tt.id = ${departure_id}`;

  try {
    const results = await executeQuery(query);
    let departure_sum = results[0].departure_time;
    for (let result of results) {
      departure_sum = addMinutesToTime(departure_sum, result.travel_time);
      result.departure_time = departure_sum;
    }
    res.json(results.sort((a, b) => a.stop_number - b.stop_number));
  } catch (err) {
    res.status(500).send("Error running query.");
  }
});

// GET /api/routes/lineRoute/:id
// Returns the route for a specific route
// The route is identified by its route id
router.get("/lineRoute/:id", async (req, res) => {
  const id = req.params.id;
  const query = `
    SELECT r.*, s.*, l.*, lt.*
    FROM routes r
    LEFT JOIN transport_stops s ON r.stop_id = s.id
    LEFT JOIN transport_lines l ON r.line_id = l.id
    LEFT JOIN line_types lt ON l.line_type_id = lt.id
    WHERE l.line_name = '${id}'`;

  try {
    const results = await executeQuery(query);
    const groupedResults = results.reduce((acc, result) => {
      const {
        stop_name,
        travel_time,
        is_on_request,
        stop_direction,
        route_number,
        stop_id,
        stop_number,
      } = result;
      if (!acc[stop_direction]) {
        acc[stop_direction] = [];
      }
      acc[stop_direction].push({
        stop_name,
        travel_time,
        is_on_request,
        route_number,
        stop_id,
        stop_number,
      });
      return acc;
    }, {});

    groupedResults.line_name = results[0].line_name;
    groupedResults.line_type = results[0].line_type_name;
    groupedResults.line_color = results[0].line_type_color;
    groupedResults[true] = groupedResults[true].sort(
      (a, b) => a.stop_number - b.stop_number
    );
    groupedResults[false] = groupedResults[false].sort(
      (a, b) => a.stop_number - b.stop_number
    );

    res.json(groupedResults);
  } catch (err) {
    res.status(500).send("Error running query.");
  }
});

module.exports = router;

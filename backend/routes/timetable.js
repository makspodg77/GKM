const express = require("express");
const sql = require("mssql");
const config = require("../utils/config");
const router = express.Router();

let poolPromise;

const getPool = () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log("Connected to SQL Server");
        return pool;
      })
      .catch((err) => {
        console.error("Database Connection Failed! Bad Config: ", err);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
};

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
    const pool = await getPool();
    const result = await pool.request().query(query);
    return result.recordset;
  } catch (err) {
    console.error("Query error:", err);
    throw err;
  }
};

// GET /api/timetable/route/:id
// Returns the route for a specific route
// The route is identified by its timetable id
router.get("/route/:id", async (req, res) => {
  const id = req.params.id;

  const query = `
    SELECT r.*, s.*, l.*, tt.*
    FROM timetable tt
    JOIN routes r ON tt.route_number = r.route_number
    JOIN transport_stops s ON r.stop_id = s.id
    JOIN transport_lines l ON r.line_id = l.id
    WHERE tt.id = ${id}
  `;

  try {
    const results = await executeQuery(query);
    let time = results[0].departure_time;

    const modifiedResults = results.map((result) => {
      time = addMinutesToTime(time, result.travel_time);
      result.departure_time = time;
      delete result.Column8;
      return result;
    });

    res.json(modifiedResults);
  } catch (err) {
    res.status(500).send("Error running query.");
  }
});

// GET /api/timetable/departure-times
// Returns the departure times for a specific stop and route
// The stop is identified by its stop id and the route by its route number
router.get("/departure-times", async (req, res) => {
  const { stop_id, route_number } = req.query;

  const query = `
    SELECT  r.id,
            r.line_id,
            r.stop_id,
            r.stop_number,
            r.route_number,
            r.travel_time,
            r.is_on_request,
            ts.stop_name,
            ts.stop_direction,
            tl.line_name,
            lt.line_type_name,
            lt.line_type_color,
            lt.line_type_image,
            tt.route_number,
            tt.departure_time,
            tt.id AS departure_id,
            (
              SELECT TOP 1
                ts2.stop_name
              FROM transport_stops ts2
              JOIN routes r2 ON ts2.id = r2.stop_id
              WHERE r2.route_number = r.route_number
              ORDER BY r2.stop_number DESC
            ) AS last_stop_name,
            (
              SELECT SUM(r3.travel_time)
              FROM routes r3
              WHERE r3.route_number = r.route_number
              AND r3.stop_number BETWEEN 1 AND (
                SELECT TOP 1 r5.stop_number
                FROM routes r5
                WHERE r5.stop_id = ${stop_id}
                AND r5.route_number = ${route_number}
              )
            ) AS total_travel_time,
            (
              SELECT json_query(
                (
                  SELECT tl2.line_name,
                    lt2.line_type_color,
                    r4.route_number
                  FROM transport_lines tl2
                  JOIN routes r4 ON tl2.id = r4.line_id
                  JOIN line_types lt2 ON tl2.line_type_id = lt2.id
                  WHERE r4.stop_id = ${stop_id}
                  AND tl2.id != r.line_id FOR json path
                )
              )
            ) AS other_lines,
            (
              SELECT json_query(
                (
                  SELECT ts3.stop_name,
                    r6.route_number,
                    r6.stop_number,
                    r6.travel_time,
                    r6.is_on_request,
                    r6.stop_id
                  FROM routes r6
                  JOIN transport_stops ts3 ON r6.stop_id = ts3.id
                  WHERE r6.route_number = r.route_number FOR json path
                )
              )
            ) AS stops,
            (
              SELECT json_query(
                (
                  SELECT TOP 1
                    tsd.id,
                    rd.route_number
                  FROM transport_stops tsd,
                    routes rd
                  WHERE rd.route_number != ${route_number}
                  AND tsd.id != ${stop_id}
                  AND tsd.stop_name = (
                    SELECT TOP 1
                      tsb.stop_name
                    FROM transport_stops tsb
                    WHERE tsb.id = ${stop_id}
                  )
                  AND rd.line_id = (
                    SELECT TOP 1
                      line_id
                    FROM routes
                    WHERE route_number = ${route_number}
                  ) FOR json path
                )
              )
            ) AS other_way_stop_id
    FROM timetable tt
    JOIN routes r ON tt.route_number = r.route_number
    JOIN transport_lines tl ON r.line_id = tl.id
    JOIN transport_stops ts ON r.stop_id = ts.id
    JOIN line_types lt ON tl.line_type_id = lt.id
    WHERE ts.id = ${stop_id}
    AND tt.route_number = ${route_number}
  `;

  try {
    const results = await executeQuery(query);

    const parsedResults = results.map((result) => ({
      ...result,
      other_lines: JSON.parse(result.other_lines),
      stops: JSON.parse(result.stops),
      other_way_stop_id: JSON.parse(result.other_way_stop_id),
    }));

    parsedResults.forEach(
      (result) =>
        (result.departure_time = addMinutesToTime(
          result.departure_time,
          result.total_travel_time
        ))
    );
    if (parsedResults.length === 0) {
      return res.status(404).send("No results found.");
    }
    let finalResult = {
      departure_times: parsedResults.map((result) => ({
        departure_time: result.departure_time,
        departure_id: result.departure_id,
      })),
      stop_name: parsedResults[0].stop_name,
      line_name: parsedResults[0].line_name,
      last_stop_name: parsedResults[0].last_stop_name,
      line_type_color: parsedResults[0].line_type_color,
      line_type_name: parsedResults[0].line_type_name,
      other_lines: parsedResults[0].other_lines,
      stops: parsedResults[0].stops.sort(
        (a, b) => a.stop_number - b.stop_number
      ),
      other_way_stop_id: parsedResults[0].other_way_stop_id,
    };

    console.log(finalResult);
    res.json(finalResult);
  } catch (err) {
    res.status(500).send("Error running query.");
  }
});

// /api/timetable/timetable?stopId=1
// Returns the timetable for a specific stop
// The stop is identified by its stop id
router.get("/timetable", async (req, res) => {
  console.log("Received request for /timetable");
  const { stopId } = req.query;
  console.log("stopId:", stopId);

  const query = `
    SELECT tt.departure_time, r.route_number, tl.line_name, ts.stop_name, r.stop_number,
      (
        SELECT TOP 1 ts2.stop_name
        FROM transport_stops ts2
        JOIN routes r2 ON ts2.id = r2.stop_id
        WHERE r2.route_number = r.route_number
        ORDER BY r2.stop_number DESC
      ) AS last_stop_name
    FROM timetable tt
    JOIN routes r ON tt.route_number = r.route_number
    JOIN transport_lines tl ON r.line_id = tl.id
    JOIN transport_stops ts ON r.stop_id = ts.id
    WHERE ts.id = ${stopId}
  `;

  try {
    const results = await executeQuery(query);
    console.log("Initial query results:", results);

    const promises = results.map((result) => {
      return new Promise(async (resolve, reject) => {
        const travelTimeQuery = `
          SELECT SUM(r.travel_time) AS total_travel_time
          FROM routes r
          WHERE r.route_number = ${result.route_number}
          AND r.stop_number BETWEEN 1 AND ${result.stop_number}
        `;

        try {
          const travelTimeResults = await executeQuery(travelTimeQuery);
          console.log("Travel time query results:", travelTimeResults);
          result.departure_time = addMinutesToTime(
            result.departure_time,
            travelTimeResults[0].total_travel_time
          );
          resolve(result);
        } catch (err) {
          console.error("Error running travel time query:", err);
          reject("Error running travel time query.");
        }
      });
    });

    const doria = `SELECT ts.stop_name FROM transport_stops ts WHERE ts.id = ${stopId}`;

    Promise.all(promises)
      .then(async (modifiedResults) => {
        try {
          const stopNameResults = await executeQuery(doria);
          console.log("Stop name query results:", stopNameResults);
          modifiedResults.push(stopNameResults[0]);
          res.json(modifiedResults);
        } catch (err) {
          console.error("Error running stop name query:", err);
          res.status(500).send("Error running stop name query.");
        }
      })
      .catch((error) => {
        console.error("Error processing results:", error);
        res.status(500).send("Error processing results.");
      });
  } catch (err) {
    console.error("Error running initial query:", err);
    res.status(500).send("Error running initial query.");
  }
});

router.get("/stop-group", async (req, res) => {
  const { stopId } = req.query;

  const query2 = `SELECT id FROM transport_stops WHERE stop_name = (SELECT stop_name FROM transport_stops WHERE id = ${stopId})`;

  try {
    const results = await executeQuery(query2);
    if (results.length > 0) {
      let finalObj = {};
      const promises = results.map((result) => {
        const id = result.id;
        const query = `
          SELECT r.stop_id, ts.stop_name, t.departure_time, tl.line_name, r.route_number, t.id AS departure_id, 
            (
              SELECT TOP 1 ts2.stop_name
              FROM transport_stops ts2
              JOIN routes r2 ON ts2.id = r2.stop_id
              WHERE r2.route_number = r.route_number
              ORDER BY r2.stop_number DESC
            ) AS last_stop_name,
            (
              SELECT SUM(r3.travel_time) 
              FROM routes r3 
              WHERE r3.stop_number BETWEEN 1 AND r.stop_number 
              AND r.route_number = r3.route_number
            ) AS total_travel_time
          FROM timetable t
          JOIN routes r ON t.route_number = r.route_number
          JOIN transport_stops ts ON ts.id = ${id}
          JOIN transport_lines tl ON tl.id = r.line_id
          WHERE r.stop_id = ${id}
        `;

        return executeQuery(query).then((results2) => {
          const responseArray = results2.map((doris) => ({
            ...doris,
            departure_time: addMinutesToTime(
              doris.departure_time,
              doris.total_travel_time
            ),
          }));

          finalObj[id] = responseArray;
        });
      });

      Promise.all(promises)
        .then(() => {
          res.json(finalObj);
        })
        .catch((err) => {
          console.error("Error running query:", err);
          res.status(500).send("Error running query.");
        });
    } else {
      res.status(404).send("No results found.");
    }
  } catch (err) {
    console.error("Error running query:", err);
    res.status(500).send("Error running query.");
  }
});

module.exports = router;

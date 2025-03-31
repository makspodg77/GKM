const express = require("express");
const router = express.Router();
const {
  executeQuery,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
} = require("../utils/sqlHelper");
const {
  asyncHandler,
  NotFoundError,
  ValidationError,
} = require("../utils/errorHandler");

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

/**
 * @swagger
 * /api/routes:
 *   get:
 *     tags: [Transport Routes]
 *     summary: Get all routes for a line
 *     description: Returns all the routes depending on the route type
 *     parameters:
 *       - in: query
 *         name: lineId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the line that routes should be returned for
 *     responses:
 *       200:
 *         description: Successfully retrieved routes for a line
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { lineId } = req.query;

    if (!lineId || isNaN(parseInt(lineId))) {
      throw new ValidationError("line ID parameter is required");
    }

    const query = `
    SELECT fr.stop_id, fr.travel_time, fr.is_on_request, fr.route_number, fr.stop_number, fr.stop_type, fr.route_type_id, l.name, lt.nameSingular, lt.namePlural, lt.color, sg.name AS stop_name
    FROM full_route fr
    JOIN line l ON fr.line_id = l.id
    JOIN stop s ON fr.stop_id = s.id
    JOIN stop_group sg ON fr.stop_group_id = sg.id
    JOIN line_type lt ON l.line_type_id = lt.id
    WHERE fr.line_id = @lineId
    `;

    const results = await executeQuery(query, { lineId });
    const modifiedResults = results.reduce((acc, result) => {
      const {
        stop_id,
        stop_number,
        travel_time,
        is_on_request,
        stop_type,
        route_id,
        route_type_id,
        name,
        nameSingular,
        namePlural,
        stop_name,
      } = result;
      if (!acc[route_id]) {
        acc[route_id] = [];
      }
      acc[route_id].push({
        stop_id,
        stop_number,
        travel_time,
        is_on_request,
        stop_type,
        route_id,
        route_type_id,
        name,
        nameSingular,
        namePlural,
        stop_name,
      });
      return acc;
    }, {});
    res.json(modifiedResults);
  })
);
/**
 * @swagger
 * /api/routes/route:
 *   get:
 *     tags: [Transport Routes]
 *     summary: Get a specific route
 *     description: Return the full route of a specific departure ID
 *     parameters:
 *       - in: query
 *         name: departureId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the departure to get the route for
 *     responses:
 *       200:
 *         description: Successfully retrieved route for the departure ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     id:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get(
  "/route",
  asyncHandler(async (req, res) => {
    const { departureId } = req.query;

    if (!departureId) {
      throw new ValidationError("departure ID parameter is required");
    }

    const basicDataQuery = `
    SELECT tt.departure_time, l.name, lt.nameSingular AS line_type_name, lt.color, tt.route_id
    FROM timetable tt 
    JOIN route r ON r.route_number = tt.route_id 
    JOIN full_route fr ON fr.route_number = r.full_route_id
    JOIN line l ON l.id = fr.line_id 
    JOIN line_type lt ON lt.id = l.line_type_id 
    WHERE tt.id = @departureId`;

    const results1 = await executeQuery(basicDataQuery, { departureId });

    if (!results1 || results1.length === 0) {
      throw new NotFoundError(`No departure found with ID ${departureId}`);
    }

    const routeQuery = `
    SELECT full_route_id, additional_stop_id FROM route WHERE route_id = @routeNumber`;

    const results2 = await executeQuery(routeQuery, {
      routeNumber: results1[0].route_id,
    });

    if (!results2 || results2.length === 0) {
      throw new NotFoundError(
        `No route found for route number ${results1[0].route_id}`
      );
    }

    let additionalStopIds = "";
    if (results2.length > 0) {
      additionalStopIds = results2
        .map((row) => row.additional_stop_id)
        .filter((id) => id)
        .join(",");
    }

    const fullRouteQuery = `
    SELECT fr.travel_time, fr.is_on_request, fr.stop_number, fr.stop_type, sg.name, sg.id AS stop_group_id, s.id AS stop_id
    FROM full_route fr 
    JOIN stop_group sg ON sg.id = fr.stop_group_id 
    JOIN stop s ON s.id = fr.stop_id 
    WHERE fr.route_number = @routeNumber
    AND (
        fr.stop_type <= 3
        OR (
            @additionalStopIds <> '' 
            AND fr.stop_id IN (SELECT value FROM STRING_SPLIT(@additionalStopIds, ','))
        )
    );
    `;

    const results3 = await executeQuery(fullRouteQuery, {
      routeNumber: results2[0].full_route_id,
      additionalStopIds: additionalStopIds,
    });

    if (!results3 || results3.length === 0) {
      throw new NotFoundError(
        `No stops found for route ${results2[0].full_route_id}`
      );
    }

    // Calculate arrival times
    let departure_time = results1[0].departure_time;
    for (let result of results3.sort((a, b) => a.stop_number - b.stop_number)) {
      departure_time = addMinutesToTime(departure_time, result.travel_time);
      result.arrival_time = departure_time;
    }

    res.json({
      line_name: results1[0].name,
      line_type: results1[0].line_type_name,
      color: results1[0].color,
      departure_time: results1[0].departure_time,
      stops: results3,
    });
  })
);

// GET /api/routes/lineRoute/:id
// Returns the route for a specific route
// The route is identified by its route id
router.get("/lineRoute/:id", async (req, res) => {
  const id = req.params.id;
  const query = `
    SELECT r.*, s.*, l.*, lt.*
    FROM route r
    LEFT JOIN transport_stop s ON r.stop_id = s.id
    LEFT JOIN transport_line l ON r.line_id = l.id
    LEFT JOIN line_type lt ON l.line_type_id = lt.id
    WHERE l.line_name = '${id}'`;

  try {
    const results = await executeQuery(query);
    const groupedResults = results.reduce((acc, result) => {
      const {
        stop_name,
        travel_time,
        is_on_request,
        stop_direction,
        route_id,
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
        route_id,
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

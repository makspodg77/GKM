const express = require("express");
const router = express.Router();
const { executeQuery } = require("../utils/sqlHelper");
const {
  asyncHandler,
  NotFoundError,
  ValidationError,
} = require("../utils/errorHandler");

function groupBy(array, key) {
  return array.reduce((result, item) => {
    (result[item[key]] = result[item[key]] || []).push(item);
    return result;
  }, {});
}

/**
 * @swagger
 * /api/lines:
 *   get:
 *     tags: [Transport Lines]
 *     summary: Get all transport lines
 *     description: Returns all lines grouped by their type
 *     responses:
 *       200:
 *         description: Successfully retrieved lines
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
    const query = `
    SELECT lt.nameSingular AS line_type_name, l.name, lt.color, l.id
    FROM lines l
    JOIN line_types lt ON l.line_type_id = lt.id;
  `;

    const results = await executeQuery(query);
    if (!results || results.length === 0) {
      throw new NotFoundError("No transport lines found");
    }

    const groupedResults = results.reduce((acc, result) => {
      const { line_type_name, name, color, id } = result;
      if (!acc[line_type_name]) {
        acc[line_type_name] = [];
      }

      acc[line_type_name].push({ line_type_name, name, color, id });

      return acc;
    }, {});

    res.json(groupedResults);
  })
);
/**
 * @swagger
 * /api/lines/all:
 *   get:
 *     tags: [Transport Lines]
 *     summary: Get all transport lines with its full route
 *     description: Returns all lines grouped by their type with their final stops and street name they go through
 *     responses:
 *       200:
 *         description: Successfully retrieved lines
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
  "/all",
  asyncHandler(async (req, res) => {
    const baseLineQuery = `SELECT 
      l.id,
      l.name,
      lt.nameSingular AS line_type_name,
      lt.color
      FROM lines l
      JOIN line_types lt ON l.line_type_id = lt.id;
    `;

    const firstStopsQuery = `SELECT  
      fr.line_id,
      sg.name AS stop_name,
      fr.stop_number
      FROM full_routes fr
      JOIN stop_groups sg ON sg.id = fr.stop_group_id
      WHERE fr.stop_type IN (1, 4);
    `;

    const lastStopsQuery = `SELECT 
      fr.line_id,
      sg.name AS stop_name,
      fr.stop_number
      FROM full_routes fr
      JOIN stop_groups sg ON sg.id = fr.stop_group_id
      WHERE fr.stop_type IN (2, 5);
    `;

    const streetsQuery = `SELECT
      fr.line_id,
      s.street,
      fr.stop_number
      FROM full_routes fr
      JOIN stops s ON s.id = fr.stop_id
      ORDER BY fr.line_id, s.street;
    `;
    const baseLineInfo = await executeQuery(baseLineQuery);
    const firstStops = await executeQuery(firstStopsQuery);
    const lastStops = await executeQuery(lastStopsQuery);
    const streets = await executeQuery(streetsQuery);

    if (!baseLineInfo || baseLineInfo.length === 0) {
      throw new NotFoundError("No transport lines found");
    }

    const firstStopsByLine = groupBy(firstStops, "line_id");
    const lastStopsByLine = groupBy(lastStops, "line_id");
    const streetsByLine = groupBy(streets, "line_id");

    const result = baseLineInfo.map((line) => {
      const lineFirstStops = firstStopsByLine[line.id] || [];
      const lineLastStops = lastStopsByLine[line.id] || [];
      const lineStreets = streetsByLine[line.id] || [];

      return {
        name: line.name,
        line_type_name: line.line_type_name,
        color: line.color,
        routes: lineFirstStops.flatMap((firstStop) =>
          lineLastStops.map((lastStop) => {
            const routeStreets = lineStreets
              .filter(
                (street) =>
                  street.stop_number >= firstStop.stop_number &&
                  street.stop_number <= lastStop.stop_number
              )
              .map((street) => street.street);

            return {
              firstStop: firstStop.stop_name,
              lastStop: lastStop.stop_name,
              streetsThrough: routeStreets,
            };
          })
        ),
      };
    });

    res.json(result);
  })
);

/**
 * @swagger
 * /api/lines/stop:
 *   get:
 *     tags: [Transport Lines]
 *     summary: Get all linesthat have a certain stop
 *     description: Returns all the lines that have a certain stop in their route
 *     parameters:
 *       - in: query
 *         name: lineId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the line that should be excluded
 *       - in: query
 *         name: stopId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the stop to show the lines at
 *     responses:
 *       200:
 *         description: Successfully retrieved lines
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
  "/stop",
  asyncHandler(async (req, res) => {
    const { stopId, lineId } = req.query;

    if (
      !stopId ||
      isNaN(parseInt(stopId)) ||
      !lineId ||
      isNaN(parseInt(lineId))
    ) {
      throw new ValidationError("ID parameter is required");
    }

    const query = `
    SELECT DISTINCT l.name, lt.color, fr.line_id
    FROM lines l
    JOIN line_types lt ON l.line_type_id = lt.id
    JOIN full_routes fr ON l.id = fr.line_id
    WHERE fr.stop_id = @stopId
    AND fr.line_id != @lineId
  `;

    const results = await executeQuery(query, { stopId, lineId });
    res.json(results);
  })
);

module.exports = router;

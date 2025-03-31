const express = require("express");
const router = express.Router();
const { executeQuery } = require("../utils/sqlHelper");
const {
  asyncHandler,
  NotFoundError,
  ValidationError,
} = require("../utils/errorHandler");
const {
  getLinesCategorized,
  getLinesFullRoutes,
} = require("../services/lineService");

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
    res.json(await getLinesCategorized());
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
    res.json(await getLinesFullRoutes());
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

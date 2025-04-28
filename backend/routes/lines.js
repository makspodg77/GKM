const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../utils/errorHandler");
const {
  getLinesCategorized,
  getLinesFullRoutes,
} = require("../services/lineService");

/**
 * @swagger
 * /api/lines:
 *   get:
 *     tags: [Lines]
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
    res.set("Cache-Control", "public, max-age=300");

    res.json(await getLinesCategorized());
  })
);
/**
 * @swagger
 * /api/lines/all:
 *   get:
 *     tags: [Lines]
 *     summary: Get all transport lines with their full routes
 *     description: Returns all lines grouped by their type with their final stops and streets they go through
 *     responses:
 *       200:
 *         description: Successfully retrieved lines with route information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   color:
 *                     type: string
 *                     description: Color code for this line type
 *                     example: "#FF0000"
 *                 additionalProperties:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       first_stop:
 *                         type: string
 *                         description: Name of the first stop
 *                         example: "Osiedle Kasztanowe"
 *                       last_stop:
 *                         type: string
 *                         description: Name of the last stop
 *                         example: "Plac Rodła"
 *                       streets:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: List of streets the route goes through
 *                         example: ["Wawrzyniaka", "Piastów", "Rayskiego"]
 *       500:
 *         description: Server error
 */
router.get(
  "/all",
  asyncHandler(async (req, res) => {
    res.set("Cache-Control", "public, max-age=300");

    res.json(await getLinesFullRoutes());
  })
);

module.exports = router;

const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../utils/errorHandler");
const { getLineRoutes, getRoute } = require("../services/routeService");

/**
 * @swagger
 * /api/routes/{line_id}:
 *   get:
 *     tags: [Routes]
 *     summary: Get all routes for a line
 *     description: Returns all the routes depending on the route type
 *     parameters:
 *       - in: path
 *         name: line_id
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
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   route_id:
 *                     type: string
 *                     description: ID of the route
 *                   is_circular:
 *                     type: boolean
 *                     description: Whether the route is circular
 *                   line:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Line ID
 *                       name:
 *                         type: string
 *                         description: Line name
 *                       color:
 *                         type: string
 *                         description: Line color code
 *                   stops:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/RouteStop'
 *       500:
 *         description: Server error
 */
router.get(
  "/:line_id",
  asyncHandler(async (req, res) => {
    const { line_id } = req.params;

    res.set("Cache-Control", "public, max-age=300");

    res.json(await getLineRoutes(line_id));
  })
);
/**
 * @swagger
 * /api/routes/route/{line_id}/{departure_id}:
 *   get:
 *     tags: [Routes]
 *     summary: Get a specific route
 *     description: Return the full route of a specific departure ID
 *     parameters:
 *       - in: path
 *         name: departure_id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the departure to get the route for
 *       - in: path
 *         name: line_id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID of the line to get the route for
 *     responses:
 *       200:
 *         description: Successfully retrieved route for the departure ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 departureInfo:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Departure ID
 *                     route_id:
 *                       type: string
 *                       description: Route ID
 *                     departure_time:
 *                       type: string
 *                       format: date-time
 *                       description: Departure time in ISO format
 *                 routeInfo:
 *                   type: object
 *                   properties:
 *                     timetable_id:
 *                       type: string
 *                       description: Timetable ID
 *                     full_route_id:
 *                       type: string
 *                       description: Full route ID
 *                     departure_id:
 *                       type: string
 *                       description: Departure ID
 *                     signature:
 *                       type: string
 *                       nullable: true
 *                       description: Route signature
 *                     color:
 *                       type: string
 *                       nullable: true
 *                       description: Route color
 *                     departure_time:
 *                       type: string
 *                       format: date-time
 *                       description: Departure time in ISO format
 *                 lineInfo:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Line name
 *                       example: "93"
 *                     nameSingular:
 *                       type: string
 *                       description: Line type name in singular form
 *                     namePlural:
 *                       type: string
 *                       description: Line type name in plural form
 *                     color:
 *                       type: string
 *                       description: Line color code
 *                       example: "#FF00FF"
 *                     id:
 *                       type: integer
 *                       description: Line ID
 *                 stops:
 *                   type: array
 *                   description: List of stops in this route with their departure times
 *                   items:
 *                     type: object
 *                     properties:
 *                       stop_group_id:
 *                         type: string
 *                         description: ID of the stop group
 *                       street:
 *                         type: string
 *                         description: Street name
 *                         example: "Franklina Delano Roosevelta"
 *                       stop_id:
 *                         type: string
 *                         description: ID of the stop
 *                       travel_time:
 *                         type: integer
 *                         description: Travel time from previous stop in minutes
 *                         example: 4
 *                       stop_number:
 *                         type: integer
 *                         description: Position of this stop in the route
 *                         example: 2
 *                       stop_type:
 *                         type: string
 *                         description: Type of stop (1 = normal, 2 = first, 3 = last, etc.)
 *                       name:
 *                         type: string
 *                         description: Name of the stop
 *                         example: "Brama Portowa"
 *                       is_on_request:
 *                         type: boolean
 *                         description: Indicates if the stop is on request
 *                       is_optional:
 *                         type: boolean
 *                         description: Indicates if the stop is optional
 *                       is_first:
 *                         type: boolean
 *                         description: Indicates if this is the first stop
 *                       is_last:
 *                         type: boolean
 *                         description: Indicates if this is the last stop
 *                       departure_time:
 *                         type: string
 *                         description: Time of departure from this stop
 *                         example: "05:04"
 *       404:
 *         description: Departure not found
 *       500:
 *         description: Server error
 */
router.get(
  "/route/:line_id/:departure_id",
  asyncHandler(async (req, res) => {
    const { departure_id, line_id } = req.params;

    res.json(await getRoute(departure_id, line_id));
  })
);

module.exports = router;

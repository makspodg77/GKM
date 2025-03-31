const {
  processRouteStops,
  calculateDepartureTimes,
} = require("../utils/routeUtils");
const { executeQuery } = require("../utils/sqlHelper");
const { NotFoundError } = require("../utils/errorHandler");
/**
 * Gets timetable data by ID
 * @param {number} id - Timetable ID
 * @returns {Promise<Object>} Timetable data
 */
const getTimetableById = async (id) => {
  const results = await executeQuery(
    `SELECT * FROM timetable WHERE id = @id;`,
    { id }
  );
  if (!results || !results.length) {
    throw new NotFoundError(`Timetable with ID ${id} not found`);
  }
  return results[0];
};

/**
 * Gets timetable data by departure route ID
 * @param {number} id - Departure route ID
 * @returns {Promise<Object>} Timetable data
 */
const getTimetableByRouteId = async (id) => {
  return executeQuery(`SELECT * FROM timetable WHERE route_id = @id;`, {
    id,
  });
};

/**
 * Gets stops for a route
 * @param {number} routeId - Route ID
 * @returns {Promise<Array>} Stops data
 */
const getStopsForRoute = async (routeId) => {
  return executeQuery(
    `SELECT s.stop_group_id, fr.stop_id, fr.travel_time, fr.stop_number, fr.stop_type, 
            sg.name, fr.is_on_request, st.is_optional, st.is_first, st.is_last 
     FROM full_route fr
     JOIN stop s ON s.id = fr.stop_id
     JOIN stop_group sg ON sg.id = s.stop_group_id
     JOIN stop_type st ON st.id = fr.stop_type
     WHERE fr.route_id = @route_id;`,
    { route_id: routeId }
  );
};

/**
 * Gets additional stops for a departure route
 * @param {number} departureRouteId - Departure route ID
 * @returns {Promise<Array>} Additional stops data
 */
const getAdditionalStops = async (departureRouteId) => {
  return executeQuery(
    `SELECT stop_number FROM additional_stop WHERE route_id = @route_id;`,
    { route_id: departureRouteId }
  );
};

/**
 * Gets departure routes by full route ID
 * @param {Array<Number>} fullRouteIds - Full route IDs
 * @returns {Promise<Array>} Departure routes
 */
const getDepartureRoutesByFullRouteIds = async (fullRouteIds) => {
  if (!fullRouteIds.length) return [];

  const params = fullRouteIds.reduce(
    (acc, id, i) => ({ ...acc, [`id${i}`]: id }),
    {}
  );
  const placeholders = fullRouteIds.map((_, i) => `@id${i}`).join(",");

  return executeQuery(
    `SELECT id, route_id, color, signature FROM departure_route WHERE route_id IN (${placeholders})`,
    params
  );
};

/**
 * Gets timetable data for multiple routes
 * @param {Array<number>} routeIds - Array of route IDs
 * @returns {Promise<Array>} Timetable data
 */
const getTimetableDataForRoutes = async (routeIds) => {
  if (!routeIds.length) return [];

  const params = routeIds.reduce(
    (acc, id, i) => ({ ...acc, [`id${i}`]: id }),
    {}
  );
  const placeholders = routeIds.map((_, i) => `@id${i}`).join(",");

  return executeQuery(
    `SELECT id, route_id, departure_time FROM timetable 
     WHERE route_id IN (${placeholders})`,
    params
  );
};

/**
 * Gets stop information by ID with group data
 * @param {number} stopId - ID of the stop
 * @returns {Promise<Object>} Stop data with group information
 */
const getStopWithGroupData = async (stopId) => {
  return executeQuery(
    `SELECT 
      stop.street,
      stop.map,
      stop.id AS stop_id, 
      stop_group.id AS group_id, 
      stop_group.name 
    FROM stop 
    JOIN stop_group ON stop_group.id = stop.stop_group_id 
    WHERE stop.id = @stopId`,
    { stopId }
  ).then((results) => results[0]);
};

/**
 * Gets line for a route ID
 * @param {number} routeId - ID of the route
 * @returns {Promise<object>} Line
 */
const getLineDataByRouteId = async (routeId) => {
  return executeQuery(
    `SELECT name, nameSingular, namePlural, color FROM route JOIN line ON line.id = route.line_id JOIN line_type ON line_type.id = line.line_type_id WHERE route.id = @routeId`,
    { routeId: routeId }
  );
};

module.exports = {
  getTimetableById,
  getStopsForRoute,
  getTimetableByRouteId,
  getTimetableDataForRoutes,
  getDepartureRoutesByFullRouteIds,
  getLineDataByRouteId,
  getAdditionalStops,
};

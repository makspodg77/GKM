const { executeQuery } = require("../utils/sqlHelper");
const { NotFoundError } = require("../utils/errorHandler");
const { getStopsForRoutes } = require("./timetableService");

/**
 * Gets all departure routes
 * @returns {Promise<Array>} Deaprture route data
 */
const getDepartureRoutes = async () => {
  return executeQuery(`SELECT * FROM departure_route`);
};

/**
 * Gets departure routes by full route ID
 * @param {Array<Number>} fullRouteIds - Full route IDs
 * @returns {Promise<Array>} Departure routes
 */
const getStopsForRoutes = async (fullRouteIds) => {
  if (!fullRouteIds.length) return [];

  // Create distinct IDs to avoid duplicating queries
  const distinctIds = [...new Set(fullRouteIds)];

  const params = distinctIds.reduce(
    (acc, id, i) => ({ ...acc, [`id${i}`]: id }),
    {}
  );
  const placeholders = distinctIds.map((_, i) => `@id${i}`).join(",");

  // Get results for distinct IDs only
  const results = await executeQuery(
    `SELECT * FROM full_route WHERE route_id IN (${placeholders})`,
    params
  );

  // Create a map for quick lookup
  const resultsByRouteId = {};
  results.forEach((result) => {
    if (!resultsByRouteId[result.route_id]) {
      resultsByRouteId[result.route_id] = [];
    }
    resultsByRouteId[result.route_id].push(result);
  });

  // Reconstruct full result set with duplicates
  return fullRouteIds.flatMap((id) =>
    resultsByRouteId[id] ? [...resultsByRouteId[id]] : []
  );
};

/**
 * Gets route IDs that contain a specific stop
 * @param {number} stopId - ID of the stop
 * @returns {Promise<Array>} List of full route IDs
 */
const getFullRoutesByStopId = async (stopId) => {
  return executeQuery(
    `SELECT route_id FROM full_route WHERE stop_id = @stopId`,
    { stopId }
  ).then((results) => results.map((r) => r.route_id));
};

/**
 * Gets additional stops for multiple routes
 * @param {Array<number>} routeIds - Array of route IDs
 * @returns {Promise<Array>} Additional stops
 */
const getAdditionalStopsForRoutes = async (routeIds) => {
  if (!routeIds.length) return [];

  const params = routeIds.reduce(
    (acc, id, i) => ({ ...acc, [`id${i}`]: id }),
    {}
  );
  const placeholders = routeIds.map((_, i) => `@id${i}`).join(",");

  return executeQuery(
    `SELECT route_id, stop_number FROM additional_stop 
       WHERE route_id IN (${placeholders})`,
    params
  );
};

/**
 * Processes stop data to prepare a route timetable
 * @param {Array} results - Raw stop data from database
 * @param {Array} additionalStops - Optional stops that should be included
 * @returns {Array} Filtered and processed stops
 */
const processRouteStops = (results, additionalStops = []) => {
  let processedResults = results
    .map((result) => ({ ...result, stop_number: Number(result.stop_number) }))
    .sort((a, b) => a.stop_number - b.stop_number);

  processedResults = processedResults.filter(
    (result) =>
      !result.is_optional ||
      additionalStops.some(
        (stop) => Number(stop.stop_number) === Number(result.stop_number)
      )
  );

  const firstStops = processedResults.filter((stop) => stop.is_first);
  const firstStopNumber = firstStops.length > 0 ? firstStops[0].stop_number : 0;
  processedResults = processedResults.filter(
    (result) => result.stop_number >= firstStopNumber
  );

  const lastStops = processedResults.filter((stop) => stop.is_last);
  const lastStopNumber =
    lastStops.length > 0 ? lastStops[0].stop_number : Number.MAX_VALUE;
  processedResults = processedResults.filter(
    (result) => result.stop_number <= lastStopNumber
  );

  return processedResults;
};

module.exports = {
  getDepartureRoutes,
  getStopsForRoutes,
  getFullRoutesByStopId,
  getAdditionalStopsForRoutes,
  processRouteStops,
};

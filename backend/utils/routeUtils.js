const { executeQuery } = require("../utils/sqlHelper");

/**
 * Get departure routes
 * @returns {Promise<Array>} Departure routes
 */
const getDepartureRoutes = async () => {
  return executeQuery(`
    SELECT DISTINCT dr.id, dr.route_id
    FROM departure_route dr
    JOIN timetable t ON t.route_id = dr.id
  `);
};

/**
 * Process route stops
 * @param {Array} results - Raw stop data
 * @param {Array} additionalStops - Additional stops to include
 * @returns {Array} Processed stops
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
  processRouteStops,
};

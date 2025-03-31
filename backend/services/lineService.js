const { executeQuery } = require("../utils/sqlHelper");
const { NotFoundError } = require("../utils/errorHandler");
const { getAllDepartureRoutes, getDepartureRoutes } = require("./routeService");
const {
  getLineDataByRouteId,
  getStopsForRoute,
  getAdditionalStops,
} = require("./timetableService");
const { processRouteStops } = require("../utils/routeUtils");

// Simple in-memory cache
let linesCache = null;
let linesCacheTime = 0;

/**
 * Get all lines
 * @param {boolean} useCache - Whether to use the cache
 * @returns {Promise<Array>} All lines
 */
const getAllLines = async (useCache = true) => {
  // Use cache if it's less than 5 minutes old
  if (useCache && linesCache && Date.now() - linesCacheTime < 300000) {
    return linesCache;
  }

  const query = `
      SELECT lt.namePlural, l.name, lt.color, l.id
      FROM line l
      JOIN line_type lt ON l.line_type_id = lt.id;
    `;

  const results = await executeQuery(query);
  if (!results || results.length === 0) {
    throw new NotFoundError("No transport lines found");
  }

  linesCache = results;
  linesCacheTime = Date.now();

  return results;
};

/**
 * Get all lines grouped by their line type
 * @returns {Promise<Object<string, Array<{name: string, color: string, id: number}>>} Lines grouped by category
 */
const getLinesCategorized = async () => {
  const lines = await getAllLines();

  const groupedLines = lines.reduce((acc, line) => {
    const { namePlural, name, color, id } = line;
    if (!acc[namePlural]) {
      acc[namePlural] = [];
    }

    acc[namePlural].push({ name, color, id });

    return acc;
  }, {});

  return groupedLines;
};

/**
 * Get all lines
 * @param {boolean} useCache - Whether to use the cache
 * @returns {Promise<Array>} All lines
 */
const getLinesFullRoutes = async (useCache = true) => {
  // Use cache if it's less than 5 minutes old
  if (useCache && linesCache && Date.now() - linesCacheTime < 300000) {
    //return linesCache;
  }

  const departureRoutes = await getDepartureRoutes();

  const departurePromises = departureRoutes.map(async (route) => {
    const line = (await getLineDataByRouteId(route.route_id))[0];
    const allStops = (await getStopsForRoute(route.route_id))
      .map((result) => ({ ...result, stop_number: Number(result.stop_number) }))
      .sort((a, b) => a.stop_number - b.stop_number);

    const additionalStops = await getAdditionalStops(route.id);

    const processedStops = processRouteStops(allStops, additionalStops);

    return [processedStops];
  });

  const departureResults = await Promise.all(departurePromises);
  const departures = departureResults.flat();
  //linesCache = results;
  linesCacheTime = Date.now();

  return departures;
};

module.exports = {
  getLinesCategorized,
  getAllLines,
  getLinesFullRoutes,
};

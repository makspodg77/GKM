const { executeQuery } = require("../utils/sqlHelper");
const { NotFoundError, ValidationError } = require("../utils/errorHandler");
const { processRouteStops } = require("../utils/routeUtils");

const {
  getLineDataByRouteId,
  getStopsForRoute,
  getAdditionalStops,
} = require("./timetableService");

let linesCache = null;
let linesCacheTime = 0;
let linesFullRoutesCache = null;
let linesFullRoutesCacheTime = 0;

/**
 * Get all departure routes directly
 * @returns {Promise<Array>} Departure route data
 */
const getDepartureRoutesDirectly = async () => {
  const result = await executeQuery(`SELECT * FROM departure_route`);
  return result;
};

/**
 * Get all lines
 * @param {boolean} useCache - Whether to use the cache
 * @returns {Promise<Array>} All lines
 */
const getAllLines = async (useCache = true) => {
  if (useCache && linesCache && Date.now() - linesCacheTime < 300000) {
    return linesCache;
  }

  const query = `
      SELECT lt.name_plural, l.name, lt.color, l.id
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
 * @param {boolean} [useCache=true] - Whether to use the cache
 * @returns {Promise<Object<string, Array<{name: string, color: string, id: number}>>} Lines grouped by category
 */
const getLinesCategorized = async (useCache = true) => {
  const lines = await getAllLines(useCache);

  const groupedLines = lines.reduce((acc, line) => {
    const { name_plural, name, color, id } = line;
    if (!acc[name_plural]) {
      acc[name_plural] = [];
    }

    acc[name_plural].push({ name, color, id });

    return acc;
  }, {});

  return groupedLines;
};

const removeDuplicates = (stops) => {
  let result = [];
  let previousStreet = null;

  for (const stop of stops) {
    if (!stop.street) continue;

    if (stop.street !== previousStreet) {
      result.push(stop.street);
      previousStreet = stop.street;
    }
  }

  return result;
};

/**
 * Get all lines with their full route information
 * @param {boolean} [useCache=true] - Whether to use the cache
 * @returns {Promise<Object>} Lines grouped by type and name with their full routes
 */
const getLinesFullRoutes = async (useCache = true) => {
  if (
    useCache &&
    linesFullRoutesCache &&
    Date.now() - linesFullRoutesCacheTime < 300000
  ) {
    return linesFullRoutesCache;
  }

  const departureRoutes = await getDepartureRoutesDirectly();
  if (!departureRoutes || !departureRoutes.length) {
    throw new NotFoundError("No departure routes found");
  }

  const departurePromises = departureRoutes.map(async (route) => {
    try {
      const line = (await getLineDataByRouteId(route.route_id))[0];
      if (!line) {
        return null;
      }

      const allStops = (await getStopsForRoute(route.route_id))
        .map((result) => ({
          ...result,
          stop_number: Number(result.stop_number),
        }))
        .sort((a, b) => a.stop_number - b.stop_number);

      if (!allStops || !allStops.length) {
        return null;
      }

      const additionalStops = await getAdditionalStops(route.id);
      const processedStops = processRouteStops(allStops, additionalStops);

      return { line, stops: processedStops };
    } catch (error) {
      console.error(`Error processing departure route ${route.id}:`, error);
      return null;
    }
  });

  const getRouteKey = (first, last) => {
    if (!first || !last || !first.name || !last.name) {
      return null;
    }
    const stopNames = [first.name, last.name].sort().join("-");
    return stopNames;
  };

  const usedRoutes = new Set();
  const departureResults = (await Promise.all(departurePromises)).filter(
    Boolean
  );

  const reducedDepartures = departureResults.reduce((acc, obj) => {
    if (!obj || !obj.line || !obj.stops || !obj.stops.length) {
      return acc;
    }

    const { line, stops } = obj;

    if (stops.length < 2) {
      return acc;
    }

    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];
    const routeKey = getRouteKey(firstStop, lastStop);

    if (!routeKey || usedRoutes.has(routeKey)) {
      return acc;
    }

    if (!acc[line.name_plural]) acc[line.name_plural] = { color: line.color };
    if (!acc[line.name_plural][line.name]) {
      acc[line.name_plural][line.name] = [];
    }

    acc[line.name_plural][line.name].push({
      first_stop: firstStop.name,
      last_stop: lastStop.name,
      streets: stops,
    });

    usedRoutes.add(routeKey);
    return acc;
  }, {});

  linesFullRoutesCache = reducedDepartures;
  linesFullRoutesCacheTime = Date.now();

  return reducedDepartures;
};

const refreshCache = async () => {
  linesCache = null;
  linesFullRoutesCache = null;
  await getAllLines(false);
  await getLinesFullRoutes(false);
  return { success: true, message: "Cache refreshed successfully" };
};

/**
 * Get all lines that stop at a specific stop, excluding a specified line
 * @param {number} stopId - ID of the stop
 * @param {number} lineId - ID of the line to exclude
 * @returns {Promise<Array>} Lines that pass through the stop, excluding the specified line
 */
const getOtherLinesAtStop = async (stopId, lineId) => {
  if (!stopId || isNaN(parseInt(stopId))) {
    throw new ValidationError("stop ID parameter is required");
  }

  if (!lineId || isNaN(parseInt(lineId))) {
    throw new ValidationError("line ID parameter is required");
  }

  const query = `
  SELECT DISTINCT lt.color, l.name, fr.stop_number, r.id AS route_id 
  FROM line l 
  JOIN route r ON l.id = r.line_id
  JOIN full_route fr ON r.id = fr.route_id AND fr.stop_id = @stopId
  JOIN line_type lt ON lt.id = l.line_type_id
  WHERE l.id != @lineId AND fr.is_last != 1
  `;

  const results = await executeQuery(query, {
    stopId: parseInt(stopId),
    lineId: parseInt(lineId),
  });

  return results;
};

/**
 * Gets basic data about the line
 * @param {number} lineId - ID of the line
 * @returns {object} data about the line
 */
const getLine = async (lineId) => {
  if (!lineId || isNaN(parseInt(lineId))) {
    throw new ValidationError(`Line ID parameter is required`);
  }

  const lineExists = await executeQuery(
    `SELECT 1 FROM line WHERE id = @lineId`,
    {
      lineId,
    }
  );
  if (!lineExists.length) {
    throw new NotFoundError(`Line with ID = ${lineId} does not exist`);
  }

  const query = `
      SELECT l.name, lt.name_singular, lt.color, lt.name_plural, l.id
      FROM line l 
      JOIN line_type lt ON lt.id = l.line_type_id 
      WHERE l.id = @lineId`;

  const results = await executeQuery(query, { lineId });
  return results[0];
};

module.exports = {
  getLinesCategorized,
  getAllLines,
  getLinesFullRoutes,
  getOtherLinesAtStop,
  removeDuplicates,
  getLine,
  refreshCache,
};

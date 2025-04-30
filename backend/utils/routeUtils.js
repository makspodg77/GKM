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
  // Normalize all stop numbers to numeric and sort by stop number
  let processedResults = results
    .map((result) => ({ ...result, stop_number: Number(result.stop_number) }))
    .sort((a, b) => a.stop_number - b.stop_number);

  // Create a map of additional stops for efficient lookups
  const additionalStopMap = {};
  additionalStops.forEach((stop) => {
    additionalStopMap[Number(stop.stop_number)] = stop;
  });

  // Get the one true first stop (the earliest first stop that's marked in additionalStops)
  let effectiveFirstStopNumber = null;

  // First check additionalStops for a first stop
  const additionalFirstStops = additionalStops
    .filter((stop) => stop.is_first)
    .sort((a, b) => Number(a.stop_number) - Number(b.stop_number));

  if (additionalFirstStops.length > 0) {
    effectiveFirstStopNumber = Number(additionalFirstStops[0].stop_number);
  } else {
    // If no first stop in additionalStops, use the default first stop
    const defaultFirstStops = processedResults
      .filter((stop) => stop.is_first && !stop.is_optional)
      .sort((a, b) => a.stop_number - b.stop_number);

    if (defaultFirstStops.length > 0) {
      effectiveFirstStopNumber = defaultFirstStops[0].stop_number;
    }
  }

  // Now mark stops that should be included based on additional stops
  processedResults = processedResults.map((result) => {
    const stopNumber = Number(result.stop_number);
    const additionalStop = additionalStopMap[stopNumber];

    // Special handling for first stops
    if (result.is_first && stopNumber === effectiveFirstStopNumber) {
      return {
        ...result,
        is_included: true,
        is_effective_first: true, // Mark the effective first stop
      };
    }

    // Prevent other first stops from being marked as first
    if (result.is_first && stopNumber !== effectiveFirstStopNumber) {
      return {
        ...result,
        is_first: additionalStop ? additionalStop.is_first : false,
        is_included: additionalStop ? true : !result.is_optional,
      };
    }

    // If this is an additional stop, include it regardless of optional status
    if (additionalStop) {
      return {
        ...result,
        is_included: true,
        // Override is_last if specified in additionalStop
        is_last: additionalStop.is_last || result.is_last,
      };
    }

    // Include non-optional stops
    if (!result.is_optional) {
      return { ...result, is_included: true };
    }

    // Exclude optional stops not in additionalStops
    return { ...result, is_included: false };
  });

  // Find the effective last stops
  const includedStops = processedResults.filter((stop) => stop.is_included);
  const lastStops = includedStops.filter((stop) => stop.is_last);

  // Use the last "last stop" if available
  const effectiveLastStop =
    lastStops.length > 0
      ? lastStops.reduce(
          (latest, stop) =>
            stop.stop_number > latest.stop_number ? stop : latest,
          lastStops[0]
        )
      : { stop_number: Number.MAX_VALUE };

  // Filter stops to include only those within range and explicitly included
  processedResults = processedResults.filter((result) => {
    // Always include stops explicitly in additionalStops
    if (additionalStopMap[result.stop_number]) {
      return true;
    }

    // Include non-optional stops within range
    if (effectiveFirstStopNumber !== null) {
      return (
        !result.is_optional &&
        result.stop_number >= effectiveFirstStopNumber &&
        result.stop_number <= effectiveLastStop.stop_number
      );
    } else {
      return (
        !result.is_optional &&
        result.stop_number <= effectiveLastStop.stop_number
      );
    }
  });

  // Clean up temporary properties
  return processedResults.map(
    ({ is_included, is_effective_first, ...rest }) => rest
  );
};

module.exports = {
  getDepartureRoutes,
  processRouteStops,
};

const { executeQuery } = require("../utils/sqlHelper");
const { NotFoundError } = require("../utils/errorHandler");
const { getDeparturesForStop } = require("./departureService");

let stopGroupCache = {};
let stopGroupCacheTime = Date.now();
const CACHE_TIMEOUT_MS = 300000;

/**
 * Get all stops in a group
 * @param {number} groupId - Group ID
 * @returns {Promise<Array>} Stops in the group
 */
const getStopsByGroupId = async (groupId) => {
  if (!groupId || isNaN(parseInt(groupId))) {
    throw new NotFoundError("Group ID is required and must be a number");
  }

  const stops = await executeQuery(
    `SELECT 
      stop.id AS stop_id, 
      stop_group.id AS group_id, 
      stop_group.name AS group_name, 
      stop.map, 
      stop.street 
    FROM stop_group 
    JOIN stop ON stop.stop_group_id = stop_group.id 
    WHERE stop_group.id = @groupId`,
    { groupId }
  );

  if (!stops.length) {
    throw new NotFoundError(`No stops found for group with ID ${groupId}`);
  }

  return stops;
};

/**
 * Get all stops in a group with their departures
 * @param {number} groupId - Group ID
 * @returns {Promise<Object>} Group data with stops and departures
 */
const getStopGroupWithDepartures = async (groupId) => {
  if (
    stopGroupCache[groupId] &&
    Date.now() - stopGroupCacheTime < CACHE_TIMEOUT_MS
  ) {
    return stopGroupCache[groupId];
  }

  const groupData = await executeQuery(
    `SELECT 
      stop_group.id AS group_id, 
      stop_group.name AS group_name, 
      stop.id AS stop_id, 
      stop.map,
      stop.alias,
      stop.street
    FROM stop_group
    LEFT JOIN stop ON stop.stop_group_id = stop_group.id
    WHERE stop_group.id = @groupId`,
    { groupId }
  );

  if (!groupData.length) {
    throw new NotFoundError(`Stop group with ID = ${groupId} does not exist`);
  }

  const stops = groupData.map((row) => ({
    group_id: row.group_id,
    group_name: row.group_name,
    stop_id: row.stop_id,
    map: row.map,
    street: row.street,
  }));

  const stopsWithDepartures = await Promise.all(
    stops.map(async (stop) => {
      try {
        if (!stop.stop_id) return stop;

        const departures = await getDeparturesForStop(stop.stop_id);
        return {
          departures: departures.departures,
          stop,
        };
      } catch (error) {
        console.error(
          `Error getting departures for stop ${stop.stop_id}:`,
          error
        );
        return {
          departures: [],
          error: "Failed to load departures",
        };
      }
    })
  );

  const result = stopsWithDepartures.filter(Boolean);

  stopGroupCache[groupId] = result;
  stopGroupCacheTime = Date.now();

  return result;
};

module.exports = {
  getStopsByGroupId,
  getStopGroupWithDepartures,
};

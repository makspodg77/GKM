const { executeQuery } = require("../utils/sqlHelper");
const { NotFoundError } = require("../utils/errorHandler");

const getStopsByGroupId = async (groupId) => {
  return executeQuery(
    `SELECT stop.id AS stop_id, stop_group.id AS group_id, name, map, street FROM stop_group JOIN stop ON stop.stop_group_id = stop_group.id WHERE stop_group.id = @groupId`,
    { groupId }
  );
};

/**
 * Get all stops in a group with their departures
 * @param {number} groupId - Group ID
 * @returns {Promise<Object>} Group data with stops and departures
 */
const getStopGroupWithDepartures = async (groupId) => {
  const groupData = await executeQuery(
    `SELECT 
        stop_group.id AS group_id, 
        stop_group.name,
        stop.id AS stop_id, 
        stop.map,
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
    group_id: groupData[0].group_id,
    name: groupData[0].group_name,
    stop_id: row.stop_id,
    name: row.stop_name,
    map: row.map,
    street: row.street,
  }));

  const stopsWithDepartures = await Promise.all(
    stops.map(async (stop) => {
      const departures = await getDeparturesForStop(stop.stop_id);
      return {
        ...stop,
        departures: departures.departures,
      };
    })
  );

  return stopsWithDepartures;
};

module.exports = {
  getStopsByGroupId,
  getStopGroupWithDepartures,
};

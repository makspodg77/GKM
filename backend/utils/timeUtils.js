/**
 * Adds minutes to a time value without timezone adjustments
 * @param {string|Date} time - Time to add minutes to
 * @param {number} minutesToAdd - Minutes to add
 * @returns {string} New time in HH:MM format
 */
const addMinutesToTime = (time, minutesToAdd) => {
  if (time instanceof Date) {
    const hours = time.getUTCHours();
    const minutes = time.getUTCMinutes();

    let totalMinutes = hours * 60 + minutes + minutesToAdd;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMinutes = totalMinutes % 60;

    return `${newHours.toString().padStart(2, "0")}:${newMinutes
      .toString()
      .padStart(2, "0")}`;
  }

  if (typeof time === "string") {
    if (time.includes("T")) {
      time = time.substr(11, 5);
    }
  } else {
    time = String(time);
  }

  let [hours, minutes] = time.split(":").map(Number);

  let totalMinutes = hours * 60 + minutes + minutesToAdd;
  let newHours = Math.floor(totalMinutes / 60) % 24;
  let newMinutes = totalMinutes % 60;

  return `${newHours.toString().padStart(2, "0")}:${newMinutes
    .toString()
    .padStart(2, "0")}`;
};

/**
 * Validates time string in HH:MM format
 * @param {string} time - Time string to validate
 * @returns {boolean} Whether the time is valid
 */
const isValidTimeFormat = (time) => {
  const timeFormatRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeFormatRegex.test(time);
};

module.exports = {
  addMinutesToTime,
  isValidTimeFormat,
};

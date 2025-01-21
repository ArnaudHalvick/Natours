// utils/dateUtils.js

/**
 * Normalizes a date to UTC midnight
 * @param {Date|string} date - The date to normalize
 * @returns {string} ISO string representation of UTC midnight
 */
exports.normalizeToUTCMidnight = date => {
  const d = new Date(date);
  const utcDate = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  return utcDate.toISOString();
};

/**
 * Compares two dates for same-day equality in UTC
 * @param {Date|string} date1
 * @param {Date|string} date2
 * @returns {boolean}
 */
exports.isSameUTCDay = (date1, date2) => {
  const d1 = new Date(exports.normalizeToUTCMidnight(date1));
  const d2 = new Date(exports.normalizeToUTCMidnight(date2));
  return d1.getTime() === d2.getTime();
};

/**
 * Validates if a string is a valid ISO date
 * @param {string} dateString
 * @returns {boolean}
 */
exports.isValidISODate = dateString => {
  if (typeof dateString !== "string") return false;
  const date = new Date(dateString);
  return !isNaN(date) && date.toISOString() === dateString;
};

/**
 * Formats a date for display in the user's timezone
 * @param {Date|string} date
 * @param {string} timezone - e.g., 'America/New_York'
 * @returns {string}
 */
exports.formatLocalDate = (date, timezone = "UTC") => {
  return new Date(date).toLocaleString("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Gets the start of day in UTC for a given date
 * @param {Date|string} date
 * @returns {Date}
 */
exports.getUTCStartOfDay = date => {
  const d = new Date(date);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
};

/**
 * Validates if a date is in the future
 * @param {Date|string} date
 * @returns {boolean}
 */
exports.isFutureDate = date => {
  const normalizedDate = exports.getUTCStartOfDay(date);
  const today = exports.getUTCStartOfDay(new Date());
  return normalizedDate > today;
};

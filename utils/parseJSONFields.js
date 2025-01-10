// utils/parseJSONFields.js
const AppError = require("./appError");

exports.parseJSONFields = fields => (req, res, next) => {
  fields.forEach(field => {
    if (req.body[field] && typeof req.body[field] === "string") {
      try {
        req.body[field] = JSON.parse(req.body[field]);
      } catch (err) {
        return next(
          new AppError(`Invalid JSON data for "${field}": ${err.message}`, 400),
        );
      }
    }
  });
  return next();
};

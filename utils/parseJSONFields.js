// utils/parseJSONFields.js
const AppError = require("./appError");

exports.parseJSONFields = fields => {
  return (req, res, next) => {
    try {
      fields.forEach(field => {
        if (req.body[field]) {
          try {
            if (typeof req.body[field] === "string") {
              req.body[field] = JSON.parse(req.body[field]);
            }
          } catch (err) {
            return next(new AppError(`Invalid JSON in field: ${field}`, 400));
          }
        }
      });

      next();
    } catch (err) {
      next(err);
    }
  };
};

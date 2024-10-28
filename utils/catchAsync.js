// catchAsync: A utility function to catch errors in async route handlers
module.exports = fn => {
  return (req, res, next) => {
    // Execute the async function (fn) and catch any errors
    fn(req, res, next).catch(next); // If an error occurs, pass it to the next() function (Express error handler)
  };
};

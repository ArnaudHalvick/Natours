const express = require("express");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const compression = require("compression");

const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const bookingRouter = require("./routes/bookingRoutes");
const viewRouter = require("./routes/viewRoutes");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");

const app = express();

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy");
}

// 1) Set Pug as the template engine
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// 2) GLOBAL MIDDLEWARES

// 2.1) Security Middleware: Set Security HTTP Headers
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://api.mapbox.com",
        "https://cdnjs.cloudflare.com",
        "https://js.stripe.com",
      ],
      styleSrc: [
        "'self'",
        "https://api.mapbox.com",
        "https://fonts.googleapis.com",
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://api.mapbox.com"],
      connectSrc: [
        "'self'",
        "https://api.mapbox.com",
        "https://events.mapbox.com",
        "https://api.stripe.com",
      ],
      frameSrc: ["'self'", "https://js.stripe.com"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"],
    },
  },
};

// If the app is running in development mode, allow WebSocket connections
if (process.env.NODE_ENV === "development") {
  helmetConfig.contentSecurityPolicy.directives.connectSrc.push(
    "ws://127.0.0.1:*",
  );
}

// Use Helmet with the updated configuration
app.use(helmet(helmetConfig));

// Development Logging Middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev")); // Logs requests in the development environment
}

// Rate Limiting Middleware: Limit requests from the same IP
const limiter = rateLimit({
  max: 100, // Max 100 requests per IP
  windowMs: 60 * 60 * 1000, // 1 hour window
  message: "Too many requests from this IP, please try again in an hour",
});
app.use("/api", limiter); // Apply rate limiting to API routes

// Body Parser: Read incoming data into `req.body` (limit 10kb)
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Data Sanitization against NoSQL Injection
app.use(mongoSanitize()); // Sanitize input to prevent NoSQL injection attacks

// Data Sanitization against XSS
app.use(xss()); // Sanitize input to prevent cross-site scripting (XSS) attacks

// Prevent Parameter Pollution (Allow certain params)
app.use(
  hpp({
    whitelist: [
      "duration",
      "price",
      "ratingsAverage",
      "ratingsQuantity",
      "maxGroupSize",
      "difficulty",
      "startDates",
    ],
  }),
);

app.use(compression());

// Serving static files (e.g., images, CSS, JS)
app.use(express.static(path.join(__dirname, "public")));

// Custom Middleware: Add request time to `req` object
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// 3) ROUTES

// Mounting routers for different resource routes
app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);

// 4) Handling Undefined Routes
app.all("*", (req, res, next) => {
  // Create an error and pass it to the global error handler
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 5) Global Error Handling Middleware
app.use(globalErrorHandler);

module.exports = app;

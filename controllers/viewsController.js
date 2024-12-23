const Tour = require("../models/tourModel");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Review = require("../models/reviewModel");

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === "booking")
    res.locals.alert =
      "Your booking was successful! Please check your email for confirmation. If your booking doesn't show up here immediatly, please come back later.";
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Render template using tour data from 1)
  res.status(200).render("overview", {
    title: "All Tours",
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: "reviews",
    select: "review rating user", // Corrected to `select`
  });

  if (!tour) {
    return next(new AppError("There is no tour with that name.", 404));
  }

  // 2) Render the template using the tour data
  res.status(200).render("tour", {
    title: `${tour.name}`,
    tour,
  });
});

exports.getLogin = (req, res) => {
  res.status(200).render("login", {
    title: "Log into your account",
  });
};

exports.getSignup = (req, res) => {
  res.status(200).render("signup", {
    title: "Create a new account",
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render("account", {
    title: "Your account",
  });
};

// viewsController.js
exports.getMyTours = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).populate("tour");

    // Decide whether we have an alert to show
    let alertObj = null;

    if (req.query.alert === "reviewSuccess") {
      alertObj = { type: "success", message: "Review posted successfully!" };
    } else if (req.query.alert === "alreadyReviewed") {
      alertObj = {
        type: "error",
        message: "You have already posted a review for this tour!",
      };
    }

    // If we have an alert object, convert it to JSON; otherwise null
    const alertJSON = alertObj ? JSON.stringify(alertObj) : null;

    res.status(200).render("mytours", {
      title: "My Tours",
      bookings,
      alert: alertJSON, // <-- we'll pass this directly into base.pug's body(data-alert=...)
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.getCheckout = catchAsync(async (req, res, next) => {
  // 1. Get the tour data based on the slug
  const tour = await Tour.findOne({ slug: req.params.slug });

  if (!tour) {
    return next(new AppError("There is no tour with that name.", 404));
  }

  // 2. Filter out fully booked dates and include participants count
  const availableStartDates = tour.startDates
    .filter(startDate => startDate.participants < tour.maxGroupSize)
    .map(startDate => ({
      date: startDate.date,
      availableSpots: tour.maxGroupSize - startDate.participants,
    }));

  // 3. Render the booking page with the tour data and filtered start dates
  res.status(200).render("checkout", {
    title: `Book ${tour.name} Tour`,
    tour,
    availableStartDates,
  });
});

exports.getCheckEmail = (req, res) => {
  res.status(200).render("checkEmail", {
    title: "Check Your Email",
  });
};

exports.getConfirmSuccess = (req, res) => {
  res.status(200).render("confirmSuccess", {
    title: "Email Confirmed",
  });
};

exports.getVerify2FA = (req, res) => {
  res.status(200).render("verify2fa", {
    title: "Enter 2FA Code",
    email: req.query.email,
  });
};

exports.getReviewPage = catchAsync(async (req, res, next) => {
  const { tourId } = req.params;
  // Optionally, fetch the tour to display some info (like the tour's name).
  // e.g., const tour = await Tour.findById(tourId);

  // If you want to ensure the tour exists:
  // if (!tour) {
  //   return next(new AppError('No tour found with that ID.', 404));
  // }

  res.status(200).render("review", {
    title: "Write a Review",
    // tour, // pass if you fetched the tour
    tourId, // pass the id for the form action
  });
});

exports.createReviewAndRender = catchAsync(async (req, res, next) => {
  const { tour, user } = req.body; // setTourUserIds put them in req.body

  try {
    // 1) Check for existing
    const existingReview = await Review.findOne({ tour, user });
    if (existingReview) {
      // User already posted a review
      return res.redirect("/my-tours?alert=alreadyReviewed");
    }

    // 2) Create if not found
    await Review.create(req.body);

    // 3) Redirect with success
    return res.redirect("/my-tours?alert=reviewSuccess");
  } catch (err) {
    return next(err);
  }
});

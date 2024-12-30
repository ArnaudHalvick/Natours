const Tour = require("../models/tourModel");
const Booking = require("../models/bookingModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Review = require("../models/reviewModel");
const Refund = require("../models/refundModel");

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
    select: "review rating user",
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
  // If no JWT cookie, try to get it from query params
  if (!req.cookies.jwt && req.query.jwt) {
    res.cookie("jwt", req.query.jwt, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 86400000,
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  try {
    // Fetch user bookings and associated tours
    const bookings = await Booking.find({ user: req.user.id }).populate("tour");

    // Fetch user refunds and create a mapping of bookingId to refund status
    const refunds = await Refund.find({ user: req.user.id });
    const refundsByBooking = {};
    refunds.forEach(refund => {
      refundsByBooking[refund.booking.toString()] = refund.status;
    });

    // Pass bookings and refunds mapping to template
    res.status(200).render("mytours", {
      title: "My Tours",
      bookings,
      refundsByBooking,
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

exports.getReviewForm = async (req, res, next) => {
  // 1) Find the tour by slug
  const tour = await Tour.findOne({ slug: req.params.slug });
  if (!tour) {
    return next(new AppError("No tour found with that slug.", 404));
  }

  // 2) Confirm the user has a booking for this tour that has already started
  const booking = await Booking.findOne({
    user: req.user.id,
    tour: tour._id,
  });

  if (!booking) {
    return next(new AppError("You have not booked this tour.", 403));
  }

  const hasStarted = new Date(booking.startDate) < new Date();
  if (!hasStarted) {
    return next(
      new AppError(
        "You cannot write a review before the tour has started.",
        403,
      ),
    );
  }

  // 3) Render the review form (if checks pass)
  res.status(200).render("review", {
    title: `Review ${tour.name}`,
    tour,
  });
};

exports.getEditReviewForm = catchAsync(async (req, res, next) => {
  // 1) Find the tour
  const tour = await Tour.findOne({ slug: req.params.slug });
  if (!tour) {
    return next(new AppError("No tour found with that slug.", 404));
  }

  // 2) Find the review by ID
  const review = await Review.findById(req.params.reviewId);
  if (!review) {
    return next(new AppError("No review found with that ID.", 404));
  }

  // (Optional) Ensure the user owns this review, else 403
  if (review.user._id.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new AppError("You do not have permission to edit this review.", 403),
    );
  }

  // 3) Render the edit form
  res.status(200).render("editReview", {
    title: `Edit Review for ${tour.name}`,
    tour,
    review,
  });
});

exports.getMyReviews = catchAsync(async (req, res, next) => {
  // 1) Find all reviews by the logged-in user
  const reviews = await Review.find({ user: req.user.id }).populate("tour");

  // 2) Render the `my-reviews` template with the user's reviews
  res.status(200).render("myreviews", {
    title: "My Reviews",
    reviews,
    user: req.user, // Pass the current user to render the side menu
  });
});

exports.getBillingPage = catchAsync(async (req, res, next) => {
  // 1) Get all transactions (bookings) for the current user
  const transactions = await Booking.find({ user: req.user.id }).populate(
    "tour",
  );

  // 2) Calculate totalSpent
  let totalSpent = 0;
  transactions.forEach(transaction => {
    totalSpent += transaction.price;
  });

  // 3) Render the billing template
  res.status(200).render("billing", {
    title: "Billing",
    transactions,
    totalSpent,
  });
});

exports.getManageRefunds = catchAsync(async (req, res, next) => {
  const refunds = await Refund.find().populate("booking user");

  res.status(200).render("manageRefunds", {
    title: "Manage Refunds",
    refunds,
  });
});

// Importing required models and utilities
const Tour = require("../models/tourModel");
const Booking = require("../models/bookingModel");
const Review = require("../models/reviewModel");
const Refund = require("../models/refundModel");
const catchAsync = require("../utils/catchAsync");

const AppError = require("../utils/appError");

// Middleware to handle alerts based on query parameters
exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === "booking")
    res.locals.alert =
      "Your booking was successful! Please check your email for confirmation. If your booking doesn't show up here immediately, please come back later.";
  next();
};

// Render overview page showing all tours
exports.getOverview = catchAsync(async (req, res) => {
  const tours = await Tour.find();
  res.status(200).render("pages/tour/overview", {
    title: "All Tours",
    tours,
  });
});

// Render a specific tour page with reviews
exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: "reviews",
    select: "review rating user",
  });

  if (!tour) return next(new AppError("There is no tour with that name.", 404));

  res.status(200).render("pages/tour/tour", {
    title: `${tour.name}`,
    tour,
  });
});

// Render login page
exports.getLogin = (req, res) => {
  res.status(200).render("pages/auth/login", {
    title: "Log into your account",
  });
};

// Render signup page
exports.getSignup = (req, res) => {
  res.status(200).render("pages/auth/signup", {
    title: "Create a new account",
  });
};

// Render user account page
exports.getAccount = (req, res) => {
  res.status(200).render("pages/account/account", {
    title: "Your account",
  });
};

// Render user's booked tours, refunds, and reviews
exports.getMyTours = catchAsync(async (req, res) => {
  const [bookings, refunds, reviews] = await Promise.all([
    Booking.find({ user: req.user.id }).populate("tour"),
    Refund.find({ user: req.user.id }),
    Review.find({ user: req.user.id }),
  ]);

  const refundsByBooking = refunds.reduce((acc, refund) => {
    acc[refund.booking._id.toString()] = refund.status;
    return acc;
  }, {});

  const reviewsByTour = reviews.reduce((acc, review) => {
    acc[review.tour.toString()] = review;
    return acc;
  }, {});

  res.status(200).render("pages/account/mytours", {
    title: "My Tours",
    bookings,
    refundsByBooking,
    reviewsByTour,
  });
});

// Render email verification page
exports.getCheckEmail = (req, res) => {
  res.status(200).render("emails/checkEmail", {
    title: "Check Your Email",
  });
};

// Render email confirmation success page
exports.getConfirmSuccess = (req, res) => {
  res.status(200).render("emails/confirmSuccess", {
    title: "Email Confirmed",
  });
};

// Render 2FA verification page
exports.getVerify2FA = (req, res) => {
  res.status(200).render("pages/auth/verify2fa", {
    title: "Enter 2FA Code",
    email: req.query.email,
  });
};

// Render reset password form
exports.getResetPasswordForm = (req, res) => {
  res.status(200).render("pages/auth/resetPassword", {
    title: "Reset your password",
    token: req.params.token,
  });
};

// Render checkout page for booking a tour
exports.getCheckout = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug });

  if (!tour) return next(new AppError("There is no tour with that name.", 404));

  const availableStartDates = tour.startDates
    .filter(startDate => startDate.participants < tour.maxGroupSize)
    .map(startDate => ({
      date: startDate.date,
      availableSpots: tour.maxGroupSize - startDate.participants,
    }));

  res.status(200).render("pages/booking/checkout", {
    title: `Book ${tour.name} Tour`,
    tour,
    availableStartDates,
  });
});

// Render review form for a booked tour
exports.getReviewForm = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug });
  if (!tour) return next(new AppError("No tour found with that slug.", 404));

  const booking = await Booking.findOne({ user: req.user.id, tour: tour._id });
  if (!booking)
    return next(new AppError("You have not booked this tour.", 403));

  const hasStarted = new Date(booking.startDate) < new Date();
  if (!hasStarted)
    return next(
      new AppError(
        "You cannot write a review before the tour has started.",
        403,
      ),
    );

  res.status(200).render("pages/review/review", {
    title: `Review ${tour.name}`,
    tour,
  });
});

// Render form to edit an existing review
exports.getEditReviewForm = catchAsync(async (req, res, next) => {
  const { slug, reviewId } = req.params;

  const tour = await Tour.findOne({ slug });
  if (!tour) return next(new AppError("No tour found with that slug.", 404));

  const review = await Review.findById(reviewId).populate("tour");
  if (!review) return next(new AppError("No review found with that ID.", 404));

  if (review.hidden)
    return next(
      new AppError(
        "This review has been hidden by an admin and cannot be edited.",
        403,
      ),
    );

  res.status(200).render("pages/review/editReview", {
    title: `Edit Your Review for ${tour.name}`,
    review,
    tour,
  });
});

// Render user's reviews page
exports.getMyReviews = catchAsync(async (req, res) => {
  const reviews = await Review.find({ user: req.user.id }).populate("tour");

  res.status(200).render("pages/account/myreviews", {
    title: "My Reviews",
    reviews,
    user: req.user,
  });
});

// Render billing page showing user's transactions and total spending
exports.getBillingPage = catchAsync(async (req, res) => {
  const transactions = await Booking.find({ user: req.user.id }).populate(
    "tour",
  );
  const totalSpent = transactions.reduce(
    (total, transaction) => total + transaction.price,
    0,
  );

  res.status(200).render("pages/account/billing", {
    title: "Billing",
    transactions,
    totalSpent,
  });
});

// Render admin page to manage refunds
exports.getManageRefunds = catchAsync(async (req, res) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  let query = Refund.find().populate("booking").populate("user", "name email");

  if (req.query.status) query = query.find({ status: req.query.status });

  const sortBy = req.query.sort || "-requestedAt";
  query = query.sort(sortBy);

  const [refunds, total] = await Promise.all([
    query.skip(skip).limit(limit),
    Refund.countDocuments(query._conditions),
  ]);

  res.status(200).render("pages/admin/manageRefunds", {
    title: "Manage Refunds",
    refunds,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    currentStatus: req.query.status,
    currentSort: sortBy,
    user: req.user,
  });
});

// Render form to add travelers for a specific booking
exports.getAddTravelers = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const [booking, tour] = await Promise.all([
    Booking.findById(bookingId),
    Tour.findById(booking.tour)
      .select("_id name maxGroupSize startDates slug")
      .lean(),
  ]);

  if (!booking) return next(new AppError("Booking not found", 404));
  if (!tour) return next(new AppError("Tour not found", 404));

  res.status(200).render("pages/booking/addTravelers", {
    title: "Add Travelers",
    booking,
    tour,
  });
});

// Render admin page to manage users
exports.getManageUsersPage = (req, res) => {
  res.status(200).render("pages/admin/manageUsers", {
    title: "Manage Users",
    pageName: "manage Users",
    currentUser: req.user,
  });
};

// Render admin page to manage bookings
exports.getManageBookingsPage = catchAsync(async (req, res) => {
  // Use only inclusion in select
  const tours = await Tour.find()
    .select("name _id") // Only include what we need
    .sort({ name: 1 });

  res.status(200).render("pages/admin/manageBookings", {
    title: "Manage Bookings",
    user: req.user,
    tours,
  });
});
// Render admin page to manage reviews
exports.getManageReviewsPage = catchAsync(async (req, res) => {
  const [reviews, tours] = await Promise.all([
    Review.find().populate("tour", "name").populate("user", "name"),
    Tour.find().select("name"),
  ]);

  res.status(200).render("pages/admin/manageReviews", {
    title: "Manage Reviews",
    reviews,
    tours,
    user: req.user,
  });
});

// Render admin page to manage tours
exports.getManageToursPage = catchAsync(async (req, res) => {
  res.status(200).render("pages/admin/manageTours", {
    title: "Manage Tours",
  });
});

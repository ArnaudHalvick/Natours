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
  const tours = await Tour.find();
  res.status(200).render("pages/tour/overview", {
    title: "All Tours",
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: "reviews",
    select: "review rating user",
  });

  if (!tour) {
    return next(new AppError("There is no tour with that name.", 404));
  }

  res.status(200).render("pages/tour/tour", {
    title: `${tour.name}`,
    tour,
  });
});

exports.getLogin = (req, res) => {
  res.status(200).render("pages/auth/login", {
    title: "Log into your account",
  });
};

exports.getSignup = (req, res) => {
  res.status(200).render("pages/auth/signup", {
    title: "Create a new account",
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render("pages/account/account", {
    title: "Your account",
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  const [bookings, refunds, reviews] = await Promise.all([
    Booking.find({ user: req.user.id }).populate("tour"),
    Refund.find({ user: req.user.id }),
    Review.find({ user: req.user.id }),
  ]);

  const refundsByBooking = refunds.reduce((acc, refund) => {
    acc[refund.booking.toString()] = refund.status;
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

exports.getCheckEmail = (req, res) => {
  res.status(200).render("emails/checkEmail", {
    title: "Check Your Email",
  });
};

exports.getConfirmSuccess = (req, res) => {
  res.status(200).render("emails/confirmSuccess", {
    title: "Email Confirmed",
  });
};

exports.getVerify2FA = (req, res) => {
  res.status(200).render("pages/auth/verify2fa", {
    title: "Enter 2FA Code",
    email: req.query.email,
  });
};

exports.getResetPasswordForm = (req, res, next) => {
  res.status(200).render("pages/auth/resetPassword", {
    title: "Reset your password",
    token: req.params.token,
  });
};

exports.getCheckout = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug });

  if (!tour) {
    return next(new AppError("There is no tour with that name.", 404));
  }

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

exports.getReviewForm = catchAsync(async (req, res, next) => {
  // First find the tour
  const tour = await Tour.findOne({ slug: req.params.slug });

  if (!tour) {
    return next(new AppError("No tour found with that slug.", 404));
  }

  // Then find the booking using the found tour's ID
  const booking = await Booking.findOne({
    user: req.user.id,
    tour: tour._id, // Now tour is defined
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

  res.status(200).render("pages/review/review", {
    title: `Review ${tour.name}`,
    tour,
  });
});

exports.getEditReviewForm = catchAsync(async (req, res, next) => {
  const [tour, review] = await Promise.all([
    Tour.findOne({ slug: req.params.slug }),
    Review.findById(req.params.reviewId),
  ]);

  if (!tour) {
    return next(new AppError("No tour found with that slug.", 404));
  }

  if (!review) {
    return next(new AppError("No review found with that ID.", 404));
  }

  if (review.user._id.toString() !== req.user.id && req.user.role !== "admin") {
    return next(
      new AppError("You do not have permission to edit this review.", 403),
    );
  }

  res.status(200).render("pages/review/editReview", {
    title: `Edit Review for ${tour.name}`,
    tour,
    review,
  });
});

exports.getMyReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ user: req.user.id }).populate("tour");

  res.status(200).render("pages/account/myreviews", {
    title: "My Reviews",
    reviews,
    user: req.user,
  });
});

exports.getBillingPage = catchAsync(async (req, res, next) => {
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

exports.getManageRefunds = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  let query = Refund.find().populate("booking").populate("user", "name email");

  if (req.query.status) {
    query = query.find({ status: req.query.status });
  }

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

exports.getAddTravelers = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;
  const [booking, tour] = await Promise.all([
    Booking.findById(bookingId),
    Tour.findById(booking.tour)
      .select("_id name maxGroupSize startDates slug")
      .lean(),
  ]);

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  if (!tour) {
    return next(new AppError("Tour not found", 404));
  }

  res.status(200).render("pages/booking/addTravelers", {
    title: "Add Travelers",
    booking,
    tour,
  });
});

exports.getManageUsersPage = (req, res) => {
  res.status(200).render("pages/admin/manageUsers", {
    title: "Manage Users",
    pageName: "manage Users",
    currentUser: req.user,
  });
};

exports.getManageBookingsPage = (req, res) => {
  res.status(200).render("pages/admin/manageBookings", {
    title: "Manage Bookings",
    user: req.user,
  });
};

exports.getManageReviewsPage = catchAsync(async (req, res, next) => {
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

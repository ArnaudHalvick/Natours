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

exports.getMyTours = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id }).populate("tour");
  const refunds = await Refund.find({ user: req.user.id });
  const refundsByBooking = refunds.reduce((acc, refund) => {
    acc[refund.booking.toString()] = refund.status;
    return acc;
  }, {});
  const reviews = await Review.find({ user: req.user.id });
  const reviewsByTour = reviews.reduce((acc, review) => {
    acc[review.tour.toString()] = review; // Use tour ID as key
    return acc;
  }, {});

  res.status(200).render("mytours", {
    title: "My Tours",
    bookings,
    refundsByBooking,
    reviewsByTour,
  });
});

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

exports.getResetPasswordForm = (req, res, next) => {
  const { token } = req.params;
  // Render a page with a <form> that includes the hidden token
  res.status(200).render("resetPassword", {
    title: "Reset your password",
    token,
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

exports.getAddTravelers = catchAsync(async (req, res, next) => {
  const { bookingId } = req.params;

  // First, find the booking without populate
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    return next(new AppError("Booking not found", 404));
  }

  // Then, explicitly find and populate the tour, including _id field
  const tour = await Tour.findById(booking.tour)
    .select("_id name maxGroupSize startDates slug") // Added _id and slug
    .lean(); // Use lean() to get a plain JavaScript object

  if (!tour) {
    return next(new AppError("Tour not found", 404));
  }

  res.status(200).render("addTravelers", {
    title: "Add Travelers",
    booking,
    tour,
  });
});

exports.getManageRefunds = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 10;
  const skip = (page - 1) * limit;

  let query = Refund.find().populate("booking").populate("user", "name email");

  // Apply filters if present
  if (req.query.status) {
    query = query.find({ status: req.query.status });
  }

  // Apply sorting
  const sortBy = req.query.sort || "-requestedAt";
  query = query.sort(sortBy);

  // Execute query with pagination
  const refunds = await query.skip(skip).limit(limit);
  const total = await Refund.countDocuments(query._conditions);

  res.status(200).render("manageRefunds", {
    title: "Manage Refunds",
    refunds,
    currentPage: page,
    totalPages: Math.ceil(total / limit),
    currentStatus: req.query.status,
    currentSort: sortBy,
    user: req.user,
  });
});

exports.getManageUsersPage = (req, res) => {
  res.status(200).render("manageUsers", {
    title: "Manage Users",
    pageName: "manage Users",
    currentUser: req.user,
  });
};

exports.getManageBookingsPage = (req, res) => {
  res.status(200).render("manageBookings", {
    title: "Manage Bookings",
    user: req.user,
  });
};

exports.getManageReviewsPage = catchAsync(async (req, res, next) => {
  // Get both reviews and tours
  const [reviews, tours] = await Promise.all([
    Review.find().populate("tour", "name").populate("user", "name"),
    Tour.find().select("name"),
  ]);

  res.status(200).render("manageReviews", {
    title: "Manage Reviews",
    reviews,
    tours,
    user: req.user,
  });
});

const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");
const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();
const { body, validationResult } = require("express-validator");

// Specific rate limiter for authentication routes (login and reset password)
const authLimiter = rateLimit({
  max: 5, // Max 5 attempts in 10 minutes
  windowMs: 10 * 60 * 1000, // 10 minutes
  message: "Too many login attempts, please try again in 10 minutes",
});

// Specific rate limiter for the reset password route
const resetLimiter = rateLimit({
  max: 5, // Max 5 attempts in 10 minutes
  windowMs: 10 * 60 * 1000, // 10 minutes
  message: "Too many password reset attempts, please try again later.",
});

const twoFALimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many attempts, please try again later.",
});

// Confirm the user’s email + 2FA route
router.get("/confirmEmail/:token", authController.confirmEmail);
router.post("/verify2FA", twoFALimiter, authController.verify2FA);
router.post("/resend2FA", twoFALimiter, authController.resendTwoFACode);

// Signup route
router.post(
  "/signup",
  [
    body("name")
      .notEmpty()
      .withMessage("Name is required")
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage("Name must contain only letters and spaces"),
    body("email").isEmail().withMessage("Please provide a valid email"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    body("passwordConfirm")
      .custom((value, { req }) => value === req.body.password)
      .withMessage("Passwords do not match"),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  authController.signup,
);

// Public routes (no authentication required)
router.post("/login", authLimiter, authController.login); // Apply limiter to login
router.get("/logout", authController.logout);
router.post("/forgotPassword", authLimiter, authController.forgotPassword); // Apply limiter to forgot password
router.patch(
  "/resetPassword/:token",
  resetLimiter,
  authController.resetPassword,
); // Apply limiter to reset password

// Protect all routes after this middleware (authenticated users only)
router.use(authController.protect);

// Route for users to get their own information
router.get("/me", userController.getMe, userController.getUser);

// Routes for authenticated users (any logged-in user)
router.patch("/updateMyPassword", authController.updatePassword);
router.patch(
  "/updateMe",
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete("/deleteMe", userController.deleteMe);

// Protect all routes after this middleware for admin users only
router.use(authController.restrictTo("admin"));

// Routes accessible only by admin users
router
  .route("/")
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

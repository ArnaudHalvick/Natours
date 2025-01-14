// userRoutes.js
const express = require("express");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");

const router = express.Router();

/* ==========================================================================
   1) Rate Limiters (adjust numbers/messages as needed)
   ========================================================================== */

// Limit login attempts to avoid brute force
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: "Too many login attempts, please try again in 10 minutes",
});

// Limit password reset requests
const resetLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: "Too many password reset attempts, please try again later.",
});

// Limit 2FA verification attempts
const twoFALimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: "Too many attempts, please try again later.",
});

// Limit resending confirmation (avoid spam)
const resendConfirmationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: "Too many confirmation resends. Please try again later.",
});

/* ==========================================================================
   2) Public Routes (No authentication needed)
   ========================================================================== */

// Route to confirm / verify email via token
router.get("/confirmEmail/:token", authController.confirmEmail);
router.get("/verifyEmailChange/:token", authController.verifyEmailChange);

// 2FA-related routes (verify & resend code)
router.post("/verify2FA", twoFALimiter, authController.verify2FA);
router.post("/resend2FA", twoFALimiter, authController.resendTwoFACode);

// Resend email confirmation if user is unconfirmed
router.post(
  "/resendConfirmation",
  resendConfirmationLimiter,
  authController.resendConfirmation,
);

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

// Login/Logout
router.post("/login", authLimiter, authController.login);
router.get("/logout", authController.logout);
router.post("/refresh-token", authController.refreshAccessToken);

// Forgot/Reset password
router.post("/forgotPassword", authLimiter, authController.forgotPassword);
router.patch(
  "/resetPassword/:token",
  resetLimiter,
  authController.resetPassword,
);

/* ==========================================================================
   3) Protected Routes (Require user to be logged in)
   ========================================================================== */

router.use(authController.protect);

// Current user routes
router.get("/me", userController.getMe, userController.getUser);
router.patch("/updateMyPassword", authController.updatePassword);
router.patch(
  "/updateMe",
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete("/deleteMe", userController.deleteMe);

/* ==========================================================================
   4) Admin-Only Routes
   ========================================================================== */

router.use(authController.restrictTo("admin"));

// Manage all users (admin only)
router
  .route("/")
  .get(userController.getAllUsersRegex)
  .post(userController.createUser);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;

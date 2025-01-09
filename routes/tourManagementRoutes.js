const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const tourController = require("../controllers/tourController");
const viewsController = require("../controllers/viewsController");

router.use(authController.protect);
router.use(authController.restrictTo("admin", "lead-guide"));

router.get("/", viewsController.getManageToursPage);

module.exports = router;

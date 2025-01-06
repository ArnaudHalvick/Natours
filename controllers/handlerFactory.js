const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const APIFeatures = require("./../utils/apiFeatures");

// Get all documents with optional query filters (pagination, sorting, etc.)
exports.getAll = (Model, options = {}) =>
  catchAsync(async (req, res, next) => {
    let filter = { ...req.filter };

    // Create query and apply population if specified
    let query = Model.find(filter);
    if (options.populate) {
      if (Array.isArray(options.populate)) {
        options.populate.forEach(pop => {
          query = query.populate(pop);
        });
      } else {
        query = query.populate(options.populate);
      }
    }

    // Apply other features (sorting, pagination, etc.)
    const features = new APIFeatures(query, req.query)
      .sort()
      .limitFields()
      .paginate();

    // Execute query
    const docs = await features.query;
    const total = await Model.countDocuments(filter);

    // Send response
    res.status(200).json({
      status: "success",
      results: docs.length,
      data: {
        data: docs,
        pagination: {
          total,
          totalPages: Math.ceil(total / features.pagination.limit),
          currentPage: features.pagination.currentPage,
          limit: features.pagination.limit,
        },
      },
    });
  });

// Get a document by ID, optionally populating related fields (e.g., reviews)
exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    // Optionally populate related fields like 'reviews' for tours
    if (populateOptions) query = query.populate(populateOptions);

    // Execute the query
    const doc = await query;

    // If no document is found, return a 404 error
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    // Send success response with the found document
    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

// Update a document by ID
exports.updateOne = Model =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return the updated document
      runValidators: true, // Run validators defined in the model schema
    });

    // If no document is found, return a 404 error
    if (!doc) {
      return next(new AppError(`${Model.modelName} not found`, 404));
    }

    // Send success response with the updated document
    res.status(200).json({
      status: "success",
      data: { data: doc },
    });
  });

// Delete a document by ID with permission check for reviews
exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    // Find the document to delete (for reviews, we check ownership)
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    // Check if the user is the owner or an admin (for reviews only)
    if (
      Model.modelName === "Review" &&
      doc.user._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return next(
        new AppError("You do not have permission to delete this review", 403),
      );
    }

    // Proceed with deletion using findByIdAndDelete
    await Model.findByIdAndDelete(req.params.id);

    // Send success response after deletion
    res.status(204).json({
      status: "success",
      data: null,
    });
  });

// Create a new document, ensuring no duplicate reviews for the same tour/user
exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    try {
      // Create the document (for all models, including reviews)
      const doc = await Model.create(req.body);

      // Send success response with the newly created document
      return res.status(201).json({
        status: "success",
        data: {
          data: doc,
        },
      });
    } catch (err) {
      // If MongoDB duplicate key error => err.code === 11000
      if (err.code === 11000 && Model.modelName === "Review") {
        // We interpret this as "user has already posted a review for this tour"
        return next(
          new AppError("You have already posted a review for this tour.", 400),
        );
      }

      // Otherwise, pass any other errors to the global error handler
      return next(err);
    }
  });

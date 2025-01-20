// Importing required utilities
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

    // Apply sorting, limiting fields, and pagination
    const features = new APIFeatures(query, req.query)
      .sort()
      .limitFields()
      .paginate();

    // Execute query and count total documents for pagination
    const docs = await features.query;
    const total = await Model.countDocuments(filter);

    // Send success response with data and pagination info
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

// Get a document by ID, optionally populating related fields
exports.getOne = (Model, populateOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    // Apply population if specified
    if (populateOptions) query = query.populate(populateOptions);

    // Execute query
    const doc = await query;

    // If no document is found, return 404 error
    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    // Send success response with the document
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
    // 1) Find the document by ID
    const doc = await Model.findById(req.params.id);

    // 2) Check if the document exists
    if (!doc) {
      return next(new AppError(`${Model.modelName} not found`, 404));
    }

    // 3) Check if the document is refunded (only applies to models with `refunded`)
    if (doc.refunded) {
      return next(
        new AppError(
          `Cannot edit a refunded ${Model.modelName.toLowerCase()}.`,
          400,
        ),
      );
    }

    // 4) Proceed to update the document
    const updatedDoc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return the updated document
      runValidators: true, // Run model validators
    });

    // 5) Send success response with the updated document
    res.status(200).json({
      status: "success",
      data: { data: updatedDoc },
    });
  });

// Delete a document by ID with permission check for reviews
exports.deleteOne = Model =>
  catchAsync(async (req, res, next) => {
    // Find the document to delete
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    // Check ownership or admin role if deleting a review
    if (
      Model.modelName === "Review" &&
      doc.user._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return next(
        new AppError("You do not have permission to delete this review", 403),
      );
    }

    // Delete the document
    await Model.findByIdAndDelete(req.params.id);

    // Send success response
    res.status(204).json({
      status: "success",
      data: null,
    });
  });

// Create a new document
exports.createOne = Model =>
  catchAsync(async (req, res, next) => {
    try {
      const doc = await Model.create(req.body);
      return res.status(201).json({
        status: "success",
        data: {
          data: doc,
        },
      });
    } catch (err) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return next(
          new AppError(`A ${field} with this value already exists.`, 400),
        );
      }
      return next(err);
    }
  });

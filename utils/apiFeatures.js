// APIFeatures class to handle filtering, sorting, field limiting, and pagination
class APIFeatures {
  constructor(query, queryString) {
    this.query = query; // Mongoose query object
    this.queryString = queryString; // Query string from the request (req.query)
  }

  // Filtering: Remove non-filter fields and apply advanced filters (gte, gt, lte, lt)
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ["page", "sort", "limit", "fields"];
    excludedFields.forEach(el => delete queryObj[el]);

    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    const queryParsed = JSON.parse(queryStr);

    // Apply regular expressions for partial string matches (for the `name` field in this case)
    if (queryParsed.name) {
      queryParsed.name = { $regex: queryParsed.name, $options: "i" }; // Case-insensitive partial match
    }

    this.query = this.query.find(queryParsed);
    return this;
  }

  // Sorting: Apply sorting based on query parameter (e.g., 'sort=price,name')
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" "); // Convert comma-separated values to space-separated
      this.query = this.query.sort(sortBy); // Apply sorting to the query
    } else {
      this.query = this.query.sort("name"); // Default sorting by 'name' if no sorting is provided
    }
    return this; // Return the instance for method chaining
  }

  // Field limiting: Select specific fields to include or exclude
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" "); // Convert comma-separated fields to space-separated
      this.query = this.query.select(fields); // Apply field selection
    } else {
      this.query = this.query.select("-__v"); // Exclude the '__v' field by default
    }
    return this; // Return the instance for method chaining
  }

  // Pagination: Apply pagination based on 'page' and 'limit' query parameters
  paginate() {
    const page = +this.queryString.page || 1; // Default to page 1
    const limit = +this.queryString.limit || 100; // Default to 100 results per page
    const skip = (page - 1) * limit; // Calculate how many documents to skip

    this.query = this.query.skip(skip).limit(limit); // Apply skip and limit to the query
    return this; // Return the instance for method chaining
  }
}

module.exports = APIFeatures;

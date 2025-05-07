# Models

This directory contains model files that define the schemas and business logic for database collections in the application.

## Model Files

### `bookingModel.js`
Defines the booking schema for tour reservations:
- Stores relationships between users and tours
- Manages payment information
- Tracks booking status and dates
- Handles booking validation rules

### `criticalErrorModel.js`
Captures and logs critical application errors:
- Records error details for debugging and monitoring
- Stores stack traces and contextual information
- Categorizes errors by severity and type
- Facilitates error analysis and reporting

### `failedBookingModel.js`
Tracks bookings that failed to complete:
- Records information about unsuccessful booking attempts
- Stores error reasons and payment attempt details
- Provides data for analysis of booking failure patterns
- Helps with customer support and issue resolution

### `refundModel.js`
Manages refund information:
- Tracks refund requests and their status
- Stores payment reversal details
- Records refund reasons and approval information
- Links refunds to original bookings

### `reviewModel.js`
Defines the schema for tour reviews:
- Stores user ratings and feedback
- Manages relationships between users, tours, and reviews
- Handles review validation rules
- Calculates and updates average ratings

### `tourModel.js`
Central model for tour information:
- Defines comprehensive tour details (name, duration, difficulty, etc.)
- Manages geospatial data for tour locations
- Handles tour image processing and storage
- Implements virtual properties and methods for tour analytics
- Supports advanced queries and indexing

### `userModel.js`
Manages user account information:
- Handles user authentication and password encryption
- Stores user profile data and preferences
- Manages roles and permissions
- Implements password reset functionality
- Validates user data integrity 
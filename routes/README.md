# Routes

This directory contains route definition files that establish the API endpoints for the application. Each file organizes routes related to a specific resource or feature.

## Route Files

### `billingRoutes.js`
Defines endpoints for payment and billing operations:
- Payment processing
- Invoice generation
- Subscription management
- Billing information management

### `bookingRoutes.js`
Manages tour booking endpoints:
- Creating new bookings
- Retrieving booking information
- Updating booking status
- Cancelling bookings
- Checkout session initialization

### `refundRoutes.js`
Handles refund-related operations:
- Refund request submission
- Refund status checking
- Refund approval/rejection
- Refund history retrieval

### `reviewRoutes.js`
Manages tour review endpoints:
- Creating new reviews
- Retrieving reviews for tours
- Updating existing reviews
- Deleting reviews
- Rating aggregation

### `tourRoutes.js`
Central routing for tour-related operations:
- Tour creation, retrieval, update, and deletion
- Tour search and filtering
- Tour statistics and analytics
- Featured/top tours retrieval
- Geospatial queries for tours

### `userRoutes.js`
Handles user account operations:
- User profile management
- Password and email updates
- Account settings
- Role and permission management
- User activity tracking

### `viewRoutes.js`
Manages server-side rendered views:
- Main page routing
- Tour detail pages
- User account pages
- Authentication pages
- Booking and payment pages
- Error pages

## Implementation Details

Routes typically follow RESTful conventions and:
- Use middleware for authentication and authorization
- Implement parameter validation
- Connect to appropriate controller functions
- Handle specific HTTP methods (GET, POST, PATCH, DELETE)
- Nest related routes where appropriate 
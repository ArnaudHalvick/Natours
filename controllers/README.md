# Controllers

This directory contains controller files that handle the application's business logic, processing HTTP requests and returning responses.

## Controller Files

### `authController.js`
Handles user authentication operations including:
- User signup and login
- Password reset and update
- Token verification and protection of routes
- User access restrictions and permissions

### `bookingController.js`
Manages tour booking functionality:
- Creating and retrieving bookings
- Processing payments
- Checkout session handling
- Booking status management

### `errorController.js`
Centralizes error handling:
- Global error handler for the application
- Development and production error formatting
- Error classification and appropriate responses

### `handlerFactory.js`
Contains factory functions for common CRUD operations:
- Creates reusable handlers for controllers
- Implements DRY (Don't Repeat Yourself) principle with standardized methods
- Handles document creation, retrieval, updating, and deletion

### `invoiceController.js`
Manages invoice generation and handling:
- Creating and retrieving invoices
- PDF generation
- Invoice status management

### `refundController.js`
Handles refund processing:
- Refund requests and approvals
- Payment gateway integration for refunds
- Refund status tracking

### `reviewController.js`
Manages tour reviews:
- Creating, retrieving, updating, and deleting reviews
- Review validation and moderation
- Rating calculations

### `tourController.js`
Handles tour-related operations:
- Tour creation, retrieval, updating, and deletion
- Special tour queries (top tours, statistics, etc.)
- Geospatial queries and calculations

### `userController.js`
Manages user accounts and profiles:
- User data retrieval and updates
- Profile management
- User deletion and deactivation

### `viewsController.js`
Renders views for the application:
- Serves HTML pages with data
- Handles view-specific logic
- Manages template rendering 
# Utilities

This directory contains utility functions and helper modules that provide common functionality across the application.

## Utility Files

### `apiFeatures.js`
Implements API query features:
- Filtering and search functionality
- Sorting and pagination
- Field limiting and projection
- Advanced query parameter handling

### `appError.js`
Custom error handling class:
- Extends the native Error class
- Captures HTTP status codes
- Categorizes errors by type
- Provides consistent error formatting

### `catchAsync.js`
Async error handling wrapper:
- Eliminates repetitive try/catch blocks
- Centralizes Promise error handling
- Forwards errors to global error handlers
- Simplifies controller implementation

### `dateUtils.js`
Date manipulation and formatting utilities:
- Date parsing and validation
- Formatting dates for display
- Date range calculations
- Timezone handling

### `email.js`
Email sending functionality:
- Email template rendering
- SMTP configuration and connection
- HTML and plain text email support
- Attachment handling
- Email queue management

### `parseJSONFields.js`
JSON field parsing utility:
- Converts stringified JSON fields to objects
- Handles nested JSON structures
- Validates JSON data integrity
- Simplifies database field handling

### `setJwtFromQuery.js`
JWT extraction middleware:
- Extracts JWT tokens from query parameters
- Moves tokens to authorization headers
- Enables alternative authentication methods
- Supports URL-based authentication

### `testNotification.js`
Testing notification utility:
- Generates test notifications
- Simulates different notification types
- Provides sample notification data
- Helps test notification handling

## Usage Patterns

These utilities follow consistent patterns:
- Most are implemented as modular functions or classes
- Many use middleware patterns for Express integration
- Error handling is consistent and comprehensive
- Documentation is provided as JSDoc comments
- Cross-cutting concerns are separated from business logic 
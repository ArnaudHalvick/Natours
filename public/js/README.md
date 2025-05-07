# JavaScript

This directory contains client-side JavaScript files that provide interactive functionality to the application.

## Structure

### `src/`
Contains the source JavaScript files:

#### `api/`
Handles API interactions:
- Wrapper functions for AJAX requests
- API endpoint configurations
- Response handling and error management
- Authentication token management

#### `handlers/`
Contains event handlers and UI logic:
- DOM manipulation functions
- Event listeners and controllers
- Form validation and submission

##### `booking/`
Specialized handlers for booking functionality:
- Payment processing
- Booking form submission
- Booking confirmation handling
- Cancellation processes

#### `utils/`
Utility functions and helpers:
- Date formatting and manipulation
- Form data validation
- String and number formatting
- Browser storage management
- Error handling utilities

## Additional Information

- The JavaScript follows a modular structure for better maintainability
- Modern ES6+ syntax is used throughout the codebase
- API calls use fetch or axios for HTTP requests
- Event handling follows delegation patterns where appropriate
- Bundling and minification may be applied during deployment 
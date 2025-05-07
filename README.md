# Natours 🌍✈️

[![Node.js](https://img.shields.io/badge/Node.js-v16.x-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-v4.x-green.svg)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-v4.x-blue.svg)](https://expressjs.com/)
[![Stripe](https://img.shields.io/badge/Stripe-v12.x-purple.svg)](https://stripe.com/)

A feature-rich tour booking platform built with Node.js and MongoDB. This project was initially based on Jonas Schmedtmann's Node.js course and has been significantly enhanced with additional features and real-world business logic.

## 🚀 Features Added Beyond Original Course

- **Enhanced Authentication**

  - Two-factor authentication with refresh tokens
  - Email confirmation for account creation and changes
  - Secure password reset system

- **Advanced Booking System**

  - Multiple payments per booking
  - Complex refund processing
  - Capacity tracking for tour dates
  - Manual booking creation for admins

- **Comprehensive Admin Interface**

  - User management with search and filters
  - Review moderation system
  - Booking management dashboard
  - Invoice generation and tracking

- **Tour Management**
  - Multiple start dates per tour
  - Participant capacity tracking
  - Flexible discount system
  - Tour visibility controls

## 🛠️ Technical Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with refresh tokens
- **Payment**: Stripe integration
- **Email**: SendGrid/Nodemailer
- **Frontend**: Pug templates, CSS, JavaScript

## 📂 Project Structure

### Controllers (`/controllers`)
Handle business logic for HTTP requests and responses:
- `authController.js` - Authentication operations (login, signup, password reset)
- `bookingController.js` - Tour booking and payment processing
- `errorController.js` - Centralized error handling
- `invoiceController.js` - Invoice generation and management
- `refundController.js` - Refund processing
- `reviewController.js` - Tour review management
- `tourController.js` - Tour data operations
- `userController.js` - User profile management
- `viewsController.js` - Server-side template rendering

### Models (`/models`)
Define database schemas and business logic:
- `bookingModel.js` - Tour reservation schema and validation
- `criticalErrorModel.js` - Error logging and categorization
- `failedBookingModel.js` - Tracks unsuccessful booking attempts
- `refundModel.js` - Refund request data and statuses
- `reviewModel.js` - Tour ratings and user feedback
- `tourModel.js` - Tour details, geospatial data, and analytics
- `userModel.js` - User authentication and profile information

### Routes (`/routes`)
Establish API endpoints for the application:
- `billingRoutes.js` - Payment and invoice endpoints
- `bookingRoutes.js` - Tour booking operations
- `refundRoutes.js` - Refund processing
- `reviewRoutes.js` - Tour review management
- `tourRoutes.js` - Tour data endpoints and geospatial queries
- `userRoutes.js` - User account operations
- `viewRoutes.js` - Server-side rendered page routes

### Views (`/views`)
Pug templates for server-side rendering:
- `base.pug` - Main layout template
- Partials (`_header.pug`, `_footer.pug`, `_reviewCard.pug`, `_sidenav.pug`)
- Email templates in `/emails`
- Page templates organized by feature in `/pages`

### Utilities (`/utils`)
Common functionality shared across the application:
- `apiFeatures.js` - API query handling (filtering, sorting, pagination)
- `appError.js` - Custom error handling class
- `catchAsync.js` - Async error wrapper
- `dateUtils.js` - Date manipulation and formatting
- `email.js` - Email sending functionality
- `parseJSONFields.js` - JSON data handling
- `setJwtFromQuery.js` - JWT extraction middleware

### Public Assets (`/public`)
Static files served to the client:
- `/css` - Stylesheets organized by base, components, layout, and pages
- `/img` - Images for tours and user profiles
- `/js` - Client-side JavaScript with API interactions and event handlers

## 🔧 Setup & Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/natours.git
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
cp config.env.example config.env
# Edit config.env with your values
```

4. Run development server

```bash
npm run start for dev mode
npm run start:prod for production
```

## 💳 Stripe Testing

Use these test card numbers:

- Success: 4242 4242 4242 4242
- Failure: 4000 0000 0000 0002

## 🌟 Key Features

### User Features

- Tour booking with secure payment processing
- User authentication and profile management
- Tour reviews and ratings
- Booking management and history
- Invoice downloads

### Admin Features

- Comprehensive user management
- Tour creation and management
- Booking oversight and manual creation
- Review moderation
- Revenue tracking and reporting

## 📚 Major Learning Outcomes

### Technical Insights

- Complex date/timezone handling
- Payment processing with rollbacks
- Secure authentication flows
- MongoDB optimization techniques

### Project Management

- Importance of upfront planning
- Value of modular development
- Necessity of thorough testing
- Benefits of clear documentation

## 🔄 Business Logic Implementations

- **Booking Management**

  - Multiple payment tracking
  - Partial refund processing
  - Capacity management
  - Date-based availability

- **User Management**
  - Role-based permissions
  - Email verification flows
  - Activity tracking
  - Profile management

## 🛠️ Future Improvements

1. **Invoice System**

   - Separate invoice persistence
   - Archival system
   - Enhanced formatting options

2. **Payment System**

   - Multiple provider integration
   - Additional payment methods
   - Enhanced error recovery

3. **UI/UX**
   - Responsive design improvements
   - Enhanced user notifications
   - Real-time updates

## 🙏 Acknowledgments

- Based on Jonas Schmedtmann's Node.js course
- Claude AI and ChatGPT are great tools
- Extended with significant additional features and real-world business logic
- Built with modern Node.js and MongoDB best practices

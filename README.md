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
npm run dev
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

## 📝 License

This project is open-source and available under the MIT License.

## 🙏 Acknowledgments

- Based on Jonas Schmedtmann's Node.js course
- Extended with significant additional features and real-world business logic
- Built with modern Node.js and MongoDB best practices

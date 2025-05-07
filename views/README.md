# Views

This directory contains Pug templates that render the application's user interface. The views follow a component-based structure with reusable partials and page templates.

## Core Templates

### `base.pug`
The main layout template that:
- Defines the HTML document structure
- Includes common head elements and scripts
- Provides the base layout for all pages
- Implements content blocks for page-specific content

### `error.pug`
Error page template that:
- Displays user-friendly error messages
- Handles different types of errors with appropriate styling
- Provides navigation back to safe parts of the application

## Partials

Reusable UI components included in multiple pages:

### `_header.pug`
The site header component:
- Contains navigation elements
- Implements user authentication status display
- Provides branding and logo
- Houses responsive menu controls

### `_footer.pug`
The site footer component:
- Contains copyright information
- Houses social media links
- Displays legal information and policies
- Includes secondary navigation

### `_reviewCard.pug`
Review display component:
- Formats user reviews with ratings
- Shows review author information
- Displays review date and content
- Implements star rating visualization

### `_sidenav.pug`
Sidebar navigation component:
- Contains user account navigation
- Provides contextual navigation based on current page
- Implements collapsible sections
- Shows user role-specific options

## Subdirectories

### `emails/`
Contains email template views:
- Welcome emails
- Password reset templates
- Booking confirmation emails
- Account notifications

### `pages/`
Contains page-specific templates organized by feature:
- Tour pages
- User account pages
- Authentication forms
- Booking interfaces
- Review management
- Admin dashboards

## Implementation Notes

- Templates use Pug's inheritance and include features
- Data is passed from controllers to templates via locals
- Responsive design is implemented at the template level
- Mixins are used for repeated complex elements 
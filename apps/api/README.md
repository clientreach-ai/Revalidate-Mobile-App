# Revalidation Tracker API

Backend API for the Revalidation Tracker application - a professional compliance tracking system for UK healthcare practitioners.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MySQL (HostGator) - Direct connection via mysql2
- **Authentication**: JWT + Firebase Admin
- **File Storage**: AWS S3 / Cloudflare R2 (to be configured)
- **Payments**: Stripe
- **Notifications**: Firebase Cloud Messaging

## Setup

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- MySQL database (HostGator)

### Installation

```bash
# Install dependencies
pnpm install
```

### Environment Variables

Create a `.env` file in the `apps/api` directory:

```bash
# Server
PORT=3000
NODE_ENV=development

# MySQL Database (HostGator)
MYSQL_HOST=your-mysql-hostname
MYSQL_PORT=3306
MYSQL_USER=your-username
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=your-database-name

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=*

# Firebase Admin (for authentication)
FIREBASE_SERVICE_ACCOUNT=
FIREBASE_PROJECT_ID=

# Stripe (for subscriptions)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AWS S3 / Cloudflare R2 (for file storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET_NAME=
```

### Database Setup

The API connects directly to MySQL using `mysql2`. No migrations or ORM setup required - the database structure already exists.

## Development

```bash
# Start development server with hot-reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## API Structure

```
src/
├── app.ts                 # Express app setup
├── server.ts             # Server entry point
├── config/               # Configuration files
│   ├── env.ts           # Environment variables
│   └── database.ts      # MySQL connection
├── routes/              # API route definitions
│   └── index.ts
├── modules/             # Feature modules
│   ├── auth/           # Authentication
│   ├── users/          # User management
│   ├── logs/           # Work hours, CPD, etc.
│   ├── calendar/       # Calendar events
│   ├── documents/      # File management
│   ├── analytics/      # Statistics & analytics
│   ├── export/         # PDF generation
│   ├── subscription/   # Stripe subscriptions
│   ├── notifications/  # Push notifications
│   └── sync/           # Data synchronization
└── common/              # Shared utilities
    ├── middleware/     # Express middleware
    ├── utils/          # Helper functions
    └── logger.ts       # Logging utility
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `POST /api/v1/auth/logout` - Logout

### Users
- `GET /api/v1/users/me` - Get current user profile
- `PUT /api/v1/users/me` - Update profile
- `DELETE /api/v1/users/me` - Delete account

### Work Hours
- `GET /api/v1/work-hours` - List work hours
- `POST /api/v1/work-hours` - Create work hour entry
- `PUT /api/v1/work-hours/:id` - Update work hour
- `DELETE /api/v1/work-hours/:id` - Delete work hour

### CPD Activities
- `GET /api/v1/cpd` - List CPD activities
- `POST /api/v1/cpd` - Create CPD activity
- `PUT /api/v1/cpd/:id` - Update CPD activity
- `DELETE /api/v1/cpd/:id` - Delete CPD activity

### Documents
- `GET /api/v1/documents` - List documents
- `POST /api/v1/documents/upload` - Upload document
- `GET /api/v1/documents/:id` - Get document
- `DELETE /api/v1/documents/:id` - Delete document

### Analytics
- `GET /api/v1/analytics/stats` - Get statistics
- `GET /api/v1/analytics/dashboard` - Get dashboard data

### Export
- `POST /api/v1/export/portfolio` - Generate PDF portfolio

### Sync
- `POST /api/v1/sync/push` - Push local changes
- `GET /api/v1/sync/pull` - Pull remote changes

## Development Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **Error Handling**: Use `ApiError` class and `asyncHandler` wrapper
- **Validation**: Use Zod schemas with `validateRequest` middleware
- **Code Style**: ESLint + Prettier
- **Testing**: Jest for unit/integration tests

## Next Steps

1. ✅ Core middleware setup
3. ⏳ Implement authentication module
4. ⏳ Implement user management
5. ⏳ Implement work hours tracking
6. ⏳ Implement CPD logging
7. ⏳ Implement file upload/storage
8. ⏳ Implement analytics
9. ⏳ Implement PDF export
10. ⏳ Implement subscription management
11. ⏳ Implement push notifications
12. ⏳ Implement sync mechanism

## Documentation

See the main project documentation for architecture details and feature specifications.

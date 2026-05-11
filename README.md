# Nail Salon Admin Panel

A modern admin panel for managing nail salon appointments, customers, services, and staff built with Next.js, Prisma, and PostgreSQL.

## Features

-  Appointment management with conflict detection
-  Customer management with package tracking
-  Service catalog management
-  Staff scheduling
-  Revenue reports and analytics
-  Mobile-responsive design
-  Secure authentication with session management

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Iron Session
- **Deployment**: Vercel
- **Database Hosting**: Neon

## Getting Started

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lamees-nail-salon-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your local database URL
   ```

4. **Set up the database**
   ```bash
   # Push schema to database
   npm run db:push

   # Seed with sample data
   npm run db:seed

   # Create admin user
   npx tsx scripts/create-admin.ts
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**


## Deployment to Vercel + Neon

### 1. Set up Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy the connection string from the dashboard

### 2. Deploy to Vercel

1. **Connect your repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure environment variables in Vercel**
   ```
   DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
   SESSION_SECRET=your-secure-random-session-secret-here
   SESSION_COOKIE_SECURE=true
   NEXT_PUBLIC_SITE_URL=https://your-app-name.vercel.app
   ```

3. **Deploy**
   - Vercel will automatically detect Next.js and run the build
   - The `postinstall` script will generate Prisma client
   - The `build` script will push the database schema

### 3. Set up Database Schema

After deployment, run the database setup commands:

```bash
# Connect to your Vercel project
npx vercel link

# Push schema to Neon
npx vercel env pull .env.local
npm run db:push

# Seed with sample data (optional)
npm run db:seed

# Create admin user
npx tsx scripts/create-admin.ts
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Random string for session encryption | Yes |
| `SESSION_COOKIE_SECURE` | Force HTTPS-only cookies | No |
| `NEXT_PUBLIC_SITE_URL` | Your deployed app URL | No |

## Database Schema

The application uses the following main entities:
- **Admin**: Authentication users
- **Customer**: Client information
- **Service**: Available services
- **Staff**: Salon employees
- **Appointment**: Scheduled bookings
- **UserPackage**: Multi-session packages
- **Installment**: Payment tracking

## API Routes

- `GET/POST /api/appointments` - Appointment management
- `GET/POST /api/customers` - Customer management
- `GET/POST /api/services` - Service management
- `GET/POST /api/staff` - Staff management
- `POST /api/auth/login` - Authentication
- `GET /api/reports` - Analytics and reports

## Security Features

- Rate limiting on login attempts
- HTTP-only secure cookies
- CSRF protection
- Input validation and sanitization
- SQL injection prevention via Prisma
- XSS protection headers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.

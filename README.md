# Bestway Jobs - Job Scheduling Application

A modern, full-stack job scheduling application built with React, Vite, and Supabase. Perfect for managing insulation jobs, crew schedules, and customer information.

## Features

- 🔐 **Authentication**: Secure login with Supabase Auth (magic links)
- 📅 **Job Scheduling**: Visual weekly calendar with drag-and-drop job management
- 👥 **Crew Management**: Assign jobs to different crews
- 🏠 **Customer Management**: Track customer information and addresses
- 📊 **Job Types**: Support for Spray Foam, Blow-In, and Batts insulation
- ✏️ **CRUD Operations**: Create, read, update, and delete jobs
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Clean, professional interface with smooth animations

## Tech Stack

- **Frontend**: React 19, Vite, React Router
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Styling**: Inline styles with modern design system
- **State Management**: React hooks and local state
- **Deployment**: Vercel-ready

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd bestway-jobs
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. Database Setup

Run the SQL commands from `supabase-config.md` in your Supabase SQL editor to create the database schema.

### 4. Run the Application

```bash
npm run dev
```

Visit `http://localhost:5174` to see your application!

## Project Structure

```
src/
├── App.jsx              # Main app with routing and auth
├── main.jsx             # App entry point
├── supabase.js          # Supabase client configuration
├── pages/
│   ├── Login.jsx        # Authentication page
│   └── Schedule.jsx     # Main scheduling interface
└── assets/              # Static assets
```

## Key Components

### Schedule Page
- Weekly calendar view with time slots
- Job cards with customer and job type information
- Quick add buttons for each crew/day combination
- Today's jobs panel with action buttons
- Quick stats dashboard

### Job Management
- Create new jobs with detailed specifications
- Edit existing jobs by clicking on job cards
- Delete jobs with confirmation
- Support for different job types (Spray Foam, Blow-In, Batts)

### Authentication
- Magic link authentication via email
- Protected routes
- Automatic redirects based on auth state

## Database Schema

The application uses three main tables:

- **crews**: Team information
- **customers**: Customer details and addresses  
- **jobs**: Job scheduling with full specifications

All tables include Row Level Security (RLS) for data protection.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app is a standard Vite React application and can be deployed to:
- Netlify
- Railway
- Render
- Any static hosting service

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
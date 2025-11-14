# Hack-Buddy 🚀

**Hack-Buddy** is a modern web application designed to help students find teammates, form teams, and discover hackathons. Connect with talented developers and build amazing projects together!

## ✨ Features

### 🎯 Core Functionality
- **Find Teammates**: Browse and search for developers based on skills, tech stack, and interests
- **Team Management**: Create teams, manage members, and handle join requests
- **Hackathon Discovery**: Browse upcoming hackathons, view details, and register
- **Real-time Chat**: Communicate with team members through general and team-specific chat channels
- **User Profiles**: Create detailed profiles showcasing your skills, experience, and portfolio links

### 🎨 UI/UX Features
- **Resizable Navbar**: Animated navbar that resizes on scroll with smooth transitions
- **Dynamic Color System**: Text colors adapt based on scroll state for optimal readability
- **Responsive Design**: Fully responsive layout for desktop, tablet, and mobile devices
- **Dark Mode Support**: Built-in dark/light theme support
- **Smooth Animations**: Enhanced user experience with Framer Motion animations

### 🔐 Authentication & Security
- **Supabase Authentication**: Secure user authentication with email verification
- **Role-Based Access**: Different navigation and features based on authentication state
- **Protected Routes**: Secure access to authenticated pages
- **Profile Management**: Complete user profile management system

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **Framer Motion** - Animation library
- **Lucide React** - Icon library

### Backend & Database
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL database
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Authentication

### State Management
- **TanStack Query (React Query)** - Server state management
- **React Hooks** - Local state management

### Additional Libraries
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **date-fns** - Date manipulation
- **Sonner** - Toast notifications

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hack-buddy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL schema from `supabase/complete_schema.sql`
   - Configure Row Level Security policies

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in terminal)

## 🚀 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 📁 Project Structure

```
hack-buddy/
├── src/
│   ├── components/          # Reusable components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── ResizableNavbar.tsx
│   │   ├── Chat.tsx
│   │   └── ...
│   ├── pages/               # Page components
│   │   ├── Index.tsx        # Home page
│   │   ├── Auth.tsx         # Authentication
│   │   ├── Teammates.tsx    # Find teammates
│   │   ├── Teams.tsx        # Team management
│   │   ├── Hackathons.tsx   # Hackathon listings
│   │   ├── Chat.tsx         # Chat interface
│   │   └── Profile.tsx      # User profile
│   ├── integrations/        # External integrations
│   │   └── supabase/        # Supabase client
│   ├── lib/                 # Utility functions
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── public/                  # Static assets
├── supabase/                # Database schema
└── package.json
```

## 🎯 Key Features Explained

### Resizable Navbar
The navbar features a unique resizable design that:
- Starts at 100% width with dark background
- Resizes to 40% width on scroll with smooth animations
- Changes text colors dynamically for optimal contrast
- Provides app-wide navigation with authentication-based menu items

### Team Management
- Create teams with custom names and descriptions
- Invite members or accept join requests
- Manage team roles (leader/member)
- View team details and member profiles

### Hackathon Discovery
- Browse upcoming hackathons
- Filter by date, location, and type
- View detailed information (dates, prizes, requirements)
- Register for hackathons
- Create and manage hackathon listings (authenticated users)

### Real-time Chat
- General chat for all users
- Team-specific chat channels
- Personal messaging between users
- Real-time message updates

## 🔒 Security

- Row Level Security (RLS) policies on all database tables
- Secure authentication with Supabase Auth
- Protected API routes
- Input validation with Zod schemas
- XSS protection through React's built-in escaping

## 🌐 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms
The app can be deployed to any platform that supports Node.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary.

## 👥 Authors

- Hack-Buddy Development Team

## 🙏 Acknowledgments

- UI components from [shadcn/ui](https://ui.shadcn.com)
- Icons from [Lucide](https://lucide.dev)
- Backend powered by [Supabase](https://supabase.com)

---

**Made with ❤️ for the hackathon community**

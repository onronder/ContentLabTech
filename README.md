# ContentLab Nexus

A comprehensive content marketing analytics platform built with Next.js 14, TypeScript, and modern development tools.

## 🚀 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.0+ with strict configuration
- **Styling**: Tailwind CSS 4 with custom design system
- **UI Components**: Radix UI primitives
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Icons**: Lucide React

## 🛠️ Development Tools

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier with Tailwind plugin
- **Git Hooks**: Husky with lint-staged
- **Testing**: Jest + React Testing Library + Playwright
- **Type Checking**: TypeScript strict mode

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/
│   ├── ui/             # Reusable UI components
│   ├── layout/         # Layout components
│   └── features/       # Feature-specific components
├── lib/
│   ├── utils/          # Utility functions
│   ├── services/       # API services
│   └── stores/         # State management
├── types/
│   ├── api/            # API type definitions
│   └── database/       # Database type definitions
├── hooks/
│   ├── api/            # API-related hooks
│   └── utils/          # Utility hooks
└── styles/             # Global styles and components
```

## 🏃‍♂️ Getting Started

1. **Clone and install dependencies**:

   ```bash
   cd contentlab-nexus
   npm install
   ```

2. **Set up environment variables**:

   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your actual values
   ```

3. **Start development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🧪 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run type-check` - Run TypeScript type checking
- `npm run prettier` - Format code with Prettier
- `npm run prettier:check` - Check code formatting
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:e2e:ui` - Run E2E tests with UI

## 🔧 Configuration

### TypeScript

- Strict mode enabled with comprehensive type checking
- Path mapping configured for clean imports (`@/`)
- Enhanced compiler options for better type safety

### Tailwind CSS

- Custom design system with brand colors
- Dark mode support
- Responsive breakpoints
- Custom animations and utilities

### ESLint & Prettier

- TypeScript and React rules
- Import ordering and formatting
- Pre-commit hooks for code quality

## 🏗️ Development Workflow

1. **Feature Development**: Create feature branches and follow the project structure
2. **Code Quality**: Pre-commit hooks ensure linting and type checking
3. **Testing**: Write unit tests for utilities and E2E tests for user flows
4. **Documentation**: Update README and add JSDoc comments for complex functions

## 📝 Environment Variables

Copy `.env.local.example` to `.env.local` and configure:

- **Supabase**: Database and authentication
- **External APIs**: SERPAPI, Google Analytics, etc.
- **Feature Flags**: Enable/disable features
- **Development**: Debug and testing options

## 🚢 Deployment

The project is optimized for deployment on:

- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **Custom Docker containers**

## 📖 Next Steps

This is the foundation setup for ContentLab Nexus. The next phases will include:

1. **Backend Services** - Supabase configuration and API routes
2. **External Integrations** - SERPAPI, Google Analytics, etc.
3. **Analytics Engine** - Content and competitive analysis
4. **User Interface** - Dashboard and feature components
5. **Advanced Features** - AI-powered insights and automation

## 🤝 Contributing

1. Follow the established code conventions
2. Write tests for new features
3. Update documentation as needed
4. Ensure all checks pass before committing

---

Built with ❤️ using modern web technologies.

# LA Noire NextGen - Frontend

React + Vite frontend for the LA Noire NextGen case management system with 1940s Film Noir aesthetic.

## Technology Stack

- **Framework**: React 18
- **Build Tool**: Vite 5
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Testing**: Vitest + React Testing Library
- **Styling**: Custom CSS with Film Noir theme

## Features

- 🎨 **1940s Film Noir Aesthetic** - Authentic period styling
- 🔐 **Cookie-based Authentication** - Secure session management
- 📱 **Responsive Design** - Works on all device sizes
- ✅ **Comprehensive Testing** - Unit and integration tests
- 🎭 **Mock Data Support** - Easy testing with mock backend
- 📚 **Style Guide** - Visual component reference

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable components
│   │   ├── Header.jsx
│   │   └── Footer.jsx
│   ├── pages/               # Page components
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   └── StyleGuide.jsx
│   ├── services/            # API and utility services
│   │   ├── api.js          # Axios configuration
│   │   └── auth.js         # Authentication service
│   ├── styles/              # CSS stylesheets
│   │   ├── index.css       # Base styles & Film Noir theme
│   │   └── App.css         # App-level styles
│   ├── assets/              # Static assets
│   │   └── fonts/          # Custom fonts
│   ├── App.tsx              # Root component
│   └── main.tsx             # Application entry point
├── tests/                   # Test suite
│   ├── components/          # Component tests
│   ├── services/            # Service tests
│   ├── setup.js            # Test configuration
│   └── utils.js            # Test utilities
├── public/                  # Static public files
├── docs/                    # Frontend documentation
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
└── package.json            # Dependencies
```

## Setup & Installation

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8000`

### Installation Steps

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment** (optional):
   Create `.env` file:
   ```env
   VITE_API_URL=http://localhost:8000
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## Available Scripts

### Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing

```bash
npm test             # Run tests in watch mode
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

View coverage report at `coverage/index.html`

## Styling & Design

### Film Noir Theme

The application uses a carefully crafted 1940s Film Noir aesthetic:

**Color Palette**:
- Noir Black (#0a0a0a) - Primary background
- Gold (#d4af37) - Primary accent
- Brass (#b5a642) - Secondary accent
- Crimson (#8b1a1a) - Danger/alerts
- Evidence Blue (#1a4d7a) - Information

**Typography**:
- **Headings**: Playfair Display (serif, elegant)
- **Body**: Crimson Text (readable, period-appropriate)
- **Typewriter**: Special Elite (official documents)

### Style Guide

Visit `/style-guide` in the application to see all available components and styles.

## Components

### Header
Navigation bar with LAPD branding and main navigation links.

```jsx
import Header from './components/Header';
<Header />
```

### Footer
Site footer with credits and quick links.

```jsx
import Footer from './components/Footer';
<Footer />
```

## Pages

### Login (`/login`)
Authentication page with multi-identifier support (username, email, phone, national ID).

### Dashboard (`/dashboard`)
Main overview with statistics and quick actions.

### Style Guide (`/style-guide`)
Visual reference for all UI components and styling.

## Services

### API Service

Configure API calls with automatic CSRF token handling:

```javascript
import { api } from './services/api';

// GET request
const cases = await api.get('/cases/');

// POST request
const newCase = await api.post('/cases/', data);
```

### Auth Service

Handle authentication:

```javascript
import { login, logout, useAuth } from './services/auth';

// Login
await login('username', 'password');

// Use auth hook
const { user, isAuthenticated, loading } = useAuth();
```

## Testing

### Test Structure

- `tests/components/` - Component tests
- `tests/services/` - Service tests
- `tests/utils.js` - Testing utilities and mock data generators

### Writing Tests

```javascript
import { renderWithRouter, createMockUser } from '../utils';

it('renders user profile', () => {
  const user = createMockUser();
  renderWithRouter(<Profile user={user} />);
  expect(screen.getByText(user.username)).toBeInTheDocument();
});
```

### Mock Data Generators

- `createMockUser()` - Generate mock user data
- `createMockCase()` - Generate mock case data
- `createMockEvidence()` - Generate mock evidence data
- `createMockSuspect()` - Generate mock suspect data

### Test Utilities

- `renderWithRouter()` - Render with React Router
- `mockApiResponse()` - Mock successful API response
- `mockApiError()` - Mock API error
- `wait()` - Wait helper for async operations

## Working with Mock Data

For development without a backend:

1. **Create mock API responses** in `src/services/mockData.js`
2. **Conditionally use mock service** based on environment
3. **Run tests** with mock data for fast iteration

Example:

```javascript
// In development mode
const USE_MOCK = import.meta.env.MODE === 'development';

const getCases = async () => {
  if (USE_MOCK) {
    return mockCases;
  }
  return await api.get('/cases/');
};
```

## API Integration

### Cookie-based Authentication

The frontend is configured for cookie-based authentication:

1. CSRF tokens are automatically extracted from cookies
2. Added to request headers via Axios interceptor
3. Session cookies are sent with `withCredentials: true`

### Proxy Configuration

Development server proxies `/api` requests to backend:

```javascript
// vite.config.js
server: {
  proxy: {
    '/api': 'http://localhost:8000'
  }
}
```

## Deployment

### Build for Production

```bash
npm run build
```

Output directory: `dist/`

### Environment Variables

- `VITE_API_URL` - Backend API URL (default: `/api`)

### Serve Static Files

```bash
npm run preview  # Preview production build locally
```

Or use any static file server:

```bash
npx serve -s dist
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Fonts

The application uses Google Fonts:
- [Playfair Display](https://fonts.google.com/specimen/Playfair+Display)
- [Crimson Text](https://fonts.google.com/specimen/Crimson+Text)
- [Special Elite](https://fonts.google.com/specimen/Special+Elite)

Fonts are loaded via CDN in the base CSS.

## Accessibility

- Semantic HTML elements
- ARIA labels where appropriate
- Keyboard navigation support
- High contrast color scheme
- Alt text for images

## Development Guidelines

1. **Component Structure**: Use functional components with hooks
2. **Styling**: Keep styles modular (one CSS file per component)
3. **Testing**: Write tests for all new components
4. **Comments**: Document complex logic
5. **Props**: Use PropTypes or TypeScript for type checking
6. **State**: Use hooks (useState, useEffect, etc.)

## Troubleshooting

### CORS Issues

Ensure backend allows `http://localhost:3000` in CORS settings:

```python
# Django settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

### Authentication Issues

Check cookie settings:
- Cookies must be sent from same domain or with proper CORS
- CSRF token must be present in cookies
- Session cookie must be httpOnly

### Vite Dev Server Issues

```bash
# Clear cache
rm -rf node_modules/.vite

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for development workflow.

## Documentation

Frontend-specific documentation in `docs/` directory:
- [Component Library](docs/components.md)
- [Styling Guide](docs/styling.md)
- [Testing Guide](docs/testing.md)
- [API Integration](docs/api-integration.md)

## License

Internal LAPD System - All Rights Reserved

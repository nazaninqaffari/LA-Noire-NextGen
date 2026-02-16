# Frontend Documentation Index

Welcome to the LA Noire NextGen frontend documentation.

## Table of Contents

### Getting Started
- [README](../README.md) - Installation and setup
- [Style Guide](../src/pages/StyleGuide.jsx) - Visual component reference

### Core Concepts
1. **Architecture**
   - React + Vite setup
   - Component structure
   - State management
   - Routing with React Router

2. **Styling**
   - Film Noir theme
   - CSS custom properties
   - Responsive design
   - Component-specific styles

3. **API Integration**
   - Axios configuration
   - Cookie-based authentication
   - CSRF token handling
   - Error handling

4. **Testing**
   - Vitest setup
   - Component testing
   - Service testing
   - Mock data generation

### Features

#### Authentication
- Multi-identifier login (username, email, phone, national ID)
- Session-based authentication
- Cookie management
- Protected routes

#### UI Components
- **Header** - Navigation and branding
- **Footer** - Site information
- **Cards** - Content containers
- **Forms** - Input elements
- **Buttons** - Action triggers
- **Tables** - Data display
- **Badges** - Status indicators
- **Alerts** - User notifications

#### Pages
- **Login** - User authentication
- **Dashboard** - System overview
- **Style Guide** - Component showcase

### Development

#### Code Organization
```
src/
├── components/     # Reusable UI components
├── pages/          # Route-level components
├── services/       # Business logic and API calls
├── styles/         # CSS stylesheets
├── assets/         # Static assets (fonts, images)
└── utils/          # Helper functions
```

#### Naming Conventions
- Components: PascalCase (e.g., `Header.jsx`)
- Styles: PascalCase matching component (e.g., `Header.css`)
- Services: camelCase (e.g., `authService.js`)
- Test files: `*.test.jsx` or `*.test.js`

#### Best Practices
1. Keep components small and focused
2. Use functional components with hooks
3. Extract reusable logic into custom hooks
4. Write tests for all components
5. Document complex logic with comments
6. Use semantic HTML
7. Follow accessibility guidelines

### Testing

#### Test Structure
```
tests/
├── components/     # Component tests
│   ├── Login.test.jsx
│   └── Header.test.jsx
├── services/       # Service tests
│   ├── api.test.js
│   └── auth.test.js
├── setup.js        # Test configuration
└── utils.js        # Test helpers
```

#### Test Utilities
- `renderWithRouter()` - Render with routing context
- `createMockUser()` - Generate user mock data
- `createMockCase()` - Generate case mock data
- `mockApiResponse()` - Mock API success
- `mockApiError()` - Mock API failure

#### Running Tests
```bash
npm test              # Watch mode
npm run test:ui       # UI mode
npm run test:coverage # With coverage
```

### Deployment

#### Production Build
```bash
npm run build
```

#### Environment Configuration
- Development: `http://localhost:3000`
- Production: Configure `VITE_API_URL` in `.env`

#### Static File Hosting
- Nginx
- Apache
- Vercel
- Netlify
- AWS S3 + CloudFront

### Troubleshooting

#### Common Issues
1. **CORS errors** - Check backend CORS configuration
2. **Auth failures** - Verify cookie settings
3. **Build errors** - Clear node_modules and reinstall
4. **Test failures** - Check mock data and async operations

#### Debug Tips
- Use React DevTools
- Check Network tab for API calls
- Verify cookies in Application tab
- Use console.log sparingly
- Write tests to reproduce issues

### API Endpoints

#### Authentication
- `POST /api/accounts/login/` - Login
- `POST /api/accounts/logout/` - Logout
- `GET /api/accounts/profile/` - Get profile

#### Cases
- `GET /api/cases/` - List cases
- `POST /api/cases/` - Create case
- `GET /api/cases/{id}/` - Get case
- `PUT /api/cases/{id}/` - Update case

#### Evidence
- `GET /api/evidence/` - List evidence
- `POST /api/evidence/` - Register evidence
- `GET /api/evidence/{id}/` - Get evidence

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Run tests and linting
5. Submit pull request

### Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [React Router Documentation](https://reactrouter.com)
- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com/react)

### Support

For questions or issues:
1. Check documentation
2. Review existing issues
3. Create new issue with details
4. Contact development team

---

Last updated: February 2026

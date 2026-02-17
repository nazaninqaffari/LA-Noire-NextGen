# Quick Start Guide - Backend & Frontend

## 🚀 Automatic Start (Recommended)

The fastest way to get everything running:

```bash
./start.sh
```

This single command will:
1. Check and start PostgreSQL if needed
2. Create database and run migrations
3. Start backend on http://localhost:8000
4. Start frontend on http://localhost:3000

**Press Ctrl+C to stop all services**

---

## Manual Setup (Alternative Method)

Follow these steps if you prefer manual control:

## Prerequisites

- **Backend**: Python 3.10+, pip
- **Frontend**: Node.js 18+, npm
- **Database**: PostgreSQL (optional, SQLite for dev)

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment (Optional)

Create `backend/.env`:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Initialize Database

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Optional: Load sample data
python scripts/initial_setup.py
```

### 4. Run Server

```bash
python manage.py runserver
```

✅ Backend running at: http://localhost:8000
📚 API Docs: http://localhost:8000/api/docs/

### 5. Run Backend Tests

```bash
# All tests
python -m pytest tests/

# With coverage
python -m pytest tests/ --cov=apps --cov-report=html

# Specific test file
python -m pytest tests/test_accounts.py -v

# Parallel execution
python -m pytest tests/ -n auto
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment (Optional)

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

### 3. Run Development Server

```bash
npm run dev
```

✅ Frontend running at: http://localhost:3000

### 4. Run Frontend Tests

```bash
# Watch mode (default)
npm test

# Run once
npm run test:run

# With UI
npm run test:ui

# With coverage
npm run test:coverage
```

View coverage: `frontend/coverage/index.html`

### 5. Build for Production

```bash
npm run build
```

Output: `frontend/dist/`

## Full Stack Development

### Terminal 1: Backend
```bash
cd backend
python manage.py runserver
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **API Docs**: http://localhost:8000/api/docs/
- **Admin Panel**: http://localhost:8000/admin/

## Testing Workflow

### Backend Testing
```bash
cd backend

# Quick test run
python -m pytest tests/ -v

# With coverage
python -m pytest tests/ --cov=apps

# Watch mode (requires pytest-watch)
ptw -- tests/

# Run specific app tests
python -m pytest tests/test_accounts.py
python -m pytest tests/test_cases.py
python -m pytest tests/test_evidence.py
```

### Frontend Testing
```bash
cd frontend

# Watch mode (interactive)
npm test

# Run once
npm run test:run

# UI mode (visual)
npm run test:ui

# Coverage report
npm run test:coverage
open coverage/index.html
```

## Common Tasks

### Backend

**Create new Django app:**
```bash
cd backend
python manage.py startapp newapp apps/newapp
```

**Make migrations:**
```bash
python manage.py makemigrations
python manage.py migrate
```

**Create test data:**
```bash
python manage.py shell
```

**Run Django shell:**
```bash
python manage.py shell
```

### Frontend

**Add new dependency:**
```bash
cd frontend
npm install package-name
```

**Create new component:**
```bash
# Create files manually in src/components/
# ComponentName.jsx
# ComponentName.css
# ComponentName.test.jsx (optional)
```

**Build for production:**
```bash
npm run build
npm run preview  # Preview production build
```

## Style Guide

Visit http://localhost:3000/style-guide to see all available UI components and styling.

## Troubleshooting

### Backend Issues

**Import errors:**
```bash
# Ensure you're in backend directory
cd backend
# Reinstall dependencies
pip install -r requirements.txt
```

**Database errors:**
```bash
# Reset database
python manage.py flush
python manage.py migrate
```

**Port already in use:**
```bash
# Use different port
python manage.py runserver 8001
```

### Frontend Issues

**Module not found:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Vite cache issues:**
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

**Port already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### CORS Issues

Ensure backend `config/settings.py` has:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

### Authentication Issues

1. Check cookies are enabled in browser
2. Verify CSRF token in request headers
3. Check session middleware is enabled
4. Clear browser cookies and try again

## Environment Variables

### Backend (.env)
```env
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgresql://user:pass@localhost/dbname
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000
```

## Default Credentials

After running `python scripts/initial_setup.py`:

- **Username**: admin
- **Password**: admin123

## Documentation

- **Main README**: `/README.md`
- **Backend README**: `/backend/README.md`
- **Frontend README**: `/frontend/README.md`
- **Backend Docs**: `/backend/docs/`
- **Frontend Docs**: `/frontend/docs/`
- **API Documentation**: http://localhost:8000/api/docs/

## Code Quality

### Backend
```bash
cd backend

# Linting
flake8 apps/

# Format
black apps/
isort apps/

# Security
bandit -r apps/
safety check
```

### Frontend
```bash
cd frontend

# Linting (if configured)
npm run lint

# Format (if configured)
npm run format
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes...

# Run tests
cd backend && python -m pytest tests/
cd frontend && npm test

# Commit
git add .
git commit -m "feat: your feature description"

# Push
git push origin feature/your-feature
```

## Quick Commands Reference

### Backend
| Command | Description |
|---------|-------------|
| `python manage.py runserver` | Start dev server |
| `python manage.py migrate` | Run migrations |
| `python manage.py createsuperuser` | Create admin user |
| `python -m pytest tests/` | Run tests |
| `python manage.py shell` | Django shell |
| `python manage.py makemigrations` | Create migrations |

### Frontend
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm test` | Run tests (watch) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm install package` | Install dependency |

## Support

For issues or questions:
1. Check documentation in `/backend/docs/` and `/frontend/docs/`
2. Review code comments
3. Check API documentation at `/api/docs/`
4. Review test files for usage examples

---

**Happy Coding! 🕵️‍♂️**

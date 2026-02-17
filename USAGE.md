# LA Noire NextGen - Usage Guide

## 🚀 Starting the Application

### One-Command Start (Recommended)

```bash
./start.sh
```

This automatically:
- ✅ Checks and starts PostgreSQL
- ✅ Creates database if needed
- ✅ Runs migrations
- ✅ Starts backend (http://localhost:8000)
- ✅ Starts frontend (http://localhost:3000)

Press `Ctrl+C` to stop all services.

### View Logs

The script creates log files in `logs/`:

```bash
# Watch backend logs
tail -f logs/backend.log

# Watch frontend logs
tail -f logs/frontend.log

# Watch both
tail -f logs/*.log
```

### Check Status

```bash
# Check if PostgreSQL is running
pg_isready

# Check what ports are in use
lsof -i :8000  # Backend
lsof -i :3000  # Frontend
lsof -i :5432  # Database
```

## 🌐 Accessing the Application

### Frontend (User Interface)
- URL: http://localhost:3000
- Film Noir themed 1940s police case management UI
- Responsive design with typewriter fonts

### Backend (API)
- API Base: http://localhost:8000/api/v1/
- Swagger Docs: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/
- Admin Panel: http://localhost:8000/admin/

### Database
- Host: localhost
- Port: 5432
- Database: lanoire_db
- User: postgres
- Password: postgres

## 🔑 Default Credentials

If you ran `scripts/initial_setup.py`:
- Username: `admin`
- Password: `admin123`

## 📍 Available API Endpoints

### Authentication
- `POST /api/v1/accounts/register/` - Register new user
- `POST /api/v1/accounts/login/` - Login
- `POST /api/v1/accounts/logout/` - Logout
- `GET /api/v1/accounts/profile/` - Get user profile

### Cases
- `GET /api/v1/cases/` - List all cases
- `POST /api/v1/cases/` - Create case
- `GET /api/v1/cases/{id}/` - Get case details
- `PATCH /api/v1/cases/{id}/` - Update case
- `POST /api/v1/cases/{id}/submit_for_review/` - Submit case

### Evidence
- `GET /api/v1/evidence/` - List evidence
- `POST /api/v1/evidence/` - Register evidence
- `GET /api/v1/evidence/{id}/` - Evidence details

### Investigation
- `GET /api/v1/investigation/suspects/` - List suspects
- `POST /api/v1/investigation/interrogations/` - Record interrogation
- `GET /api/v1/investigation/detective-board/{case_id}/` - View board

### Trial
- `POST /api/v1/trial/trials/` - Start trial
- `GET /api/v1/trial/trials/{id}/` - Trial details
- `PATCH /api/v1/trial/trials/{id}/reach_verdict/` - Submit verdict

## 🛑 Stopping Services

### Stop All (from start.sh)
Press `Ctrl+C` in the terminal running `start.sh`

### Manual Stop

```bash
# Kill backend
kill $(lsof -ti:8000)

# Kill frontend
kill $(lsof -ti:3000)

# Stop PostgreSQL
brew services stop postgresql@15
```

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :8000  # or :3000, :5432

# Kill the process
kill -9 <PID>
```

### Database Connection Error

```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL manually
brew services start postgresql@15

# Check database exists
psql -U postgres -l | grep lanoire_db
```

### Migration Issues

```bash
cd backend
source venv/bin/activate  # or ../venv/bin/activate
python manage.py migrate
```

### Frontend Build Errors

```bash
cd frontend
rm -rf node_modules
npm install
npm run dev
```

### Clear Everything and Restart

```bash
# Stop all services
pkill -f "manage.py runserver"
pkill -f "vite"

# Clear logs
rm -rf logs/*

# Restart
./start.sh
```

## 📊 Development Tools

### Run Tests

```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm run test
```

### Type Checking

```bash
cd frontend
npm run type-check
```

### Database Shell

```bash
cd backend
source venv/bin/activate
python manage.py shell
```

### Create Superuser

```bash
cd backend
source venv/bin/activate
python manage.py createsuperuser
```

## 📝 Common Workflows

### Adding New Data

1. Start the application: `./start.sh`
2. Go to http://localhost:8000/admin/
3. Login with admin credentials
4. Add users, cases, evidence, etc.

### Testing API Endpoints

1. Start the application: `./start.sh`
2. Go to http://localhost:8000/api/docs/
3. Use Swagger UI to test endpoints interactively
4. Or use curl/Postman from command line

### Developing Frontend

1. Start backend: `cd backend && python manage.py runserver`
2. In new terminal: `cd frontend && npm run dev`
3. Frontend auto-reloads on code changes
4. Check console for errors

### Developing Backend

1. Start frontend: `cd frontend && npm run dev`
2. In new terminal: `cd backend && python manage.py runserver`
3. Backend auto-reloads on code changes
4. Check terminal for errors

## 🎯 Next Steps

1. **Explore the UI**: http://localhost:3000
2. **Read API Docs**: http://localhost:8000/api/docs/
3. **Check Project Summary**: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
4. **Read Contributing Guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
5. **View Full Documentation**: `doc/` directory

## 🔗 Quick Links

- [Main README](README.md)
- [Quick Start](QUICKSTART.md)
- [Setup Guide](SETUP_GUIDE.md)
- [Contributing](CONTRIBUTING.md)
- [Project Summary](PROJECT_SUMMARY.md)

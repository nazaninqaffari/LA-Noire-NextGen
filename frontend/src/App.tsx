/**
 * App Component
 * Root application component with routing and notification system
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import NotificationContainer from './components/NotificationContainer';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import StyleGuide from './pages/StyleGuide';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import CaseReview from './pages/CaseReview';
import CreateComplaint from './pages/CreateComplaint';
import CreateCrimeScene from './pages/CreateCrimeScene';
import NotFound from './pages/NotFound';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AuthProvider>
        <Router>
          <div className="app">
            <Header />
            <NotificationContainer />
            <main className="main-content">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/cases" element={<Cases />} />
                <Route path="/cases/:id" element={<CaseDetail />} />
                <Route path="/cases/:id/review" element={<CaseReview />} />
                <Route path="/cases/complaint/new" element={<CreateComplaint />} />
                <Route path="/cases/scene/new" element={<CreateCrimeScene />} />
                <Route path="/style-guide" element={<StyleGuide />} />
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
};

export default App;

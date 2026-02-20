/**
 * App Component
 * Root application component with routing and notification system.
 * All public and authenticated routes are defined here.
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import NotificationContainer from './components/NotificationContainer';
import Header from './components/Header';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import CaseReview from './pages/CaseReview';
import CaseEdit from './pages/CaseEdit';
import CreateComplaint from './pages/CreateComplaint';
import CreateCrimeScene from './pages/CreateCrimeScene';
import Evidence from './pages/Evidence';
import EvidenceRegister from './pages/EvidenceRegister';
import MostWanted from './pages/MostWanted';
import DetectiveBoard from './pages/DetectiveBoard';
import Suspects from './pages/Suspects';
import SuspectSubmissions from './pages/SuspectSubmissions';
import Trials from './pages/Trials';
import Interrogations from './pages/Interrogations';
import Reports from './pages/Reports';
import TipReview from './pages/TipReview';
import BailPayments from './pages/BailPayments';
import BailApprovals from './pages/BailApprovals';
import PaymentReturn from './pages/PaymentReturn';
import AdminPanel from './pages/AdminPanel';
import StyleGuide from './pages/StyleGuide';
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
                {/* Public routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/most-wanted" element={<MostWanted />} />

                {/* Authenticated routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/cases" element={<Cases />} />
                <Route path="/cases/:id" element={<CaseDetail />} />
                <Route path="/cases/:id/review" element={<CaseReview />} />
                <Route path="/cases/:id/edit" element={<CaseEdit />} />
                <Route path="/cases/complaint/new" element={<CreateComplaint />} />
                <Route path="/cases/scene/new" element={<CreateCrimeScene />} />
                <Route path="/evidence" element={<Evidence />} />
                <Route path="/evidence/register" element={<EvidenceRegister />} />
                <Route path="/detective-board" element={<DetectiveBoard />} />
                <Route path="/suspects" element={<Suspects />} />
                <Route path="/suspect-submissions" element={<SuspectSubmissions />} />
                <Route path="/interrogations" element={<Interrogations />} />
                <Route path="/trials" element={<Trials />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/tip-reviews" element={<TipReview />} />
                <Route path="/bail" element={<BailPayments />} />
                <Route path="/bail/return" element={<PaymentReturn />} />
                <Route path="/bail-approvals" element={<BailApprovals />} />
                <Route path="/admin" element={<AdminPanel />} />

                {/* Utility routes */}
                <Route path="/style-guide" element={<StyleGuide />} />
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

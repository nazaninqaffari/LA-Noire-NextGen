 /**
 * Register Page
 * User registration with multi-field validation
 */
import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { api } from '../services/api';
import { SkeletonForm } from '../components/LoadingSkeleton';
import { extractErrorMessage } from '../utils/errorHandler';
import type { RegistrationData } from '../types';
import type { AxiosError } from 'axios';
import './Register.css';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<RegistrationData>({
    username: '',
    password: '',
    confirm_password: '',
    email: '',
    phone_number: '',
    first_name: '',
    last_name: '',
    national_id: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegistrationData, string>>>({});

  // Handle input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof RegistrationData]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RegistrationData, string>> = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone_number.replace(/[\s-]/g, ''))) {
      newErrors.phone_number = 'Invalid phone number (10-15 digits)';
    }

    // National ID validation
    if (!formData.national_id.trim()) {
      newErrors.national_id = 'National ID is required';
    } else if (formData.national_id.length < 8) {
      newErrors.national_id = 'National ID must be at least 8 characters';
    }

    // Name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (!validateForm()) {
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors in the form',
      });
      return;
    }

    setLoading(true);

    try {
      // Remove confirm_password and rename to password_confirm for backend
      const { confirm_password, ...restData } = formData;
      const registrationData = {
        ...restData,
        password_confirm: confirm_password,
      };
      
      await api.post('/accounts/users/', registrationData);

      addNotification({
        type: 'success',
        title: 'Registration Successful',
        message: 'Your account has been created. Please wait for administrator approval.',
        duration: 7000,
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = extractErrorMessage(
        axiosError,
        'Registration failed. Please try again.'
      );

      addNotification({
        type: 'error',
        title: 'Registration Failed',
        message: errorMessage,
        duration: 7000,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="register-page">
        <div className="register-container">
          <div className="register-header">
            <h1>Creating Your Account...</h1>
          </div>
          <SkeletonForm fields={8} />
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <div className="register-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <path
                d="M32 8C24.268 8 18 14.268 18 22C18 29.732 24.268 36 32 36C39.732 36 46 29.732 46 22C46 14.268 39.732 8 32 8Z"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M12 56C12 44.954 20.954 36 32 36C43.046 36 52 44.954 52 56"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
          <h1>Create Account</h1>
          <p className="register-subtitle">Join the LA Noire NextGen System</p>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          {/* Personal Information */}
          <div className="form-section">
            <h3 className="section-title">Personal Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">First Name *</label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.first_name ? 'error' : ''}
                  autoComplete="given-name"
                />
                {errors.first_name && <span className="error-message">{errors.first_name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="last_name">Last Name *</label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.last_name ? 'error' : ''}
                  autoComplete="family-name"
                />
                {errors.last_name && <span className="error-message">{errors.last_name}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="national_id">National ID *</label>
              <input
                type="text"
                id="national_id"
                name="national_id"
                value={formData.national_id}
                onChange={handleChange}
                disabled={loading}
                className={errors.national_id ? 'error' : ''}
                placeholder="Enter your national ID"
              />
              {errors.national_id && <span className="error-message">{errors.national_id}</span>}
            </div>
          </div>

          {/* Contact Information */}
          <div className="form-section">
            <h3 className="section-title">Contact Information</h3>
            
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                className={errors.email ? 'error' : ''}
                placeholder="detective@lapd.gov"
                autoComplete="email"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone_number">Phone Number *</label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                disabled={loading}
                className={errors.phone_number ? 'error' : ''}
                placeholder="1234567890"
                autoComplete="tel"
              />
              {errors.phone_number && <span className="error-message">{errors.phone_number}</span>}
            </div>
          </div>

          {/* Account Credentials */}
          <div className="form-section">
            <h3 className="section-title">Account Credentials</h3>
            
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={loading}
                className={errors.username ? 'error' : ''}
                placeholder="Choose a unique username"
                autoComplete="username"
              />
              {errors.username && <span className="error-message">{errors.username}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.password ? 'error' : ''}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                />
                {errors.password && <span className="error-message">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="confirm_password">Confirm Password *</label>
                <input
                  type="password"
                  id="confirm_password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  disabled={loading}
                  className={errors.confirm_password ? 'error' : ''}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
                {errors.confirm_password && <span className="error-message">{errors.confirm_password}</span>}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="register-footer">
          <p>
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
          <p className="note">
            * After registration, your account will have "Normal User" role by default.
            System administrators will assign additional roles as needed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

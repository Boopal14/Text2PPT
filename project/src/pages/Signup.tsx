import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import OTPFlow from 'raj-otp';

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showOTPFlow, setShowOTPFlow] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [verifiedMobile, setVerifiedMobile] = useState('');
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Mobile number must be 10 digits';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      if (!mobileVerified) {
        // Show OTP flow for mobile verification
        setShowOTPFlow(true);
      } else {
        // Proceed with signup
        const success = await signup(
          formData.fullName, 
          formData.username, 
          formData.email,
          verifiedMobile, // Use verified mobile number
          formData.password,
          formData.confirmPassword
        );
        if (success) {
          navigate('/login');
        } else {
          setErrors({ general: 'Signup failed. Username might already exist.' });
        }
      }
    }
  };

  const handleOTPComplete = (data: any) => {
    console.log("OTP Flow update:", data);
    
    if (data.stage === 'verified') {
      console.log("Mobile:", data.mobile);
      console.log("OTP Verified!");
      setMobileVerified(true);
      setVerifiedMobile(data.mobile);
      setShowOTPFlow(false);
      setFormData(prev => ({ ...prev, mobile: data.mobile }));
    } else if (data.stage === 'submitted') {
      console.log("User entered mobile:", data.mobile);
    } else if (data.stage === 'error') {
      console.log("OTP error:", data.error);
      setErrors({ mobile: data.error || 'OTP verification failed' });
    }
  };

  const handleBackClick = () => {
    navigate('/');
  };

  const handleCancelOTP = () => {
    setShowOTPFlow(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 relative">
          {/* Back Button */}
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Back to Home</span>
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Signup</h1>
            {mobileVerified && (
              <div className="flex items-center justify-center text-green-600 text-sm mt-2">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span>Mobile number verified</span>
              </div>
            )}
          </div>

          {/* OTP Flow Modal */}
          {showOTPFlow && (
            <div className="absolute inset-0 bg-white rounded-2xl z-10 p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Mobile Number</h2>
                <p className="text-gray-600 text-sm">
                  Scan the QR code with your mobile app to verify your number
                </p>
              </div>

              {/* OTP Flow Component */}
              <div className="mb-6">
                <OTPFlow
                  secretKey="9D941AF69FAA5E041172D29A8B459BB4"
                  apiEndpoint="http://192.168.165.190:3002/api/check-otp-availability"
                  onComplete={handleOTPComplete}
                  initialTheme="light" onError={undefined} onSuccess={undefined} customTheme={undefined}                />
              </div>

              {/* Cancel Button */}
              <button
                onClick={handleCancelOTP}
                className="w-full py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel Verification
              </button>
            </div>
          )}

          {/* General Error Message */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Enter your name"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 ${
                  errors.fullName ? 'border-red-300' : 'border-gray-200'
                }`}
                disabled={isLoading || showOTPFlow}
                required
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Choose a username"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 ${
                  errors.username ? 'border-red-300' : 'border-gray-200'
                }`}
                disabled={isLoading || showOTPFlow}
                required
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 ${
                  errors.email ? 'border-red-300' : 'border-gray-200'
                }`}
                disabled={isLoading || showOTPFlow}
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Mobile Field */}
            <div>
              <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <input
                  type="tel"
                  id="mobile"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleInputChange}
                  placeholder="Enter your mobile number"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 ${
                    errors.mobile ? 'border-red-300' : mobileVerified ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                  disabled={isLoading || showOTPFlow || mobileVerified}
                  required
                />
                {mobileVerified && (
                  <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.mobile && (
                <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>
              )}
              {mobileVerified && (
                <p className="mt-1 text-sm text-green-600">Mobile number verified successfully</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 ${
                  errors.password ? 'border-red-300' : 'border-gray-200'
                }`}
                disabled={isLoading || showOTPFlow}
                required
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Re-enter Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Re-enter password"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-200'
                }`}
                disabled={isLoading || showOTPFlow}
                required
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Signup Button */}
            <button
              type="submit"
              disabled={isLoading || showOTPFlow}
              className="w-full bg-green-500 text-white py-3 px-4 rounded-xl hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Creating account...
                </>
              ) : mobileVerified ? (
                'Complete Signup'
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Verify Mobile & Signup
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-blue-500 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
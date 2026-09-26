import React, { useState } from "react";
import {
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  QSenseEmblem,
  CheckCircleIcon,
  AlertTriangleIcon,
  PlayIcon,
} from "./Icons";

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
  onCancel?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onCancel }) => {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [username, setUsername] = useState<string>("telemetry_engineer");
  const [password, setPassword] = useState<string>("qsense2026");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!username.trim()) {
      setErrorMsg("Please enter your username or station ID.");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("Please enter your password / security key.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMsg(
        isSignUp
          ? "Account created successfully! Connecting..."
          : "Authentication verified! Access granted."
      );
      setTimeout(() => {
        onLoginSuccess(username.trim());
      }, 500);
    }, 400);
  };

  const handleQuickDemo = () => {
    setUsername("lead_quantum_analyst");
    setPassword("demo42_quantum");
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMsg("Demo engineer session initialized.");
      setTimeout(() => {
        onLoginSuccess("lead_quantum_analyst");
      }, 450);
    }, 300);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert(
      "Q-SENSE Security Notice:\nTo reset your station credentials, contact your telemetry administrator or use the 1-Click Demo Login."
    );
  };

  return (
    <div className="simple-login-container">
      {/* Background Soft Glow */}
      <div className="login-ambient-glow" />

      {/* Perfectly Centered Single Card */}
      <div className="simple-login-card">
        {/* Brand Header */}
        <div className="simple-login-header">
          <div className="simple-logo-badge">
            <QSenseEmblem size={24} />
          </div>
          <h1 className="simple-login-title">
            {isSignUp ? "Create Account" : "Sign In to Q-SENSE"}
          </h1>
          <p className="simple-login-subtitle">
            Urban IoT Quantum Telemetry Engine
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="simple-tab-switcher">
          <button
            type="button"
            className={`simple-tab-btn ${!isSignUp ? "active" : ""}`}
            onClick={() => {
              setIsSignUp(false);
              setErrorMsg(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`simple-tab-btn ${isSignUp ? "active" : ""}`}
            onClick={() => {
              setIsSignUp(true);
              setErrorMsg(null);
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="simple-login-alert alert-error">
            <AlertTriangleIcon size={15} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="simple-login-alert alert-success">
            <CheckCircleIcon size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="simple-login-form">
          {/* Username */}
          <div className="simple-field-group">
            <label className="simple-field-label">Username / Station ID</label>
            <div className="simple-input-box">
              <span className="simple-input-icon">
                <UserIcon size={16} />
              </span>
              <input
                type="text"
                className="simple-input"
                placeholder="e.g. telemetry_engineer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Password */}
          <div className="simple-field-group">
            <div className="simple-label-row">
              <label className="simple-field-label">Password / Security Key</label>
              {!isSignUp && (
                <button
                  type="button"
                  className="simple-forgot-link"
                  onClick={handleForgotPassword}
                >
                  Forgot?
                </button>
              )}
            </div>
            <div className="simple-input-box">
              <span className="simple-input-icon">
                <LockIcon size={16} />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="simple-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="simple-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="simple-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Verifying..."
              : isSignUp
              ? "Create Account"
              : "Sign In"}
          </button>

          {/* Divider */}
          <div className="simple-divider">
            <span>or</span>
          </div>

          {/* Quick Demo Button */}
          <button
            type="button"
            className="simple-demo-btn"
            onClick={handleQuickDemo}
            disabled={isSubmitting}
          >
            <PlayIcon size={13} />
            <span>Quick 1-Click Demo Login</span>
          </button>

          {/* Return to Dashboard */}
          {onCancel && (
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <button
                type="button"
                className="simple-back-btn"
                onClick={onCancel}
              >
                ← Back to Dashboard
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

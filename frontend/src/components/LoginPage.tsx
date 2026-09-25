import React, { useState } from "react";
import {
  UserIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  QSenseEmblem,
  CheckCircleIcon,
  AlertTriangleIcon,
  PlayIcon
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
      setErrorMsg("Please enter your telemetry username or station ID.");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("Please enter your security access key / password.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMsg(isSignUp ? "Account registered successfully! Connecting..." : "Authentication verified! Access granted.");
      setTimeout(() => {
        onLoginSuccess(username.trim());
      }, 700);
    }, 500);
  };

  const handleQuickDemo = () => {
    setUsername("lead_quantum_analyst");
    setPassword("demo42_quantum");
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMsg("Demo engineer session initialized. Access granted.");
      setTimeout(() => {
        onLoginSuccess("lead_quantum_analyst");
      }, 600);
    }, 400);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    alert("Q-SENSE Security Notice:\nTo reset your cryptographic station key, contact your local network telemetry administrator or use the demo login.");
  };

  return (
    <div className="login-page-container">
      {/* Centered Login Card using Uiverse structure by Praashoo7 themed to Q-SENSE */}
      <form className="form login-form" onSubmit={handleSubmit}>
        {/* Brand Lockup inside Card */}
        <div className="login-brand-header">
          <div className="login-emblem-badge">
            <QSenseEmblem size={20} />
          </div>
          <p id="heading">{isSignUp ? "Create Q-SENSE ID" : "Sign In to Q-SENSE"}</p>
          <div className="login-subheading">
            Urban IoT Quantum Telemetry Engine
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="login-alert alert-error">
            <AlertTriangleIcon size={13} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="login-alert alert-success">
            <CheckCircleIcon size={13} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Field 1: Username / Station ID */}
        <div className="field input">
          <span className="input-icon">
            <UserIcon size={15} />
          </span>
          <input
            type="text"
            className="input-field"
            placeholder="Username / Station ID"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={isSubmitting}
          />
        </div>

        {/* Field 2: Security Key / Password */}
        <div className="field input">
          <span className="input-icon">
            <LockIcon size={15} />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            className="input-field"
            placeholder="Security Key / Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword(!showPassword)}
            title={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
          </button>
        </div>

        {/* Action Buttons Row */}
        <div className="btn">
          <button
            type="submit"
            className="button1"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Verifying..." : isSignUp ? "Register" : "Login"}
          </button>
          <button
            type="button"
            className="button2"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
            }}
            disabled={isSubmitting}
          >
            {isSignUp ? "Sign In Instead" : "Sign Up"}
          </button>
        </div>

        {/* Quick Demo Access Bar */}
        <button
          type="button"
          className="button-demo-quick"
          onClick={handleQuickDemo}
          disabled={isSubmitting}
          title="Instant access with preconfigured demo session"
        >
          <PlayIcon size={12} />
          <span>Quick 1-Click Demo Login</span>
        </button>

        {/* Forgot Password Button */}
        <button
          type="button"
          className="button3"
          onClick={handleForgotPassword}
        >
          Forgot Password?
        </button>

        {onCancel && (
          <button
            type="button"
            className="button-back-dashboard"
            onClick={onCancel}
          >
            ← Back to Dashboard
          </button>
        )}
      </form>
    </div>
  );
};
export default LoginPage;

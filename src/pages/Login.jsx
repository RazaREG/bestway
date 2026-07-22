import { useState } from "react";
import { supabase } from "../supabaseClient";
import bcrypt from "bcryptjs";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { buildUserSession } from "../roles";

import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiLogIn,
  FiShield,
} from "react-icons/fi";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const signIn = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !data) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      const valid = await bcrypt.compare(password, data.password);

      if (!valid) {
        setError("Invalid email or password");
        setLoading(false);
        return;
      }

      localStorage.setItem("user", JSON.stringify(buildUserSession(data)));

      localStorage.setItem("isLoggedIn", "true");

      if (Capacitor.isNativePlatform()) {
        navigate("/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <style>
        {`
          .login-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow: hidden;
            position: relative;
            background:
              radial-gradient(circle at top left, rgba(59,130,246,.28), transparent 34%),
              radial-gradient(circle at bottom right, rgba(16,185,129,.18), transparent 30%),
              linear-gradient(135deg, #020617, #0f172a 48%, #1e293b);
          }

          .login-page::before {
            content: "";
            position: absolute;
            width: 500px;
            height: 500px;
            background: rgba(37,99,235,.15);
            filter: blur(100px);
            border-radius: 999px;
            top: -180px;
            left: -180px;
          }

          .login-page::after {
            content: "";
            position: absolute;
            width: 450px;
            height: 450px;
            background: rgba(16,185,129,.12);
            filter: blur(100px);
            border-radius: 999px;
            bottom: -150px;
            right: -150px;
          }

          .login-card {
            width: 100%;
            max-width: 430px;
            position: relative;
            z-index: 2;
            border-radius: 28px;
            padding: 38px 30px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.12);
            backdrop-filter: blur(22px);
            box-shadow: 0 30px 70px rgba(0,0,0,.38);
            overflow: hidden;
          }

          .login-card::before {
            content: "";
            position: absolute;
            width: 180px;
            height: 180px;
            border-radius: 999px;
            background: rgba(255,255,255,.08);
            top: -80px;
            right: -80px;
          }

          .brand-logo {
            width: 72px;
            height: 72px;
            border-radius: 22px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 34px;
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            color: #fff;
            box-shadow: 0 18px 38px rgba(37,99,235,.42);
          }

          .brand-title {
            font-size: 30px;
            font-weight: 800;
            color: #fff;
            margin-bottom: 8px;
            text-align: center;
            letter-spacing: -.5px;
          }

          .brand-subtitle {
            color: rgba(255,255,255,.68);
            text-align: center;
            margin-bottom: 28px;
            font-size: 14px;
          }

          .error-box {
            background: rgba(239,68,68,.16);
            border: 1px solid rgba(239,68,68,.35);
            color: #fecaca;
            padding: 12px 14px;
            border-radius: 14px;
            margin-bottom: 18px;
            font-size: 14px;
            font-weight: 500;
          }

          .input-group-custom {
            margin-bottom: 18px;
          }

          .input-label {
            display: block;
            font-size: 13px;
            font-weight: 700;
            color: rgba(255,255,255,.85);
            margin-bottom: 8px;
          }

          .input-wrapper {
            position: relative;
          }

          .input-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            font-size: 18px;
          }

          .custom-input {
            width: 100%;
            height: 54px;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,.12);
            background: rgba(255,255,255,.1);
            backdrop-filter: blur(10px);
            color: #fff;
            padding: 0 48px 0 46px;
            font-size: 15px;
            outline: none;
            transition: all .25s ease;
          }

          .custom-input::placeholder {
            color: rgba(255,255,255,.45);
          }

          .custom-input:focus {
            border-color: rgba(56,189,248,.65);
            background: rgba(255,255,255,.14);
            box-shadow: 0 0 0 4px rgba(56,189,248,.12);
          }

          .toggle-password {
            position: absolute;
            right: 14px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            color: #cbd5e1;
            cursor: pointer;
            font-size: 18px;
            transition: all .2s ease;
          }

          .toggle-password:hover {
            color: #fff;
            transform: translateY(-50%) scale(1.08);
          }

          .login-btn {
            width: 100%;
            height: 54px;
            border-radius: 16px;
            border: none;
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            color: #fff;
            font-size: 15px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            box-shadow: 0 18px 38px rgba(37,99,235,.35);
            transition: all .25s ease;
          }

          .login-btn:hover:not(:disabled) {
            transform: translateY(-3px);
            box-shadow: 0 22px 48px rgba(37,99,235,.48);
          }

          .login-btn:active {
            transform: scale(.98);
          }

          .login-btn:disabled {
            opacity: .7;
            cursor: not-allowed;
          }

          .footer-note {
            margin-top: 24px;
            text-align: center;
            font-size: 12px;
            color: rgba(255,255,255,.5);
          }

          .security-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.12);
            color: rgba(255,255,255,.72);
            padding: 8px 12px;
            border-radius: 999px;
            font-size: 12px;
            margin-top: 18px;
          }
        `}
      </style>

      <form onSubmit={signIn} className="login-card">
        <div className="brand-logo">
          <FiShield />
        </div>

        <h1 className="brand-title">Bestway Insulation</h1>

        <div className="brand-subtitle">
          Sign in to access your dashboard
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="input-group-custom">
          <label className="input-label">Email Address</label>

          <div className="input-wrapper">
            <FiMail className="input-icon" />

            <input
              type="email"
              className="custom-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
        </div>

        <div className="input-group-custom">
          <label className="input-label">Password</label>

          <div className="input-wrapper">
            <FiLock className="input-icon" />

            <input
              type={showPassword ? "text" : "password"}
              className="custom-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <button
              type="button"
              className="toggle-password"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="login-btn">
          <FiLogIn />

          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div className="text-center">
          <div className="security-badge">
            <FiShield />
            Secure Access Portal
          </div>
        </div>

        <div className="footer-note">
          © {new Date().getFullYear()} Bestway Insulation
        </div>
      </form>
    </div>
  );
}
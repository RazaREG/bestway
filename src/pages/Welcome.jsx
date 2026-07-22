import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogIn, FiShield, FiArrowRight } from "react-icons/fi";

export default function Welcome() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem("user");

    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, []);

  return (
    <div className="welcome-page">
      <style>
        {`
          .welcome-page {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(59,130,246,.28), transparent 34%),
              radial-gradient(circle at bottom right, rgba(16,185,129,.18), transparent 30%),
              linear-gradient(135deg, #020617, #0f172a 48%, #1e293b);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            color: #fff;
            position: relative;
            overflow: hidden;
          }

          .welcome-page::before {
            content: "";
            position: absolute;
            width: 420px;
            height: 420px;
            background: rgba(37,99,235,.16);
            filter: blur(90px);
            border-radius: 999px;
            top: -150px;
            left: -150px;
          }

          .welcome-page::after {
            content: "";
            position: absolute;
            width: 380px;
            height: 380px;
            background: rgba(16,185,129,.13);
            filter: blur(90px);
            border-radius: 999px;
            bottom: -140px;
            right: -140px;
          }

          .welcome-card {
            width: 100%;
            max-width: 430px;
            position: relative;
            z-index: 2;
            text-align: center;
            border-radius: 30px;
            padding: 42px 28px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.13);
            backdrop-filter: blur(22px);
            box-shadow: 0 30px 70px rgba(0,0,0,.38);
          }

          .welcome-logo {
            width: 78px;
            height: 78px;
            border-radius: 24px;
            margin: 0 auto 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            box-shadow: 0 18px 38px rgba(37,99,235,.42);
          }

          .welcome-title {
            font-size: 31px;
            font-weight: 800;
            margin-bottom: 10px;
            letter-spacing: -.5px;
          }

          .welcome-subtitle {
            font-size: 15px;
            color: rgba(255,255,255,.68);
            margin-bottom: 30px;
          }

          .login-btn {
            width: 100%;
            height: 54px;
            border-radius: 16px;
            border: none;
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            color: #fff;
            font-size: 16px;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            cursor: pointer;
            box-shadow: 0 18px 38px rgba(37,99,235,.35);
            transition: all .25s ease;
          }

          .login-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 22px 48px rgba(37,99,235,.48);
          }

          .login-btn:active {
            transform: scale(.98);
          }

          .secure-note {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin-top: 20px;
            padding: 8px 13px;
            border-radius: 999px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.12);
            color: rgba(255,255,255,.72);
            font-size: 12px;
          }

          .version {
            position: absolute;
            bottom: 22px;
            z-index: 3;
            font-size: 12px;
            color: rgba(255,255,255,.45);
          }
        `}
      </style>

      <div className="welcome-card">
        <div className="welcome-logo">
          <FiShield />
        </div>

        <h1 className="welcome-title">Bestway Insulation</h1>

        <p className="welcome-subtitle">
          Welcome to your mobile workforce dashboard
        </p>

        <button className="login-btn" onClick={() => navigate("/login")}>
          <FiLogIn />
          Login
          <FiArrowRight />
        </button>

        <div className="secure-note">
          <FiShield />
          Secure company access
        </div>
      </div>

      <p className="version">Version 1.0</p>
    </div>
  );
}
import { useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiBriefcase,
  FiCalendar,
  FiUsers,
  FiTruck,
  FiPackage,
  FiLogOut,
  FiClock,
} from "react-icons/fi";
import { hasRole, isAdminOrSubAdmin, getCrewRoleIds } from "../roles";

export default function AppDashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const isAdmin = isAdminOrSubAdmin(user);
  const isFullAdmin = hasRole(user, "admin");
  const hasCrewRole = getCrewRoleIds(user).length > 0;

  const cards = [
    {
      title: "Main Menu",
      icon: <FiGrid />,
      path: "/main",
      show: true,
    },
    {
      title: "My Jobs",
      icon: <FiBriefcase />,
      path: "/my_jobs",
      show: hasCrewRole || !isAdmin,
    },
    {
      title: "Schedule",
      icon: <FiCalendar />,
      path: "/schedule",
      show: isAdmin,
    },
    {
      title: "Users",
      icon: <FiUsers />,
      path: "/users",
      show: isFullAdmin,
    },
    {
      title: "Crews",
      icon: <FiTruck />,
      path: "/crews",
      show: isFullAdmin,
    },
    {
      title: "Inventory",
      icon: <FiPackage />,
      path: "/inventory",
      show: isFullAdmin,
    },
    {
      title: "Job Hours",
      icon: <FiClock />,
      path: "/job_hours",
      show: isAdmin,
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, #334155 0, transparent 35%), linear-gradient(135deg, #020617, #0f172a 50%, #1e293b)",
        padding: "24px",
        color: "#fff",
      }}
    >
      <style>
        {`
          .dash-card {
            padding: 20px 14px;
            border-radius: 18px;
            border: 1px solid rgba(255,255,255,0.12);
            background: rgba(255,255,255,0.08);
            backdrop-filter: blur(14px);
            color: #fff;
            cursor: pointer;
            box-shadow: 0 12px 30px rgba(0,0,0,0.28);
            transition: all .25s ease;
            min-height: 115px;
          }

          .dash-card:hover {
            transform: translateY(-5px) scale(1.02);
            background: rgba(255,255,255,0.14);
            box-shadow: 0 18px 40px rgba(0,0,0,0.38);
          }

          .dash-card:active {
            transform: scale(.98);
          }

          .dash-icon {
            width: 42px;
            height: 42px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 12px;
            font-size: 22px;
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            box-shadow: 0 8px 20px rgba(37,99,235,.35);
          }

          .logout-btn {
            width: 100%;
            padding: 14px;
            border-radius: 14px;
            background: linear-gradient(135deg, #ef4444, #b91c1c);
            color: #fff;
            border: none;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 12px 28px rgba(239,68,68,.3);
            transition: all .25s ease;
          }

          .logout-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 35px rgba(239,68,68,.42);
          }
        `}
      </style>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          Dashboard
        </h2>
        <p style={{ opacity: 0.7, margin: 0 }}>
          Welcome back, {user?.name || "User"}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        {cards
          .filter((item) => item.show)
          .map((item) => (
            <button
              key={item.title}
              className="dash-card"
              onClick={() => navigate(item.path)}
            >
              <div className="dash-icon">{item.icon}</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {item.title}
              </div>
            </button>
          ))}
      </div>

      <div style={{ marginTop: 34 }}>
        <button
          className="logout-btn"
          onClick={() => {
            localStorage.removeItem("user");
            localStorage.removeItem("isLoggedIn");
            window.dispatchEvent(new Event("auth-change"));
            navigate("/login", { replace: true });
          }}
        >
          <FiLogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}

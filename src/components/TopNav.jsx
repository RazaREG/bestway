import React, { useEffect, useState } from "react";
import {
  FiBell,
  FiMenu,
  FiGrid,
  FiBriefcase,
  FiCalendar,
  FiUsers,
  FiTruck,
  FiPackage,
  FiLogOut,
  FiClipboard,
  FiClock,
} from "react-icons/fi";
import { Badge } from "react-bootstrap";
import Offcanvas from "react-bootstrap/Offcanvas";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { hasRole, isAdminOrSubAdmin, getCrewRoleIds } from "../roles";

export default function TopNav() {
  const [user, setUser] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    setUser(parsedUser);

    if (parsedUser?.id) {
      fetchNotifications(parsedUser.id);
    }
  }, []);

  const isAdmin = isAdminOrSubAdmin(user);
  const hasCrewRole = getCrewRoleIds(user).length > 0;
  const isFullAdmin = hasRole(user, "admin");

  const fetchNotifications = async (userId) => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setNotifications(data || []);
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleSignOut = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const closeMenu = () => setShowMenu(false);

  const menuLinkStyle = {
    color: "#fff",
    textDecoration: "none",
    padding: "13px 14px",
    borderRadius: "14px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontWeight: 600,
    transition: "all .25s ease",
  };

  return (
    <>
      <style>
        {`
          .top-icon-btn {
            width: 38px;
            height: 38px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.12);
            transition: all .25s ease;
            cursor: pointer;
          }

          .top-icon-btn:hover {
            background: rgba(255,255,255,0.16);
            transform: translateY(-2px);
          }

          .side-link:hover {
            background: rgba(56,189,248,0.18) !important;
            transform: translateX(-4px);
            border-color: rgba(56,189,248,.35) !important;
          }

          .drawer-logout {
            border: none;
            padding: 13px 16px;
            border-radius: 14px;
            color: #fff;
            font-weight: 700;
            background: linear-gradient(135deg, #ef4444, #991b1b);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 12px 28px rgba(239,68,68,.28);
            transition: all .25s ease;
          }

          .drawer-logout:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 36px rgba(239,68,68,.4);
          }
        `}
      </style>

      <div
        style={{
          height: 66,
          background:
            "linear-gradient(135deg, rgba(2,6,23,.96), rgba(15,23,42,.96), rgba(30,41,59,.96))",
          backdropFilter: "blur(14px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          color: "#fff",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          boxShadow: "0 10px 30px rgba(0,0,0,.28)",
          borderBottom: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <Link
          to="/dashboard"
          aria-label="Go to dashboard"
          style={{
            color: "inherit",
            textDecoration: "none",
            display: "block",
            cursor: "pointer",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: ".2px" }}>
            Bestway
          </div>
          <div style={{ fontSize: 11, opacity: 0.6 }}>
            Management Panel
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <div
              className="top-icon-btn"
              onClick={() => navigate("/notifications")}
            >
              <FiBell size={20} />
            </div>

            {unreadCount > 0 && (
              <Badge
                bg="danger"
                pill
                style={{
                  position: "absolute",
                  top: -5,
                  right: -6,
                  fontSize: 10,
                  boxShadow: "0 4px 10px rgba(220,38,38,.4)",
                }}
              >
                {unreadCount}
              </Badge>
            )}
          </div>

          <div className="top-icon-btn" onClick={() => setShowMenu(true)}>
            <FiMenu size={24} />
          </div>
        </div>
      </div>

      <Offcanvas
        show={showMenu}
        onHide={closeMenu}
        placement="end"
        style={{
          background:
            "radial-gradient(circle at top right, #334155 0, transparent 36%), linear-gradient(180deg, #020617, #111827)",
          color: "#fff",
        }}
      >
        <Offcanvas.Header closeButton closeVariant="white">
          <Offcanvas.Title style={{ fontWeight: 800 }}>
            Menu
          </Offcanvas.Title>
        </Offcanvas.Header>

        <Offcanvas.Body>
          <div className="d-flex flex-column gap-3">
            <Link
              className="side-link"
              style={menuLinkStyle}
              to="/dashboard"
              onClick={closeMenu}
            >
              <FiGrid /> Dashboard
            </Link>

            {(hasCrewRole || !isAdmin) && (
              <Link
                className="side-link"
                style={menuLinkStyle}
                to="/my_jobs"
                onClick={closeMenu}
              >
                <FiBriefcase /> My Jobs
              </Link>
            )}

            {isAdmin && (
              <>
                <Link className="side-link" style={menuLinkStyle} to="/schedule" onClick={closeMenu}>
                  <FiCalendar /> Schedule
                </Link>

                {isFullAdmin && (
                  <Link className="side-link" style={menuLinkStyle} to="/users" onClick={closeMenu}>
                    <FiUsers /> Users
                  </Link>
                )}

                {isFullAdmin && (
                  <Link className="side-link" style={menuLinkStyle} to="/crews" onClick={closeMenu}>
                    <FiTruck /> Crews
                  </Link>
                )}

                <Link className="side-link" style={menuLinkStyle} to="/job_details" onClick={closeMenu}>
                  <FiClipboard /> Jobs
                </Link>

                <Link className="side-link" style={menuLinkStyle} to="/job_hours" onClick={closeMenu}>
                  <FiClock /> Job Hours
                </Link>

                <Link className="side-link" style={menuLinkStyle} to="/inventory" onClick={closeMenu}>
                  <FiPackage /> Inventory
                </Link>
              </>
            )}

            <hr style={{ borderColor: "rgba(255,255,255,0.16)" }} />

            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.6 }}>Signed in as</div>
              <div style={{ fontSize: 14, fontWeight: 600, wordBreak: "break-all" }}>
                {user?.email}
              </div>
            </div>

            <button className="drawer-logout" onClick={handleSignOut}>
              <FiLogOut />
              Logout
            </button>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

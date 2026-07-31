import { Capacitor } from '@capacitor/core';
import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "./supabase";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Schedule from "./pages/Schedule";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Crews from "./pages/Crews";
import JobDetails from "./pages/JobDetails";
import AdminJobHours from "./pages/AdminJobHours";
import MyJobs from "./pages/MyJobs";
import TopNav from "./components/TopNav";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AppVerification from "./pages/AppVerification";
import Notifications from "./pages/Notifications";
import AdminInventory from "./pages/AdminInventory";
import { useEffect } from "react";
import Welcome from "./pages/Welcome";
import AppDashboard from "./pages/AppDashboard";
import Inventory from "./pages/Inventory";
import { hasAnyRole, normalizeUserRoles } from "./roles";

import { StatusBar, Style } from '@capacitor/status-bar';

/* ----------------- Auth + Role hooks ----------------- */
function useAuthUser() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkUser = () => {
      try {
        const storedUser = localStorage.getItem("user");
        setUser(storedUser ? JSON.parse(storedUser) : null);
      } catch (e) {
        setUser(null);
      }
      setLoading(false);
    };

    checkUser();

    // safer interval check (better than storage event for mobile apps)
    const interval = setInterval(checkUser, 500);

    StatusBar.setBackgroundColor({ color: '#ffffff' });
    StatusBar.setStyle({ style: Style.Dark });

    return () => {
      clearInterval(interval);
      window.removeEventListener("auth-change", checkUser);
    };
  }, []);

  return { user, loading };
}

function ProtectedRoute({ children, authChanged }) {
  const { user, loading } = useAuthUser();

  React.useEffect(() => {}, [authChanged]); // force re-check

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

function RoleRoute({ children, allow = [], allowAnyCrew = false }) {
  const { user, loading } = useAuthUser();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  const roleNames = normalizeUserRoles(user).map((r) => r.role);
  const permitted =
    hasAnyRole(user, allow) ||
    (allowAnyCrew && roleNames.some((r) => r?.startsWith("crew_")));

  if (!permitted) return <Navigate to="/" replace />;

  return children;
}

/* ----------------- App ----------------- */
export default function App() {
  const location = useLocation();
  const isApp = Capacitor.isNativePlatform();
  const publicBrowserPath = window.location.pathname.replace(/\/+$/, "");
  const isDirectPrivacyPolicyRequest = publicBrowserPath.endsWith("/privacy-policy");
  const hideTopNavRoutes = ["/login", "/signup", "/", "/privacy-policy"];
  const hideTopNav =
    hideTopNavRoutes.includes(location.pathname) || isDirectPrivacyPolicyRequest;

  const [authChanged, setAuthChanged] = React.useState(0);

  useEffect(() => {
    const setupStatusBar = async () => {
      if (Capacitor.isNativePlatform()) {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: '#000000' });
        await StatusBar.setStyle({ style: Style.Light });
      }
    };

    setupStatusBar();
  }, []);

  if (!isApp && isDirectPrivacyPolicyRequest) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <PrivacyPolicy />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "rgb(221 232 242)" }}>
      {!hideTopNav  && <TopNav />}

      <Routes>

        {/* 📱 APP FLOW */}
        {isApp ? (
          <>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <AppDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/main"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/my_jobs"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <MyJobs />
                </ProtectedRoute>
              }
            />

            {/* optional */}
            <Route
              path="/schedule"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <Schedule />
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <Users />
                </ProtectedRoute>
              }
            />

            <Route
              path="/job_details"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <JobDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/job_hours"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <AdminJobHours />
                </ProtectedRoute>
              }
            />

            <Route
              path="/crews"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <Crews />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <AdminInventory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory-data"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <Inventory />
                </ProtectedRoute>
              }
            />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            {/* 🌐 WEB FLOW */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route path="/notifications" element={<Notifications />} />

            <Route
              path="/"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <Navigate to="/dashboard" replace />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <RoleRoute allow={["admin", "sub-admin"]} allowAnyCrew>
                    <Dashboard />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/schedule"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <RoleRoute allow={["admin", "sub-admin"]}>
                    <Schedule />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <RoleRoute allow={["admin"]}>
                    <Users />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/crews"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <RoleRoute allow={["admin"]}>
                    <Crews />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/job_details"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <RoleRoute allow={["admin", "sub-admin"]}>
                    <JobDetails />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/job_hours"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <RoleRoute allow={["admin", "sub-admin"]}>
                    <AdminJobHours />
                  </RoleRoute>
                </ProtectedRoute>
              }
            />

            <Route
              path="/my_jobs"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <MyJobs />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <AdminInventory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory-data"
              element={
                <ProtectedRoute authChanged={authChanged}>
                  <Inventory />
                </ProtectedRoute>
              }
            />

            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/app-verification" element={<AppVerification />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        )}

      </Routes>
    </div>
  );
}

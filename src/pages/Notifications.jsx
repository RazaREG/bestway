import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  Container,
  Card,
  Spinner,
  Pagination,
  Button,
  Row,
  Col,
  Badge,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiBell,
  FiCheck,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";

export default function Notifications() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const limit = 10;
  const totalPages = Math.ceil(totalCount / limit);

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line
  }, [page]);

  async function fetchNotifications() {
    setLoading(true);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!error) {
      setNotifications(data);
      setTotalCount(count);
    } else {
      console.error("Error fetching notifications:", error);
    }

    setLoading(false);
  }

  async function markAsRead(id) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

    if (unreadIds.length === 0) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="notifications-page">
      <style>
        {`
          .notifications-page {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(59,130,246,.26), transparent 34%),
              radial-gradient(circle at bottom right, rgba(16,185,129,.18), transparent 30%),
              linear-gradient(135deg, #020617, #0f172a 48%, #1e293b);
            padding: 24px 0;
            color: #fff;
          }

          .back-btn {
            width: 44px;
            height: 44px;
            border: 1px solid rgba(255,255,255,.16);
            background: rgba(255,255,255,.1);
            color: #fff;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all .25s ease;
            margin-bottom: 18px;
          }

          .back-btn:hover {
            transform: translateX(-3px);
            background: rgba(255,255,255,.18);
          }

          .page-title {
            font-size: 28px;
            font-weight: 800;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .page-subtitle {
            color: rgba(255,255,255,.65);
            font-size: 14px;
            margin-top: 6px;
          }

          .primary-action {
            border: none;
            border-radius: 14px;
            padding: 12px 18px;
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            color: #fff;
            font-weight: 700;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 12px 28px rgba(37,99,235,.32);
            transition: all .25s ease;
          }

          .primary-action:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 36px rgba(37,99,235,.42);
          }

          .notification-card {
            border-radius: 22px;
            border: 1px solid rgba(255,255,255,.12);
            overflow: hidden;
            backdrop-filter: blur(16px);
            transition: all .25s ease;
            box-shadow: 0 18px 42px rgba(0,0,0,.24);
          }

          .notification-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 26px 55px rgba(0,0,0,.36);
          }

          .notification-unread {
            background: linear-gradient(135deg, rgba(37,99,235,.95), rgba(30,41,59,.95));
            color: #fff;
          }

          .notification-read {
            background: rgba(255,255,255,.96);
            color: #0f172a;
          }

          .notification-icon {
            width: 52px;
            height: 52px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            flex-shrink: 0;
          }

          .icon-unread {
            background: rgba(255,255,255,.18);
            color: #fff;
          }

          .icon-read {
            background: #dbeafe;
            color: #2563eb;
          }

          .notification-title {
            font-size: 17px;
            font-weight: 700;
            margin-bottom: 6px;
          }

          .notification-message {
            opacity: .8;
            line-height: 1.5;
          }

          .notification-time {
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 5px;
            opacity: .7;
          }

          .mark-read-btn {
            border-radius: 12px !important;
            font-weight: 700 !important;
            display: inline-flex !important;
            align-items: center;
            gap: 6px;
          }

          .empty-state {
            border-radius: 24px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.12);
            backdrop-filter: blur(16px);
            padding: 60px 30px;
            text-align: center;
            box-shadow: 0 18px 45px rgba(0,0,0,.25);
          }

          .empty-icon {
            width: 70px;
            height: 70px;
            border-radius: 22px;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 20px;
          }

          .pagination .page-link {
            border-radius: 12px !important;
            margin: 0 3px;
            border: none !important;
            color: #0f172a;
            font-weight: 700;
          }

          .pagination .active .page-link {
            background: #2563eb !important;
            color: #fff !important;
          }

          .loading-box {
            border-radius: 22px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.12);
            backdrop-filter: blur(16px);
            padding: 60px;
            box-shadow: 0 18px 45px rgba(0,0,0,.25);
          }
        `}
      </style>

      <Container className="mt-4">
        <button className="back-btn" onClick={() => navigate("/dashboard")}>
          <FiArrowLeft />
        </button>

        <Row className="mb-4 align-items-center">
          <Col>
            <h3 className="page-title">
              <FiBell />
              Notifications
            </h3>

            <div className="page-subtitle">
              Stay updated with inventory alerts, job updates, and system events.
            </div>
          </Col>

          <Col xs="auto">
            <button className="primary-action" onClick={markAllAsRead}>
              <FiCheckCircle />
              Mark All Read
            </button>
          </Col>
        </Row>

        {!loading && unreadCount > 0 && (
          <div className="mb-3">
            <Badge bg="danger" pill style={{ fontSize: 13, padding: "8px 12px" }}>
              {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
            </Badge>
          </div>
        )}

        {loading && (
          <div className="text-center loading-box">
            <Spinner animation="border" variant="light" />
            <div className="mt-3" style={{ opacity: 0.75 }}>
              Loading notifications...
            </div>
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <FiBell />
            </div>

            <h4 className="fw-bold mb-2">No Notifications</h4>

            <div style={{ opacity: 0.7 }}>
              You don't have any notifications yet.
            </div>
          </div>
        )}

        {!loading &&
          notifications.map((n) => (
            <Card
              key={n.id}
              className={`mb-3 notification-card ${
                !n.is_read ? "notification-unread" : "notification-read"
              }`}
            >
              <Card.Body>
                <Row className="align-items-start">
                  <Col xs="auto">
                    <div
                      className={`notification-icon ${
                        !n.is_read ? "icon-unread" : "icon-read"
                      }`}
                    >
                      <FiBell />
                    </div>
                  </Col>

                  <Col>
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                      <div>
                        <div className="notification-title">{n.title}</div>

                        <div className="notification-message">{n.message}</div>
                      </div>

                      {!n.is_read && (
                        <Badge bg="light" text="dark" pill>
                          New
                        </Badge>
                      )}
                    </div>

                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
                      <div className="notification-time">
                        <FiClock />
                        {new Date(n.created_at).toLocaleString()}
                      </div>

                      {!n.is_read && (
                        <Button
                          size="sm"
                          variant="light"
                          className="mark-read-btn"
                          onClick={() => markAsRead(n.id)}
                        >
                          <FiCheck />
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          ))}

        {totalPages > 1 && (
          <Pagination className="justify-content-center mt-4 flex-wrap">
            <Pagination.Prev
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            />

            {[...Array(totalPages)].map((_, index) => (
              <Pagination.Item
                key={index + 1}
                active={page === index + 1}
                onClick={() => setPage(index + 1)}
              >
                {index + 1}
              </Pagination.Item>
            ))}

            <Pagination.Next
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            />
          </Pagination>
        )}
      </Container>
    </div>
  );
}
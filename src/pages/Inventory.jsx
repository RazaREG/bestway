import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Spinner,
  Badge,
} from "react-bootstrap";
import {
  FiPackage,
  FiBox,
  FiShoppingBag,
  FiAlertTriangle,
  FiCheckCircle,
  FiLock,
} from "react-icons/fi";

export default function Inventory() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQty, setSelectedQty] = useState({});
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (!user?.inventory_access) return;
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);

    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name", { ascending: true });

    if (!error) setItems(data);

    setLoading(false);
  }

  function handleQtyChange(id, value) {
    setSelectedQty((prev) => ({
      ...prev,
      [id]: Number(value),
    }));
  }

  async function handlePickup(item) {
    const qty = selectedQty[item.id] || 0;

    if (qty <= 0 || qty > item.stock_qty) return;

    setProcessingId(item.id);

    try {
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({
          stock_qty: item.stock_qty - qty,
        })
        .eq("id", item.id);

      if (updateError) throw updateError;

      await supabase.from("inventory_logs").insert({
        created_by: user.id,
        item_id: item.id,
        quantity: qty,
        action_type: "pickup",
      });

      await fetch("http://138.197.143.189:5000/api/send-inventory-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: item.name,
          qty,
          userEmail: user.email,
        }),
      });

      if (item.stock_qty - qty <= item.min_threshold) {
        await supabase.from("notifications").insert({
          user_id: "c2d4fe04-689c-47c2-a17c-f3fa9a7c2bf8",
          title: "Low Stock Alert",
          message: `${item.name} is running low`,
          type: "low_stock",
        });
      }

      alert("Material picked successfully");

      await fetchItems();
    } catch (err) {
      alert(err.message);
    }

    setProcessingId(null);
  }

  if (!user?.inventory_access) {
    return (
      <div className="inventory-shell d-flex align-items-center justify-content-center">
        <style>
          {`
            .inventory-shell {
              min-height: 100vh;
              background:
                radial-gradient(circle at top left, rgba(239,68,68,.22), transparent 34%),
                linear-gradient(135deg, #020617, #0f172a 48%, #1e293b);
              color: #fff;
              padding: 24px;
            }

            .access-card {
              border-radius: 24px;
              background: rgba(255,255,255,.09);
              border: 1px solid rgba(255,255,255,.13);
              backdrop-filter: blur(16px);
              padding: 34px;
              text-align: center;
              box-shadow: 0 18px 45px rgba(0,0,0,.3);
              max-width: 420px;
            }

            .access-icon {
              width: 64px;
              height: 64px;
              border-radius: 22px;
              background: linear-gradient(135deg, #ef4444, #991b1b);
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 18px;
              font-size: 28px;
            }
          `}
        </style>

        <div className="access-card">
          <div className="access-icon">
            <FiLock />
          </div>
          <h4 className="fw-bold">Access Denied</h4>
          <p style={{ opacity: 0.7, marginBottom: 0 }}>
            You do not have permission to access inventory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="inventory-shell">
      <style>
        {`
          .inventory-shell {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(59,130,246,.26), transparent 34%),
              radial-gradient(circle at bottom right, rgba(16,185,129,.18), transparent 30%),
              linear-gradient(135deg, #020617, #0f172a 48%, #1e293b);
            padding: 24px 0;
            color: #fff;
          }

          .inventory-title {
            font-size: 28px;
            font-weight: 800;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .inventory-subtitle {
            color: rgba(255,255,255,.65);
            font-size: 14px;
            margin-top: 6px;
          }

          .inventory-card {
            border: 1px solid rgba(255,255,255,.12);
            border-radius: 22px;
            background: rgba(255,255,255,.95);
            color: #0f172a;
            overflow: hidden;
            box-shadow: 0 18px 42px rgba(0,0,0,.25);
            transition: all .25s ease;
          }

          .inventory-card:hover {
            transform: translateY(-7px);
            box-shadow: 0 26px 55px rgba(0,0,0,.36);
          }

          .item-icon {
            width: 48px;
            height: 48px;
            border-radius: 16px;
            background: linear-gradient(135deg, #38bdf8, #2563eb);
            color: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 23px;
            box-shadow: 0 10px 24px rgba(37,99,235,.28);
          }

          .qty-input {
            border-radius: 14px !important;
            min-height: 45px;
          }

          .pickup-btn {
            border: none !important;
            border-radius: 14px !important;
            min-height: 46px;
            font-weight: 700 !important;
            display: flex !important;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all .25s ease;
          }

          .pickup-btn:hover:not(:disabled) {
            transform: translateY(-2px);
          }

          .pickup-active {
            background: linear-gradient(135deg, #0f172a, #334155) !important;
          }

          .pickup-disabled {
            background: #94a3b8 !important;
          }

          .loading-panel {
            border-radius: 22px;
            background: rgba(255,255,255,.08);
            border: 1px solid rgba(255,255,255,.12);
            backdrop-filter: blur(16px);
            padding: 60px;
            box-shadow: 0 18px 45px rgba(0,0,0,.25);
          }

          .stock-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 14px;
          }

          .category-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 10px;
            border-radius: 999px;
            background: #f1f5f9;
            color: #475569;
            font-size: 13px;
            font-weight: 600;
          }
        `}
      </style>

      <Container className="py-4">
        <div className="mb-4">
          <h3 className="inventory-title">
            <FiPackage />
            Inventory
          </h3>
          <div className="inventory-subtitle">
            Pick materials, track stock, and trigger low-stock alerts.
          </div>
        </div>

        {loading ? (
          <div className="text-center loading-panel">
            <Spinner animation="border" variant="light" />
            <div className="mt-3" style={{ opacity: 0.75 }}>
              Loading inventory...
            </div>
          </div>
        ) : (
          <Row>
            {items.map((item) => {
              const qty = selectedQty[item.id] || 0;
              const isValidQty = qty > 0 && qty <= item.stock_qty;
              const isProcessing = processingId === item.id;
              const isLowStock = item.stock_qty <= item.min_threshold;

              return (
                <Col md={4} key={item.id} className="mb-4">
                  <Card className="inventory-card h-100 border-0">
                    <Card.Body className="d-flex flex-column">
                      <div className="stock-row">
                        <div className="item-icon">
                          <FiBox />
                        </div>

                        <Badge bg={item.stock_qty > 0 ? "success" : "danger"}>
                          Stock: {item.stock_qty} {item.unit}
                        </Badge>
                      </div>

                      <h5 className="fw-bold mb-2">{item.name}</h5>

                      <div className="category-pill mb-3">
                        <FiShoppingBag />
                        {item.category}
                      </div>

                      {isLowStock && (
                        <div
                          className="mb-3"
                          style={{
                            color: "#b45309",
                            background: "#fef3c7",
                            borderRadius: 12,
                            padding: "9px 11px",
                            fontSize: 13,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                          }}
                        >
                          <FiAlertTriangle />
                          Low stock warning
                        </div>
                      )}

                      <Form.Control
                        type="number"
                        placeholder="Enter quantity"
                        className="mb-3 qty-input"
                        min={1}
                        max={item.stock_qty}
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                      />

                      <Button
                        className={`mt-auto w-100 pickup-btn ${
                          isValidQty ? "pickup-active" : "pickup-disabled"
                        }`}
                        disabled={!isValidQty || isProcessing}
                        onClick={() => handlePickup(item)}
                      >
                        {isProcessing ? (
                          <>
                            <Spinner size="sm" animation="border" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <FiCheckCircle />
                            Pick Material
                          </>
                        )}
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Container>
    </div>
  );
}
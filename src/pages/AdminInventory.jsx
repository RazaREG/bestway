import React, { useEffect, useState } from "react";
import { supabase } from "../supabase";
import {
  Card,
  Button,
  Form,
  Modal,
  Table,
  Spinner,
  Badge,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiSearch,
  FiPackage,
  FiEdit2,
  FiTrash2,
  FiRefreshCw,
  FiAlertTriangle,
} from "react-icons/fi";

export default function AdminInventory() {
  const [items, setItems] = useState([]);
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [editMode, setEditMode] = useState(false);

  const emptyForm = {
    name: "",
    category: "",
    stock: 0,
    unit: "",
    min_threshold: 0,
    deduct_ratio: 1,
  };

  const [form, setForm] = useState(emptyForm);

  const [adjustForm, setAdjustForm] = useState({
    type: "add",
    qty: "",
    note: "",
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    fetchItems();
    fetchCrews();
  }, []);

  async function fetchItems() {
    setLoading(true);

    const { data } = await supabase
      .from("inventory_items")
      .select("*")
      .order("created_at", { ascending: false });

    setItems(data || []);
    setLoading(false);
  }

  async function fetchCrews() {
    const { data } = await supabase.from("crews").select("name").order("name");

    setCrews(data || []);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function parseDeductRatio(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 1;
    return Math.round(n * 10000) / 10000;
  }

  async function handleSave() {
    if (!form.name || !form.category) {
      return alert("Fill required fields");
    }

    const deductRatio = parseDeductRatio(form.deduct_ratio);
    const payload = {
      name: form.name,
      category: form.category,
      stock_qty: Number(form.stock),
      unit: form.unit,
      min_threshold: Number(form.min_threshold),
      deduct_ratio: deductRatio,
    };

    if (editMode) {
      const { error } = await supabase
        .from("inventory_items")
        .update(payload)
        .eq("id", selectedItem.id);

      await supabase.from("inventory_logs").insert({
        item_id: selectedItem.id,
        action_type: "edit",
        quantity: 0,
        previous_stock: selectedItem.stock_qty,
        new_stock: Number(form.stock),
        note: "Item details updated",
        created_by: JSON.parse(localStorage.getItem("user"))?.id,
      });

      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.from("inventory_items").insert(payload);

      if (error) return alert(error.message);
    }

    setShowModal(false);
    setEditMode(false);
    setForm(emptyForm);
    fetchItems();
  }

  function handleEdit(item) {
    setEditMode(true);
    setForm({
      name: item.name,
      category: item.category,
      stock: item.stock_qty,
      unit: item.unit,
      min_threshold: item.min_threshold,
      deduct_ratio: item.deduct_ratio ?? 1,
    });
    setSelectedItem(item);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditMode(false);
    setForm(emptyForm);
  }

  function openAdjustModal(item) {
    setSelectedItem(item);
    setAdjustForm({
      type: "add",
      qty: "",
      note: "",
    });
    setShowAdjust(true);
  }

  function handleAdjustChange(e) {
    setAdjustForm({
      ...adjustForm,
      [e.target.name]: e.target.value,
    });
  }

  async function handleAdjustSave() {
    if (!adjustForm.qty) return alert("Enter quantity");

    const qty = Number(adjustForm.qty);
    let newStock = selectedItem.stock_qty;
    const prevStock = selectedItem.stock_qty;

    if (adjustForm.type === "add") {
      newStock += qty;
    } else if (adjustForm.type === "remove") {
      newStock -= qty;
      if (newStock < 0) return alert("Stock cannot be negative");
    } else if (adjustForm.type === "set") {
      newStock = qty;
    }

    const { error } = await supabase
      .from("inventory_items")
      .update({ stock_qty: newStock })
      .eq("id", selectedItem.id);

    if (error) return alert(error.message);

    await supabase.from("inventory_logs").insert({
      item_id: selectedItem.id,
      action_type: adjustForm.type,
      quantity: qty,
      previous_stock: prevStock,
      new_stock: newStock,
      note: adjustForm.note,
      created_by: JSON.parse(localStorage.getItem("user"))?.id,
    });

    setShowAdjust(false);
    fetchItems();
  }

  async function deleteItem(id) {
    if (!window.confirm("Delete this item?")) return;

    await supabase.from("inventory_items").delete().eq("id", id);
    fetchItems();
  }

  const filteredItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredItems.length / pageSize);

  const paginatedItems = filteredItems.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div className="admin-inventory-page">
      <style>
        {`
          .admin-inventory-page {
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

          .glass-panel {
            border-radius: 22px;
            border: 1px solid rgba(255,255,255,.12);
            background: rgba(255,255,255,.08);
            backdrop-filter: blur(16px);
            box-shadow: 0 18px 45px rgba(0,0,0,.28);
          }

          .search-input {
            border-radius: 14px !important;
            border: 1px solid rgba(255,255,255,.12) !important;
            background: rgba(255,255,255,.95) !important;
            min-height: 46px;
          }

          .inventory-table-card {
            border-radius: 22px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,.12);
            background: rgba(255,255,255,.95);
            box-shadow: 0 18px 45px rgba(0,0,0,.28);
          }

          .inventory-table-card thead th {
            background: #0f172a !important;
            color: #fff !important;
            border-color: rgba(255,255,255,.08) !important;
            padding: 14px !important;
          }

          .inventory-table-card tbody td {
            vertical-align: middle;
            padding: 14px !important;
          }

          .low-stock-row td {
            background: #fee2e2 !important;
          }

          .inventory-mobile-card {
            border-radius: 18px;
            border: 1px solid rgba(255,255,255,.12);
            color: #fff;
            box-shadow: 0 14px 34px rgba(0,0,0,.25);
            transition: all .25s ease;
            overflow: hidden;
          }

          .inventory-mobile-card:hover {
            transform: translateY(-5px);
          }

          .normal-card {
            background: linear-gradient(135deg, #1e293b, #0f172a);
          }

          .danger-card {
            background: linear-gradient(135deg, #7f1d1d, #450a0a);
          }

          .icon-action {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            border-radius: 10px !important;
          }

          .pagination-box {
            color: #0f172a;
            font-weight: 600;
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

      <div className="container mt-4">
        <button className="back-btn" onClick={() => navigate("/dashboard")}>
          <FiArrowLeft />
        </button>

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
          <div>
            <h3 className="page-title">
              <FiPackage />
              Inventory Management
            </h3>
            <div className="page-subtitle">
              Add items, adjust stock, monitor low inventory, and manage material records.
            </div>
          </div>

          <button className="primary-action" onClick={() => setShowModal(true)}>
            <FiPlus />
            Add Item
          </button>
        </div>

        <div className="glass-panel p-3 mb-4">
          <div style={{ position: "relative", maxWidth: 420 }}>
            <FiSearch
              style={{
                position: "absolute",
                top: 15,
                left: 14,
                color: "#64748b",
              }}
            />

            <Form.Control
              placeholder="Search inventory..."
              className="search-input"
              style={{ paddingLeft: 42 }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center loading-box">
            <Spinner animation="border" variant="light" />
            <div className="mt-3" style={{ opacity: 0.75 }}>
              Loading inventory...
            </div>
          </div>
        ) : (
          <Card className="inventory-table-card">
            <Card.Body>
              <div className="d-none d-md-block">
                <Table bordered hover responsive className="align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Unit</th>
                      <th>Min</th>
                      <th>Deduct ratio</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedItems.map((item) => {
                      const isLow = item.stock_qty <= item.min_threshold;

                      return (
                        <tr key={item.id} className={isLow ? "low-stock-row" : ""}>
                          <td>
                            <div className="fw-bold d-flex align-items-center gap-2">
                              {isLow && <FiAlertTriangle color="#dc2626" />}
                              {item.name}
                            </div>
                          </td>
                          <td>{item.category}</td>
                          <td>
                            <Badge bg={isLow ? "danger" : "success"}>
                              {item.stock_qty}
                            </Badge>
                          </td>
                          <td>{item.unit}</td>
                          <td>{item.min_threshold}</td>
                          <td>
                            <Badge bg="secondary">{item.deduct_ratio ?? 1}</Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                className="icon-action"
                                onClick={() => openAdjustModal(item)}
                              >
                                <FiRefreshCw />
                                Adjust
                              </Button>

                              <Button
                                size="sm"
                                variant="warning"
                                className="icon-action"
                                onClick={() => handleEdit(item)}
                              >
                                <FiEdit2 />
                                Edit
                              </Button>

                              <Button
                                size="sm"
                                variant="danger"
                                className="icon-action"
                                onClick={() => deleteItem(item.id)}
                              >
                                <FiTrash2 />
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              <div className="d-md-none">
                {paginatedItems.map((item) => {
                  const isLow = item.stock_qty <= item.min_threshold;

                  return (
                    <Card
                      key={item.id}
                      className={`mb-3 border-0 inventory-mobile-card ${
                        isLow ? "danger-card" : "normal-card"
                      }`}
                    >
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h6 className="mb-1 fw-bold">
                              {isLow && <FiAlertTriangle className="me-1" />}
                              {item.name}
                            </h6>
                            <div style={{ opacity: 0.75 }}>{item.category}</div>
                          </div>

                          <Badge bg={isLow ? "danger" : "success"}>
                            Stock: {item.stock_qty} {item.unit}
                          </Badge>
                        </div>

                        <div className="mb-3" style={{ fontSize: 13 }}>
                          Min: <strong>{item.min_threshold}</strong>
                          <span className="mx-2">·</span>
                          Deduct ratio: <strong>{item.deduct_ratio ?? 1}</strong>
                        </div>

                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            className="w-100"
                            variant="primary"
                            onClick={() => openAdjustModal(item)}
                          >
                            Adjust
                          </Button>

                          <Button
                            size="sm"
                            className="w-100"
                            variant="warning"
                            onClick={() => handleEdit(item)}
                          >
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            className="w-100"
                            variant="danger"
                            onClick={() => deleteItem(item.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  );
                })}
              </div>

              <div className="d-flex justify-content-between align-items-center mt-3 pagination-box">
                <div>
                  Page {page} of {totalPages || 1}
                </div>

                <div>
                  <Button
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="me-2"
                  >
                    Prev
                  </Button>

                  <Button
                    size="sm"
                    disabled={page === totalPages || totalPages === 0}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}

        <Modal show={showModal} onHide={closeModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              {editMode ? "Edit Inventory Item" : "Add Inventory Item"}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Form>
              <Form.Group className="mb-2">
                <Form.Label>Name</Form.Label>
                <Form.Control name="name" value={form.name} onChange={handleChange} />
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label>Category (Crew)</Form.Label>
                <Form.Select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  <option value="">Select</option>
                  {crews.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label>Stock</Form.Label>
                <Form.Control
                  type="number"
                  name="stock"
                  value={form.stock}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label>Min Threshold</Form.Label>
                <Form.Control
                  type="number"
                  name="min_threshold"
                  value={form.min_threshold}
                  onChange={handleChange}
                />
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label>Deduct ratio</Form.Label>
                <Form.Control
                  type="number"
                  name="deduct_ratio"
                  min={0.01}
                  step={0.01}
                  value={form.deduct_ratio}
                  onChange={handleChange}
                />
                <Form.Text className="text-muted">
                  Stock removed = quantity on job × ratio. Default{" "}
                  <strong>1</strong> (enter 1 → deduct 1). Use{" "}
                  <strong>0.5</strong> to deduct half a unit per 1 entered.
                </Form.Text>
              </Form.Group>

              <Form.Group>
                <Form.Label>Unit</Form.Label>
                <Form.Control name="unit" value={form.unit} onChange={handleChange} />
              </Form.Group>
            </Form>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </Modal.Footer>
        </Modal>

        <Modal show={showAdjust} onHide={() => setShowAdjust(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Adjust Stock</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <p>
              <strong>{selectedItem?.name}</strong>
              <br />
              Current Stock: <strong>{selectedItem?.stock_qty}</strong>
            </p>

            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Action</Form.Label>
                <Form.Select
                  name="type"
                  value={adjustForm.type}
                  onChange={handleAdjustChange}
                >
                  <option value="add">Add Stock</option>
                  <option value="remove">Remove Stock</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Quantity</Form.Label>
                <Form.Control
                  type="number"
                  name="qty"
                  min={1}
                  value={adjustForm.qty}
                  onChange={handleAdjustChange}
                  placeholder="Enter quantity"
                />
              </Form.Group>
            </Form>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAdjust(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAdjustSave}>
              Save Changes
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}
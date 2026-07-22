/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import { supabase } from "../supabase";
import Container from "react-bootstrap/Container";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Badge from "react-bootstrap/Badge";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiSearch,
  FiTruck,
  FiEdit2,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";

function CrewFormModal({ show, onHide, onSaved, initial }) {
  const isEdit = !!initial?.id;
  const [name, setName] = React.useState(initial?.name || "");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setName(initial?.name || "");
  }, [initial, show]);

  async function handleSave() {
    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    setLoading(true);

    try {
      if (isEdit) {
        const { error } = await supabase
          .from("crews")
          .update({ name })
          .eq("id", initial.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("crews").insert([{ name }]);

        if (error) throw error;
      }

      onSaved();
      onHide();
    } catch (err) {
      alert(err.message || err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEdit ? "Edit Crew" : "Create Crew"}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label>Crew Name</Form.Label>
            <Form.Control
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Crew name"
            />
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>

        <Button variant="dark" onClick={handleSave} disabled={loading}>
          {isEdit ? "Save Changes" : "Create Crew"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function DeleteCrewModal({ show, onHide, crew, onDeleted }) {
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    if (!crew) return;

    setLoading(true);

    try {
      await supabase.from("crews").delete().eq("id", crew.id);
      onDeleted();
      onHide();
    } catch (err) {
      alert(err.message || err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete Crew</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        Are you sure you want to delete <strong>{crew?.name}</strong>?
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>

        <Button variant="danger" onClick={handleDelete} disabled={loading}>
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function Crews() {
  const [crews, setCrews] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [showForm, setShowForm] = React.useState(false);
  const [formInitial, setFormInitial] = React.useState(null);
  const [showDelete, setShowDelete] = React.useState(false);
  const [deleteCrew, setDeleteCrew] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const navigate = useNavigate();

  const loadCrews = React.useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("crews")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      setCrews(data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load crews");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadCrews();
  }, [loadCrews]);

  const filtered = crews.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setFormInitial(null);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setFormInitial({ id: c.id, name: c.name });
    setShowForm(true);
  };

  const openDelete = (c) => {
    setDeleteCrew(c);
    setShowDelete(true);
  };

  return (
    <div className="page-shell">
      <style>
        {`
          .page-shell {
            min-height: 100vh;
            background:
              radial-gradient(circle at top left, rgba(59,130,246,.26), transparent 34%),
              radial-gradient(circle at bottom right, rgba(16,185,129,.18), transparent 30%),
              linear-gradient(135deg, #020617, #0f172a 48%, #1e293b);
            padding: 22px 0;
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
          }

          .page-subtitle {
            color: rgba(255,255,255,.65);
            font-size: 14px;
            margin-top: 5px;
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

          .filter-input {
            border-radius: 14px !important;
            border: 1px solid rgba(255,255,255,.12) !important;
            background: rgba(255,255,255,.95) !important;
            min-height: 45px;
          }

          .styled-table {
            overflow: hidden;
            border-radius: 18px;
          }

          .styled-table table {
            margin-bottom: 0;
          }

          .styled-table thead th {
            background: #0f172a !important;
            color: #fff !important;
            border-color: rgba(255,255,255,.08) !important;
            padding: 14px !important;
          }

          .styled-table tbody td {
            vertical-align: middle;
            padding: 14px !important;
          }

          .crew-card {
            border-radius: 18px;
            background: rgba(255,255,255,.95);
            color: #0f172a;
            padding: 16px;
            margin-bottom: 14px;
            box-shadow: 0 12px 28px rgba(0,0,0,.18);
            transition: all .25s ease;
          }

          .crew-card:hover {
            transform: translateY(-4px);
          }

          .icon-action {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: 10px !important;
          }
        `}
      </style>

      <Container className="py-4">
        <button className="back-btn" onClick={() => navigate("/dashboard")}>
          <FiArrowLeft />
        </button>

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
          <div>
            <h2 className="page-title">
              <FiTruck style={{ marginRight: 10 }} />
              Crews
            </h2>
            <div className="page-subtitle">Create, edit, and manage crew teams.</div>
          </div>

          <button className="primary-action" onClick={openCreate}>
            <FiPlus />
            Create Crew
          </button>
        </div>

        <div className="glass-panel p-3 mb-4">
          <div style={{ position: "relative", maxWidth: 360 }}>
            <FiSearch
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                color: "#64748b",
              }}
            />

            <Form.Control
              className="filter-input"
              style={{ paddingLeft: 42 }}
              placeholder="Search crews..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="d-none d-md-block styled-table">
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Crew Name</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={2}>Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={2}>No crews found</td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Badge bg="primary" className="me-2">
                        <FiUsers />
                      </Badge>
                      {c.name}
                    </td>

                    <td>
                      <div className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          className="icon-action"
                          onClick={() => openEdit(c)}
                        >
                          <FiEdit2 />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          className="icon-action"
                          onClick={() => openDelete(c)}
                        >
                          <FiTrash2 />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        <div className="d-block d-md-none">
          {loading ? (
            <div>Loading…</div>
          ) : filtered.length === 0 ? (
            <div>No crews found</div>
          ) : (
            filtered.map((c) => (
              <div key={c.id} className="crew-card">
                <h5 className="fw-bold mb-3">
                  <FiUsers /> {c.name}
                </h5>

                <div className="d-flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => openEdit(c)}>
                    <FiEdit2 /> Edit
                  </Button>

                  <Button size="sm" variant="danger" onClick={() => openDelete(c)}>
                    <FiTrash2 /> Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <CrewFormModal
          show={showForm}
          onHide={() => setShowForm(false)}
          initial={formInitial}
          onSaved={loadCrews}
        />

        <DeleteCrewModal
          show={showDelete}
          onHide={() => setShowDelete(false)}
          crew={deleteCrew}
          onDeleted={loadCrews}
        />
      </Container>
    </div>
  );
}
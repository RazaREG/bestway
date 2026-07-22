/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import { supabase } from "../supabase";
import Container from "react-bootstrap/Container";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Badge from "react-bootstrap/Badge";
import Dropdown from "react-bootstrap/Dropdown";
import Alert from "react-bootstrap/Alert";
import bcrypt from "bcryptjs";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiPlus,
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiUsers,
  FiShield,
  FiPackage,
  FiKey,
  FiEye,
  FiEyeOff,
  FiChevronDown,
} from "react-icons/fi";
import {
  normalizeUserRoles,
  rolesToDbFields,
  getRoleDisplayLabel,
} from "../roles";
import RoleMultiSelect from "../components/RoleMultiSelect";

function RoleBadge({ role }) {
  const map = {
    admin: "danger",
    "sub-admin": "warning",
    crew_a: "primary",
    crew_b: "info",
    crew_c: "secondary",
    crew_d: "secondary",
    crew_e: "secondary",
  };

  const variant = map[role] || "secondary";

  return (
    <Badge bg={variant} style={{ textTransform: "uppercase", fontSize: 11 }}>
      {role || "N/A"}
    </Badge>
  );
}

function UserFormModal({ show, onHide, onSaved, initial, crewRoles }) {
  const isEdit = !!initial?.id;
  const [email, setEmail] = React.useState(initial?.email || "");
  const [password, setPassword] = React.useState("");
  const [selectedRoles, setSelectedRoles] = React.useState([]);
  const [rolesError, setRolesError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const roleOptions = React.useMemo(
    () => [
      { key: "admin", label: "Admin", role: "admin", roleId: null, group: "Access" },
      {
        key: "sub-admin",
        label: "Sub Admin",
        role: "sub-admin",
        roleId: null,
        group: "Access",
      },
      ...crewRoles.map((c) => ({
        key: `crew-${c.id}`,
        label: c.name,
        role: c.roleString,
        roleId: c.id,
        group: "Crews",
      })),
    ],
    [crewRoles]
  );

  React.useEffect(() => {
    setEmail(initial?.email || "");
    setPassword("");
    setRolesError("");
    if (initial) {
      setSelectedRoles(normalizeUserRoles(initial));
    } else {
      setSelectedRoles([]);
    }
  }, [initial, show, crewRoles]);

  function handleRolesChange(roles) {
    setSelectedRoles(roles);
    if (roles.length > 0) setRolesError("");
  }

  async function handleSave() {
    if (!email || (!isEdit && !password)) {
      alert("Email and password are required");
      return;
    }

    if (selectedRoles.length === 0) {
      setRolesError("Select at least one role");
      return;
    }

    setLoading(true);

    try {
      const dbFields = rolesToDbFields(selectedRoles);

      if (isEdit) {
        const { error } = await supabase
          .from("app_users")
          .update({ email, ...dbFields })
          .eq("id", initial.id)
          .select();

        if (error) throw error;
      } else {
        const hashed = await bcrypt.hash(password, 10);

        const { error } = await supabase
          .from("app_users")
          .insert([{ email, password: hashed, ...dbFields }]);

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
        <Modal.Title>{isEdit ? "Edit User" : "Create User"}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control value={email} onChange={(e) => setEmail(e.target.value)} />
          </Form.Group>

          {!isEdit && (
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Roles</Form.Label>
            <RoleMultiSelect
              options={roleOptions}
              value={selectedRoles}
              onChange={handleRolesChange}
              error={rolesError}
              placeholder="Choose one or more roles…"
            />
            <Form.Text className="text-muted">
              Click the field to open the list. Remove a role with the × on each tag.
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>

        <Button variant="dark" onClick={handleSave} disabled={loading}>
          {isEdit ? "Save Changes" : "Create User"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, error, id }) {
  return (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label>{label}</Form.Label>
      <div style={{ position: "relative" }}>
        <Form.Control
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          isInvalid={!!error}
          placeholder="••••••••"
          autoComplete="new-password"
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "transparent",
            color: "#64748b",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
        >
          {show ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
        <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
      </div>
    </Form.Group>
  );
}

function ChangePasswordModal({ show, onHide, user, onUpdated }) {
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    if (!show) return;
    setPassword("");
    setConfirmPassword("");
    setErrors({});
    setSuccess(false);
    setShowPassword(false);
    setShowConfirm(false);
  }, [show, user?.id]);

  function validate() {
    const next = {};
    if (!password) next.password = "New password is required";
    else if (password.length < 8) next.password = "Use at least 8 characters";

    if (!confirmPassword) next.confirmPassword = "Please confirm the password";
    else if (password !== confirmPassword) next.confirmPassword = "Passwords do not match";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user?.id || !validate()) return;

    setLoading(true);
    setSuccess(false);

    try {
      const hashed = await bcrypt.hash(password, 10);
      const { error } = await supabase
        .from("app_users")
        .update({ password: hashed })
        .eq("id", user.id);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        onUpdated?.();
        onHide();
      }, 1200);
    } catch (err) {
      setErrors({ form: err.message || "Failed to update password" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered backdrop={loading ? "static" : true}>
      <Modal.Header closeButton={!loading}>
        <Modal.Title className="d-flex align-items-center gap-2">
          <FiKey />
          Change Password
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {user && (
            <p className="text-muted small mb-3">
              Set a new password for <strong>{user.email}</strong>. The user will sign in with
              this password next time.
            </p>
          )}

          {errors.form && (
            <Alert variant="danger" className="py-2 small">
              {errors.form}
            </Alert>
          )}

          {success && (
            <Alert variant="success" className="py-2 small">
              Password updated successfully.
            </Alert>
          )}

          <PasswordField
            id="new-password"
            label="New password"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            error={errors.password}
          />

          <PasswordField
            id="confirm-password"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            error={errors.confirmPassword}
          />

          <Form.Text className="text-muted">
            Minimum 8 characters. Use a mix of letters and numbers for better security.
          </Form.Text>
        </Modal.Body>

        <Modal.Footer className="d-flex justify-content-between">
          <Button variant="outline-secondary" onClick={onHide} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || success}>
            {loading ? "Updating…" : "Update password"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function DeleteUserModal({ show, onHide, user, onDeleted }) {
  const [loading, setLoading] = React.useState(false);

  async function handleDelete() {
    if (!user) return;

    setLoading(true);

    try {
      await supabase.from("app_users").delete().eq("id", user.id);
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
        <Modal.Title>Delete User</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        Are you sure you want to permanently delete <strong>{user?.email}</strong>?
        This cannot be undone.
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

export default function Users() {
  const [users, setUsers] = React.useState([]);
  const [crewRoles, setCrewRoles] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [filterRole, setFilterRole] = React.useState("all");
  const [showForm, setShowForm] = React.useState(false);
  const [formInitial, setFormInitial] = React.useState(null);
  const [showDelete, setShowDelete] = React.useState(false);
  const [deleteUser, setDeleteUser] = React.useState(null);
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [passwordUser, setPasswordUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  const navigate = useNavigate();

  const loadUsers = React.useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .order("email", { ascending: true });

      if (error) throw error;

      setUsers(data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCrewRoles = React.useCallback(async () => {
    try {
      const { data, error } = await supabase.from("crews").select("*");

      if (error) throw error;

      const mapped = data.map((c, idx) => ({
        id: c.id,
        name: c.name,
        roleString: `crew_${String.fromCharCode(97 + idx)}`,
      }));

      setCrewRoles(mapped);
    } catch (err) {
      console.error(err);
    }
  }, []);

  async function toggleInventoryAccess(user) {
    try {
      const { error } = await supabase
        .from("app_users")
        .update({ inventory_access: !user.inventory_access })
        .eq("id", user.id);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, inventory_access: !u.inventory_access } : u
        )
      );
    } catch (err) {
      alert(err.message);
    }
  }

  React.useEffect(() => {
    loadCrewRoles();
    loadUsers();
  }, [loadUsers, loadCrewRoles]);

  const filtered = users.filter((u) => {
    const userRoles = normalizeUserRoles(u).map((r) => r.role);

    return (
      (filterRole === "all" || userRoles.includes(filterRole)) &&
      u.email.toLowerCase().includes(search.toLowerCase())
    );
  });

  const openCreate = () => {
    setFormInitial(null);
    setShowForm(true);
  };

  const openEdit = (u) => {
    setFormInitial(u);
    setShowForm(true);
  };

  const openDelete = (u) => {
    setDeleteUser(u);
    setShowDelete(true);
  };

  const openChangePassword = (u) => {
    setPasswordUser(u);
    setShowChangePassword(true);
  };

  function UserActionsDropdown({ user: u }) {
    return (
      <Dropdown align="end" className="user-actions-dropdown">
        <Dropdown.Toggle
          variant="outline-primary"
          size="sm"
          className="icon-action user-actions-toggle"
          id={`user-actions-${u.id}`}
        >
          <FiEdit2 />
          <span className="d-none d-lg-inline">Edit</span>
          <FiChevronDown size={14} />
        </Dropdown.Toggle>

        <Dropdown.Menu className="user-actions-menu shadow">
          <Dropdown.Item onClick={() => openEdit(u)}>
            <FiEdit2 className="me-2" />
            Edit user
          </Dropdown.Item>
          <Dropdown.Item onClick={() => openChangePassword(u)}>
            <FiKey className="me-2" />
            Change password
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item className="text-danger" onClick={() => openDelete(u)}>
            <FiTrash2 className="me-2" />
            Delete user
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  const getDisplayRoles = (u) =>
    normalizeUserRoles(u).map((entry) => getRoleDisplayLabel(entry, crewRoles));

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

          .glass-panel {
            border-radius: 22px;
            border: 1px solid rgba(255,255,255,.12);
            background: rgba(255,255,255,.08);
            backdrop-filter: blur(16px);
            box-shadow: 0 18px 45px rgba(0,0,0,.28);
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

          .filter-input,
          .filter-select {
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

          .mobile-user-card {
            border-radius: 18px;
            background: rgba(255,255,255,.95);
            color: #0f172a;
            padding: 16px;
            margin-bottom: 14px;
            box-shadow: 0 12px 28px rgba(0,0,0,.18);
            transition: all .25s ease;
          }

          .mobile-user-card:hover {
            transform: translateY(-4px);
          }

          .icon-action {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: 10px !important;
          }

          .user-actions-toggle {
            display: inline-flex !important;
            align-items: center;
            gap: 6px;
          }

          .user-actions-menu {
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            padding: 6px;
            min-width: 200px;
          }

          .user-actions-menu .dropdown-item {
            border-radius: 8px;
            padding: 10px 12px;
            font-weight: 500;
            display: flex;
            align-items: center;
          }

          .user-actions-menu .dropdown-item:active {
            background: #eff6ff;
            color: #1d4ed8;
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
              <FiUsers style={{ marginRight: 10 }} />
              Users
            </h2>
            <div className="page-subtitle">Manage accounts, roles, and inventory access.</div>
          </div>

          <button className="primary-action" onClick={openCreate}>
            <FiPlus />
            Create User
          </button>
        </div>

        <div className="glass-panel p-3 mb-4">
          <div className="d-flex flex-column flex-md-row gap-2">
            <div style={{ position: "relative", maxWidth: 340, width: "100%" }}>
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
                placeholder="Search by email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Form.Select
              className="filter-select"
              style={{ maxWidth: 220 }}
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="sub-admin">Sub Admin</option>
              {crewRoles.map((c) => (
                <option key={c.id} value={c.roleString}>
                  {c.name}
                </option>
              ))}
            </Form.Select>
          </div>
        </div>

        <div className="d-none d-md-block styled-table">
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Email</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Inventory Access</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>Loading…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>No users found</td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-1">
                        {getDisplayRoles(u).map((label) => (
                          <RoleBadge key={`${u.id}-${label}`} role={label} />
                        ))}
                      </div>
                    </td>
                    <td>
                      <Badge bg={u.banned_until ? "danger" : "success"}>
                        {u.banned_until ? "Disabled" : "Active"}
                      </Badge>
                    </td>
                    <td>
                      <Form.Check
                        type="switch"
                        id={`inv-${u.id}`}
                        checked={!!u.inventory_access}
                        onChange={() => toggleInventoryAccess(u)}
                        label={u.inventory_access ? "Active" : "Inactive"}
                      />
                    </td>
                    <td>
                      <UserActionsDropdown user={u} />
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
            <div>No users found</div>
          ) : (
            filtered.map((u) => (
              <div key={u.id} className="mobile-user-card">
                <h5 className="fw-bold mb-2">{u.email}</h5>

                <p className="mb-2">
                  <FiShield /> <strong> Roles:</strong>{" "}
                  {getDisplayRoles(u).map((label) => (
                    <RoleBadge key={`${u.id}-m-${label}`} role={label} />
                  ))}
                </p>

                <p className="mb-2">
                  <strong>Status:</strong>{" "}
                  <Badge bg={u.banned_until ? "danger" : "success"}>
                    {u.banned_until ? "Disabled" : "Active"}
                  </Badge>
                </p>

                <p className="mb-3">
                  <FiPackage /> <strong> Inventory Access:</strong>{" "}
                  <Form.Check
                    type="switch"
                    id={`inv-mobile-${u.id}`}
                    checked={!!u.inventory_access}
                    onChange={() => toggleInventoryAccess(u)}
                    label={u.inventory_access ? "Active" : "Inactive"}
                  />
                </p>

                <div className="d-flex gap-2 flex-wrap align-items-center">
                  <UserActionsDropdown user={u} />
                </div>
              </div>
            ))
          )}
        </div>

        <UserFormModal
          show={showForm}
          onHide={() => setShowForm(false)}
          initial={formInitial}
          crewRoles={crewRoles}
          onSaved={() => loadUsers()}
        />

        <DeleteUserModal
          show={showDelete}
          onHide={() => setShowDelete(false)}
          user={deleteUser}
          onDeleted={() => loadUsers()}
        />

        <ChangePasswordModal
          show={showChangePassword}
          onHide={() => setShowChangePassword(false)}
          user={passwordUser}
          onUpdated={() => loadUsers()}
        />
      </Container>
    </div>
  );
}
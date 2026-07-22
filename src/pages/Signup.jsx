import { useState } from "react";
import { supabase } from "../supabaseClient";
import bcrypt from "bcryptjs";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("crew_a"); // default role
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const signUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password || !fullName) {
      setError("All fields are required");
      return;
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("app_users")
      .insert([
        {
          email,
          full_name: fullName,
          role,
          password: hashed
        }
      ])
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("Account created successfully. You can now log in.");
    setEmail("");
    setPassword("");
    setFullName("");
  };

  return (
    <div style={{ 
      display: "grid", 
      placeItems: "center", 
      minHeight: "80vh",
      background: "#f7f7f7"
    }}>
      <form
        onSubmit={signUp}
        style={{
          width: 380,
          padding: "28px 24px",
          borderRadius: 14,
          background: "#fff",
          border: "1px solid #e5e5e5",
          boxShadow: "0 4px 14px rgba(0,0,0,0.06)"
        }}
      >
        <h2 
          style={{ 
            marginBottom: 18, 
            fontSize: 22, 
            fontWeight: 600,
            textAlign: "center",
            color: "#222"
          }}
        >
          Create an Account
        </h2>

        {error && (
          <div 
            style={{
              background: "#ffe6e6",
              border: "1px solid #ffb3b3",
              color: "#cc0000",
              padding: "8px 12px",
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div 
            style={{
              background: "#e6ffea",
              border: "1px solid #b6ffc8",
              color: "#008f2d",
              padding: "8px 12px",
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 14
            }}
          >
            {success}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e)=>setFullName(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #d0d0d0",
              fontSize: 15,
              outline: "none",
              transition: "0.2s"
            }}
            onFocus={(e)=>e.target.style.borderColor="#000"}
            onBlur={(e)=>e.target.style.borderColor="#d0d0d0"}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #d0d0d0",
              fontSize: 15,
              outline: "none",
              transition: "0.2s"
            }}
            onFocus={(e)=>e.target.style.borderColor="#000"}
            onBlur={(e)=>e.target.style.borderColor="#d0d0d0"}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <select
            value={role}
            onChange={(e)=>setRole(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #d0d0d0",
              fontSize: 15,
              outline: "none",
              background: "#fff",
              transition: "0.2s"
            }}
            onFocus={(e)=>e.target.style.borderColor="#000"}
            onBlur={(e)=>e.target.style.borderColor="#d0d0d0"}
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="crew_a">Crew A</option>
            <option value="crew_b">Crew B</option>
            <option value="crew_c">Crew C</option>
            <option value="crew_d">Crew D</option>
            <option value="crew_e">Crew E</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #d0d0d0",
              fontSize: 15,
              outline: "none",
              transition: "0.2s"
            }}
            onFocus={(e)=>e.target.style.borderColor="#000"}
            onBlur={(e)=>e.target.style.borderColor="#d0d0d0"}
          />
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            background: "#000",
            color: "#fff",
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 600,
            letterSpacing: 0.3,
            cursor: "pointer"
          }}
        >
          Sign Up
        </button>

        <p style={{
          marginTop: 16,
          textAlign: "center",
          fontSize: 14,
          color: "#666"
        }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "#000", fontWeight: 600 }}>
            Login
          </a>
        </p>
      </form>
    </div>
  );
}

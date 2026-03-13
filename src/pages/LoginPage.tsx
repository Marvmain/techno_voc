import { useState } from "react"
import { supabase } from "../supabaseClient"

type Tab = "student" | "admin"

interface Props {
  onLogin: (session: any) => void  // ✅ single onLogin for both student and admin
}

export default function LoginPage({ onLogin }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("student")

  // Student fields
  const [fullName, setFullName] = useState("")
  const [studentLRN, setStudentLRN] = useState("")
  const [schoolYear, setSchoolYear] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")

  // Admin fields
  const [adminName, setAdminName] = useState("")
  const [password, setPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // ── STUDENT LOGIN ──────────────────────────────────
  const handleStudentLogin = async () => {
    setError("")

    if (!fullName || !studentLRN || !schoolYear || !phoneNumber) {
      setError("Please fill in all fields.")
      return
    }

    if (!/^\d{10,11}$/.test(phoneNumber)) {
      setError("Enter a valid 10-11 digit phone number.")
      return
    }

    setLoading(true)

    // Check if LRN already exists
    const { data: existing } = await supabase
      .from("students")
      .select("*")
      .eq("lrn", studentLRN)
      .single()

    if (existing) {
      setLoading(false)
      // ✅ No navigate - just call onLogin
      onLogin({ role: "student", id: existing.id, name: existing.full_name })
      return
    }

    // New student — INSERT into Supabase
    const { data: newStudent, error: insertError } = await supabase
      .from("students")
      .insert([{
        full_name: fullName,
        lrn: studentLRN,
        school_year: schoolYear,
        phone_number: phoneNumber,
      }])
      .select()
      .single()

    setLoading(false)

    if (insertError || !newStudent) {
      setError("Failed to save: " + insertError?.message)
      return
    }

    // ✅ No navigate - just call onLogin
    onLogin({ role: "student", id: newStudent.id, name: newStudent.full_name })
  }

  // ── ADMIN LOGIN ────────────────────────────────────
  const handleAdminLogin = async () => {
    setError("")

    if (!adminName || !password) {
      setError("Please enter your name and password.")
      return
    }

    setLoading(true)

    const { data, error: err } = await supabase
      .from("admins")
      .select("*")
      .eq("admin_name", adminName)
      .eq("password", password)
      .single()

    setLoading(false)

    if (err || !data) {
      setError("Invalid admin name or password.")
      return
    }

    // ✅ No navigate - just call onLogin
    onLogin({ role: "admin", name: data.admin_name })
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>

        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "50%",
            backgroundColor: "#2563eb", display: "flex",
            alignItems: "center", justifyContent: "center"
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 style={{ textAlign: "center", fontWeight: "800", fontSize: "24px", margin: "0 0 4px" }}>
          TECHNO-VOC
        </h1>
        <p style={{ textAlign: "center", color: "#6b7280", margin: "0 0 4px", fontSize: "14px" }}>
          Assessment for TVE Strands
        </p>
        <p style={{ textAlign: "center", color: "#6b7280", margin: "0 0 24px", fontSize: "14px" }}>
          Nothern Antique Vocational School - NAVS
        </p>

        {/* Tab Toggle */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "8px", marginBottom: "24px",
          border: "1px solid #e5e7eb", borderRadius: "12px", padding: "4px"
        }}>
          <button
            onClick={() => { setActiveTab("student"); setError("") }}
            style={{
              padding: "10px", borderRadius: "8px", border: "none",
              cursor: "pointer", fontWeight: "600", fontSize: "15px",
              backgroundColor: activeTab === "student" ? "#111827" : "transparent",
              color: activeTab === "student" ? "white" : "#6b7280",
            }}
          >
            🎓 Student
          </button>
          <button
            onClick={() => { setActiveTab("admin"); setError("") }}
            style={{
              padding: "10px", borderRadius: "8px", border: "none",
              cursor: "pointer", fontWeight: "600", fontSize: "15px",
              backgroundColor: activeTab === "admin" ? "#111827" : "transparent",
              color: activeTab === "admin" ? "white" : "#6b7280",
            }}
          >
            🛡 Admin
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: "#fef2f2", color: "#dc2626",
            padding: "10px 14px", borderRadius: "8px",
            marginBottom: "16px", fontSize: "13px"
          }}>
            {error}
          </div>
        )}

        {/* ── STUDENT FORM ── */}
        {activeTab === "student" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontWeight: "600", fontSize: "14px" }}>Full Name</label>
              <input
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontWeight: "600", fontSize: "14px" }}>Student LRN</label>
              <input
                placeholder="Enter your student LRN"
                value={studentLRN}
                onChange={(e) => setStudentLRN(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontWeight: "600", fontSize: "14px" }}>School Year</label>
              <select
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select your school year</option>
                <option value="2023-2024">2023-2024</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>
            <div>
              <label style={{ fontWeight: "600", fontSize: "14px" }}>Phone Number</label>
              <input
                placeholder="e.g., 09171234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                style={inputStyle}
              />
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                Enter 10-11 digit mobile number
              </p>
            </div>
            <button
              onClick={handleStudentLogin}
              disabled={loading}
              style={buttonStyle}
            >
              {loading ? "Logging in..." : "Login as Student"}
            </button>
          </div>
        )}

        {/* ── ADMIN FORM ── */}
        {activeTab === "admin" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ fontWeight: "600", fontSize: "14px" }}>Admin Name</label>
              <input
                placeholder="Enter your name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontWeight: "600", fontSize: "14px" }}>Password</label>
              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>
            <button
              onClick={handleAdminLogin}
              disabled={loading}
              style={buttonStyle}
            >
              {loading ? "Logging in..." : "Login as Admin"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "100vh",
  backgroundColor: "#e8eef7",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 16px",
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  borderRadius: "20px",
  padding: "40px",
  width: "100%",
  maxWidth: "420px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #e5e7eb",
  backgroundColor: "#f9fafb",
  fontSize: "14px",
  marginTop: "6px",
  outline: "none",
  boxSizing: "border-box",
}

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  backgroundColor: "#111827",
  color: "white",
  border: "none",
  borderRadius: "12px",
  fontSize: "16px",
  fontWeight: "700",
  cursor: "pointer",
  marginTop: "8px",
}
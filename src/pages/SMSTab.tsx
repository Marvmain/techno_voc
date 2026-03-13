import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

interface Student {
  id: string
  full_name: string
  lrn: string
  phone_number: string
  school_year: string
  created_at: string
}



export default function SMSTab() {
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [schoolYearFilter, setSchoolYearFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sentLog, setSentLog] = useState<string[]>([])
  const [apiKey, setApiKey] = useState("")
  const [senderName, setSenderName] = useState("TECHNOVOC")
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => { fetchStudents() }, [])

  const fetchStudents = async () => {
    setLoading(true)
    const { data } = await supabase
      .from("students")
      .select("*")
      .order("full_name")
    setStudents(data || [])
    setLoading(false)
  }

  // Build personalized SMS message for a student
  const buildMessage = async (student: Student): Promise<string> => {
    const { data: rankings } = await supabase
      .from("rankings")
      .select("score, status, courses(course_name)")
      .eq("student_id", student.id)
      .order("score", { ascending: false })
      .limit(3)

    if (!rankings || rankings.length === 0) {
      return `Hi ${student.full_name}! You have not taken the TECHNO-VOC assessment yet. Please log in at your school to take the assessment. - University of Antique NAVS`
    }

    const top3 = rankings
      .map((r: any, i: number) => `${i + 1}. ${r.courses?.course_name} (${r.score} pts - ${r.status})`)
      .join(", ")

    return `Hi ${student.full_name}! Your TECHNO-VOC Results: Top 3 Courses: ${top3}. Visit school for enrollment details. - UA NAVS`
  }

  // Send SMS via Semaphore
  const sendSMS = async (phone: string, message: string): Promise<boolean> => {
    if (!apiKey) return false

    try {
      const response = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: apiKey,
          number: phone,
          message,
          sendername: senderName,
        }),
      })
      return response.ok
    } catch {
      return false
    }
  }

  // Send to selected students
  const handleSendSelected = async () => {
    if (selected.length === 0) { alert("Please select students first."); return }
    if (!apiKey) { alert("Please enter your Semaphore API key in Settings."); setShowSettings(true); return }
    if (!confirm(`Send SMS to ${selected.length} selected student(s)?`)) return

    setSending(true)
    const logs: string[] = []

    for (const studentId of selected) {
      const student = students.find(s => s.id === studentId)
      if (!student) continue

      const message = await buildMessage(student)
      const success = await sendSMS(student.phone_number, message)

      const logMsg = success
        ? `✅ Sent to ${student.full_name} (${student.phone_number})`
        : `❌ Failed: ${student.full_name} (${student.phone_number})`
      logs.push(logMsg)

      // Save to sms_logs table
      await supabase.from("sms_logs").insert([{
        student_id: student.id,
        phone_number: student.phone_number,
        message,
        status: success ? "sent" : "failed",
      }])
    }

    setSentLog(prev => [...logs, ...prev])
    setSending(false)
    setSelected([])
    alert(`Done! Sent ${logs.filter(l => l.startsWith("✅")).length} / ${logs.length} messages.`)
  }

  // Send to ALL students
  const handleSendAll = async () => {
    if (!apiKey) { alert("Please enter your Semaphore API key in Settings."); setShowSettings(true); return }
    if (!confirm(`Send SMS to ALL ${filteredStudents.length} students?`)) return

    setSending(true)
    const logs: string[] = []

    for (const student of filteredStudents) {
      const message = await buildMessage(student)
      const success = await sendSMS(student.phone_number, message)

      logs.push(success
        ? `✅ Sent to ${student.full_name} (${student.phone_number})`
        : `❌ Failed: ${student.full_name} (${student.phone_number})`
      )

      await supabase.from("sms_logs").insert([{
        student_id: student.id,
        phone_number: student.phone_number,
        message,
        status: success ? "sent" : "failed",
      }])
    }

    setSentLog(prev => [...logs, ...prev])
    setSending(false)
    alert(`Done! Sent ${logs.filter(l => l.startsWith("✅")).length} / ${logs.length} messages.`)
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    if (selected.length === filteredStudents.length) {
      setSelected([])
    } else {
      setSelected(filteredStudents.map(s => s.id))
    }
  }

  const schoolYears = [...new Set(students.map(s => s.school_year))].filter(Boolean)

  const filteredStudents = students.filter(s => {
    const matchSearch =
      s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lrn?.includes(searchQuery) ||
      s.phone_number?.includes(searchQuery)
    const matchYear = schoolYearFilter === "all" || s.school_year === schoolYearFilter
    return matchSearch && matchYear
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontWeight: "700", fontSize: "22px", margin: "0 0 4px" }}>SMS Notifications</h2>
          <p style={{ color: "#6b7280", margin: 0 }}>Send exam results to students via SMS</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{ padding: "10px 16px", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
          >
            ⚙ Settings
          </button>
          <button
            onClick={handleSendSelected}
            disabled={sending || selected.length === 0}
            style={{ padding: "10px 16px", backgroundColor: selected.length > 0 ? "white" : "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px", opacity: selected.length === 0 ? 0.5 : 1 }}
          >
            ✉ Send to Selected ({selected.length})
          </button>
          <button
            onClick={handleSendAll}
            disabled={sending || filteredStudents.length === 0}
            style={{ padding: "10px 16px", backgroundColor: "#111827", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
          >
            {sending ? "Sending..." : `✉ Send to All (${filteredStudents.length})`}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", border: "1px solid #e5e7eb", marginBottom: "16px" }}>
          <p style={{ fontWeight: "700", fontSize: "16px", margin: "0 0 16px" }}>⚙ Semaphore SMS Settings</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={labelStyle}>Semaphore API Key</label>
              <input
                placeholder="Enter your Semaphore API key"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                type="password"
                style={inputStyle}
              />
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                Get your API key from <a href="https://semaphore.co" target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>semaphore.co</a>
              </p>
            </div>
            <div>
              <label style={labelStyle}>Sender Name (max 11 chars)</label>
              <input
                placeholder="e.g., TECHNOVOC"
                value={senderName}
                onChange={e => setSenderName(e.target.value.slice(0, 11))}
                style={inputStyle}
              />
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                This appears as the sender on the student's phone
              </p>
            </div>
          </div>
          <div style={{ backgroundColor: "#f0fdf4", borderRadius: "8px", padding: "12px", marginTop: "12px" }}>
            <p style={{ color: "#16a34a", fontWeight: "600", margin: "0 0 4px", fontSize: "13px" }}>📱 SMS Message Preview</p>
            <p style={{ color: "#166534", fontSize: "12px", margin: 0, fontStyle: "italic" }}>
              "Hi [Student Name]! Your TECHNO-VOC Results: Top 3 Courses: 1. Automotive (8 pts - included), 2. ICT (7 pts - included), 3. Electronics (6 pts - waitlist). Visit school for enrollment details. - UA NAVS"
            </p>
          </div>
        </div>
      )}

      {/* SMS Note */}
      {!apiKey && (
        <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
          <p style={{ color: "#92400e", fontWeight: "600", margin: "0 0 4px" }}>⚠ SMS Integration Note</p>
          <p style={{ color: "#92400e", fontSize: "13px", margin: 0 }}>
            Click <strong>⚙ Settings</strong> and enter your Semaphore API key to enable real SMS sending.
            Get your free API key at <a href="https://semaphore.co" target="_blank" rel="noreferrer" style={{ color: "#92400e", fontWeight: "700" }}>semaphore.co</a>
          </p>
        </div>
      )}

      {/* Filters */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", border: "1px solid #e5e7eb", marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input
            placeholder="🔍 Search by name, LRN, or phone number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: "200px", marginTop: 0 }}
          />
          <select
            value={schoolYearFilter}
            onChange={e => setSchoolYearFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="all">All School Years</option>
            {schoolYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", border: "1px solid #e5e7eb", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <p style={{ fontWeight: "600", margin: "0 0 4px" }}>Student Records ({filteredStudents.length})</p>
            <p style={{ color: "#6b7280", fontSize: "13px", margin: 0 }}>Select students to send SMS notifications</p>
          </div>
          {filteredStudents.length > 0 && (
            <button
              onClick={toggleSelectAll}
              style={{ padding: "6px 14px", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}
            >
              {selected.length === filteredStudents.length ? "Deselect All" : "Select All"}
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0" }}>Loading students...</p>
        ) : filteredStudents.length === 0 ? (
          <p style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0" }}>No students found.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ padding: "10px 12px", width: "40px" }}></th>
                {["Full Name", "LRN", "Phone Number", "School Year", "Registered"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: "600" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, i) => (
                <tr
                  key={s.id}
                  onClick={() => toggleSelect(s.id)}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    backgroundColor: selected.includes(s.id) ? "#eff6ff" : i % 2 === 0 ? "white" : "#f9fafb",
                    cursor: "pointer",
                    transition: "background 0.15s"
                  }}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      onChange={() => toggleSelect(s.id)}
                      style={{ width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer" }}
                    />
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: "500" }}>{s.full_name}</td>
                  <td style={{ padding: "10px 12px", color: "#6b7280" }}>{s.lrn}</td>
                  <td style={{ padding: "10px 12px" }}>{s.phone_number}</td>
                  <td style={{ padding: "10px 12px" }}>{s.school_year}</td>
                  <td style={{ padding: "10px 12px", color: "#6b7280" }}>{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Send Log */}
      {sentLog.length > 0 && (
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", border: "1px solid #e5e7eb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <p style={{ fontWeight: "600", margin: 0 }}>📋 Send Log</p>
            <button onClick={() => setSentLog([])} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "13px" }}>Clear</button>
          </div>
          <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
            {sentLog.map((log, i) => (
              <p key={i} style={{
                margin: 0, fontSize: "13px", padding: "6px 10px", borderRadius: "6px",
                backgroundColor: log.startsWith("✅") ? "#f0fdf4" : "#fef2f2",
                color: log.startsWith("✅") ? "#166534" : "#dc2626"
              }}>
                {log}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px",
  border: "1px solid #e5e7eb", fontSize: "14px",
  boxSizing: "border-box", outline: "none", marginTop: "6px"
}
const selectStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb",
  fontSize: "14px", backgroundColor: "white", cursor: "pointer", outline: "none"
}
const labelStyle: React.CSSProperties = {
  fontWeight: "600", fontSize: "14px", color: "#374151"
}
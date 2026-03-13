import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import RankingsTab from "./RankingsTab"
import SMSTab from "./SMSTab"
import CoursesTab from "./CoursesTab"
import OverviewTab from "./OverviewTab"
import StudentDetailModal from "./StudentDetailModal"
import EditQuestionModal from "./EditQuestionModal"

interface Props { adminName: string; onLogout: () => void }
type Tab = "overview" | "students" | "courses" | "rankings" | "sms" | "questions"

interface Question {
  id: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  type: string
  courses?: { course_name: string }
  course_id: string
}

interface Course {
  id: string
  course_name: string
  capacity: number
}

// student record from the database
interface Student {
  id: string
  full_name: string
  lrn: string
  phone_number: string
  school_year: string
  created_at: string
}

// this is a useState line
export default function AdminDashboard({ adminName, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [students, setStudents] = useState<any[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [questionSearch, setQuestionSearch] = useState("")
  const [filterCourse, setFilterCourse] = useState("all")
  const [filterType, setFilterType] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  // ── Add Question Modal ──
  const [showModal, setShowModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState("")
  const [newQuestion, setNewQuestion] = useState({
    question_text: "",
    course_id: "",
    type: "pre-skilled",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "Option A",
  })

  useEffect(() => { fetchAllData() }, [])

    
  const fetchAllData = async () => {
    
    // Students
    const { data: sd } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false })
    setStudents(sd || [])


    
    // Courses
    const { data: cod } = await supabase
      .from("courses")
      .select("*")
      .order("course_name")
    setCourses(cod || [])
    if (cod && cod.length > 0) {
      setNewQuestion(prev => ({ ...prev, course_id: cod[0].id }))
    }

    // Questions
    const { data: qd } = await supabase
      .from("questions")
      .select("*, courses(course_name)")
      .order("id")
    setQuestions(qd || [])
  }

  const handleDeleteStudent = async (student: Student, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(
      `Delete "${student.full_name}"?\n\nThis will also delete:\n• All their assessment results\n• All their rankings\n• All their SMS logs\n\nThis cannot be undone!`
    )) return

    setDeletingId(student.id)
    await supabase.from("sms_logs").delete().eq("student_id", student.id)
    await supabase.from("rankings").delete().eq("student_id", student.id)
    await supabase.from("assessments").delete().eq("student_id", student.id)
    await supabase.from("students").delete().eq("id", student.id)
    setDeletingId(null)
    if (selectedStudent?.id === student.id) setSelectedStudent(null)
    fetchAllData()
  }

  const handleAddQuestion = async () => {
    setModalError("")
    const { question_text, course_id, type, option_a, option_b, option_c, option_d, correct_answer } = newQuestion

    if (!question_text || !option_a || !option_b || !option_c || !option_d) {
      setModalError("Please fill in all fields."); return
    }
    if (!course_id) { setModalError("Please select a course."); return }

    setModalLoading(true)
    const { error } = await supabase.from("questions").insert([{
      question_text, course_id, type, option_a, option_b, option_c, option_d, correct_answer
    }])
    setModalLoading(false)

    if (error) {
      setModalError("Error: " + error.message)
    } else {
      setShowModal(false)
      setNewQuestion({
        question_text: "", course_id: courses[0]?.id || "",
        type: "pre-skilled", option_a: "", option_b: "",
        option_c: "", option_d: "", correct_answer: "Option A"
      })
      fetchAllData()
    }
  }

  const handleDeleteQuestion = async (id: number) => {
    if (!confirm("Delete this question?")) return
    await supabase.from("questions").delete().eq("id", id)
    fetchAllData()
  }

  const exportStudentsCSV = () => {
    const csv = [
      "Full Name,LRN,School Year,Phone Number,Registered",
      ...students.map(s =>
        `${s.full_name},${s.lrn},${s.school_year},${s.phone_number},${new Date(s.created_at).toLocaleDateString()}`
      )
    ].join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = "students.csv"
    a.click()
  }


  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview",   label: "Overview",   icon: "📊" },
    { key: "students",   label: "Students",   icon: "👥" },
    { key: "courses",    label: "Courses",    icon: "📚" },
    { key: "rankings",   label: "Rankings",   icon: "🏆" },
    { key: "sms",        label: "SMS",        icon: "✉" },
    { key: "questions",  label: "Questions",  icon: "❓" },
  ]

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.lrn?.includes(searchQuery)
  )

  const filteredQuestions = questions.filter(q => {
    const matchSearch = q.question_text?.toLowerCase().includes(questionSearch.toLowerCase())
    const matchCourse = filterCourse === "all" || q.course_id === filterCourse
    const matchType = filterType === "all" || q.type === filterType
    return matchSearch && matchCourse && matchType
  })

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", width: "100%", boxSizing: "border-box" }}>

      {/* ── HEADER ── */}
      <div style={{ backgroundColor: "white", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700" }}>TECHNO-VOC Admin Dashboard</h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Welcome, {adminName}</p>
        </div>
        <button
          onClick={onLogout}
          style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e5e7eb", cursor: "pointer", backgroundColor: "white", fontWeight: "600" }}
        >
          ↪ Logout
        </button>
      </div>

      {/* ── TABS ── */}
      <div style={{ backgroundColor: "white", padding: "8px 32px", display: "flex", gap: "4px", borderBottom: "1px solid #e5e7eb" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 20px", borderRadius: "20px", border: "none",
              cursor: "pointer", fontWeight: "600", fontSize: "14px",
              backgroundColor: activeTab === tab.key ? "#111827" : "transparent",
              color: activeTab === tab.key ? "white" : "#6b7280",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{ padding: "32px 40px", width: "100%", boxSizing: "border-box" }}>

        {/* OVERVIEW */}
        {activeTab === "overview" && <OverviewTab />}

        {/* STUDENTS */}
        {activeTab === "students" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontWeight: "700", fontSize: "22px", margin: "0 0 4px" }}>Student Records</h2>
                <p style={{ color: "#6b7280", margin: 0 }}>View all registered students</p>
              </div>
              <button
                onClick={exportStudentsCSV}
                style={{ padding: "10px 20px", backgroundColor: "#374151", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
              >
                ⬇ Export CSV
              </button>
            </div>

            <div style={card}>
              <input
                placeholder="🔍 Search by name or student LRN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ ...card, marginTop: "16px" }}>
              <p style={{ fontWeight: "600", margin: "0 0 4px" }}>Student Records ({filteredStudents.length})</p>
              <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 16px" }}>
                Showing {filteredStudents.length} of {students.length} students
              </p>
              {filteredStudents.length === 0 ? (
                <p style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0" }}>No students found</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      {["Full Name", "LRN", "School Year", "Phone Number", "Registered","Actions"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: "600" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s, i) => (
                     <tr
                          key={s.id}
                          onClick={() => setSelectedStudent(s)}
                          style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: i % 2 === 0 ? "white" : "#f9fafb", cursor: "pointer", transition: "background 0.15s" }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#eff6ff")}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? "white" : "#f9fafb")}
                        >
                        <td style={{ padding: "10px 12px", fontWeight: "500" }}>{s.full_name}</td>
                        <td style={{ padding: "10px 12px" }}>{s.lrn}</td>
                        <td style={{ padding: "10px 12px" }}>{s.school_year}</td>
                        <td style={{ padding: "10px 12px" }}>{s.phone_number}</td>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{new Date(s.created_at).toLocaleDateString()}</td>
                         <td style={{ padding: "10px 12px" }}>
                        <button
                          onClick={e => handleDeleteStudent(s, e)}
                          disabled={deletingId === s.id}
                          style={{
                            padding: "4px 12px",
                            backgroundColor: deletingId === s.id ? "#f3f4f6" : "#fef2f2",
                            color: deletingId === s.id ? "#9ca3af" : "#dc2626",
                            border: "none", borderRadius: "6px",
                            cursor: deletingId === s.id ? "not-allowed" : "pointer",
                            fontSize: "12px", fontWeight: "600"
                          }}
                        >
                          {deletingId === s.id ? "⏳ Deleting..." : "🗑 Delete"}
                        </button>
                      </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* COURSES */}
        {activeTab === "courses" && <CoursesTab />}

        {/* RANKINGS */}
        {activeTab === "rankings" && <RankingsTab />}

        {/* SMS */}
        {activeTab === "sms" && <SMSTab />}

        {/* QUESTIONS */}
        {activeTab === "questions" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontWeight: "700", fontSize: "22px", margin: "0 0 4px" }}>Question Management</h2>
                <p style={{ color: "#6b7280", margin: 0 }}>Add, edit, or delete assessment questions</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{ padding: "10px 20px", backgroundColor: "#111827", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
              >
                + Add Question
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "16px" }}>
              {[
                ["Total Questions", questions.length, "#111827"],
                ["Pre-Skilled", questions.filter(q => q.type === "pre-skilled").length, "#2563eb"],
                ["Aptitude", questions.filter(q => q.type === "aptitude").length, "#7c3aed"],
                ["Filtered Results", filteredQuestions.length, "#16a34a"],
              ].map(([label, val, color]) => (
                <div key={label as string} style={card}>
                  <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 4px" }}>{label}</p>
                  <h2 style={{ color: color as string, fontSize: "28px", margin: 0, fontWeight: "700" }}>{val}</h2>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ ...card, marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  placeholder="🔍 Search questions or options..."
                  value={questionSearch}
                  onChange={e => setQuestionSearch(e.target.value)}
                  style={{ ...inputStyle, flex: 1, minWidth: "200px" }}
                />
                <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} style={selectStyle}>
                  <option value="all">All Courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={selectStyle}>
                  <option value="all">All Types</option>
                  <option value="pre-skilled">Pre-Skilled</option>
                  <option value="aptitude">Aptitude</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div style={card}>
              <p style={{ fontWeight: "600", margin: "0 0 4px" }}>Questions ({filteredQuestions.length})</p>
              <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 16px" }}>
                Showing {filteredQuestions.length} of {questions.length} questions
              </p>
              {filteredQuestions.length === 0 ? (
                <p style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0" }}>
                  No questions yet. Click "+ Add Question" to get started.
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      {["ID", "Question", "Course", "Type", "Correct Answer", "Actions"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: "600" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((q, i) => (
                      <tr key={q.id} style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                        <td style={{ padding: "10px 12px", color: "#6b7280" }}>{q.id}</td>
                        <td style={{ padding: "10px 12px", maxWidth: "320px" }}>
                          <p style={{ margin: "0 0 4px", fontWeight: "500" }}>{q.question_text}</p>
                          <p style={{ margin: 0, color: "#6b7280", fontSize: "12px" }}>
                            A. {q.option_a} | B. {q.option_b} | C. {q.option_c} | D. {q.option_d}
                          </p>
                        </td>
                        <td style={{ padding: "10px 12px" }}>{q.courses?.course_name}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            backgroundColor: q.type === "pre-skilled" ? "#dbeafe" : "#ede9fe",
                            color: q.type === "pre-skilled" ? "#1d4ed8" : "#6d28d9",
                            padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600"
                          }}>
                            {q.type}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ backgroundColor: "#dcfce7", color: "#16a34a", padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
                            {q.correct_answer}
                          </span>
                        </td>
                       
                       
                        <td style={{ padding: "10px 12px" }}>
                         
                          <button
                            onClick={() => {
                              setEditingQuestion(q)
                            }}
                            style={{ padding: "4px 12px", backgroundColor: "#eff6ff", color: "#2563eb", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            style={{ padding: "4px 12px", backgroundColor: "#fef2f2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                          >
                            🗑 Delete
                          </button>
                        </td>
                        


                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── ADD QUESTION MODAL ── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: "700", fontSize: "18px" }}>Add New Question</h3>
                <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>Enter the question details below</p>
              </div>
              <button onClick={() => { setShowModal(false); setModalError("") }} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280" }}>✕</button>
            </div>

            {modalError && (
              <div style={{ backgroundColor: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
                {modalError}
              </div>
            )}

            {/* Question Text */}
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Question</label>
              <input
                placeholder="Enter the question"
                value={newQuestion.question_text}
                onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                style={{ ...inputStyle, marginTop: "6px" }}
              />
            </div>

            {/* Course & Type */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Course</label>
                <select
                  value={newQuestion.course_id}
                  onChange={e => setNewQuestion({ ...newQuestion, course_id: e.target.value })}
                  style={{ ...selectStyle, marginTop: "6px", width: "100%" }}
                >
                  {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select
                  value={newQuestion.type}
                  onChange={e => setNewQuestion({ ...newQuestion, type: e.target.value })}
                  style={{ ...selectStyle, marginTop: "6px", width: "100%" }}
                >
                  <option value="pre-skilled">Pre-Skilled</option>
                  <option value="aptitude">Aptitude</option>
                </select>
              </div>
            </div>

            {/* Options */}
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Options</label>
              <p style={{ color: "#6b7280", fontSize: "12px", margin: "4px 0 12px" }}>Select the correct answer using the radio button</p>
              {(["A", "B", "C", "D"] as const).map(opt => {
                const key = `option_${opt.toLowerCase()}` as keyof typeof newQuestion
                const optLabel = `Option ${opt}`
                const isCorrect = newQuestion.correct_answer === optLabel
                return (
                  <div key={opt} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={isCorrect}
                      onChange={() => setNewQuestion({ ...newQuestion, correct_answer: optLabel })}
                      style={{ width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer", flexShrink: 0 }}
                    />
                    <span style={{ fontWeight: "600", minWidth: "64px", color: isCorrect ? "#2563eb" : "#374151", fontSize: "14px" }}>
                      Option {opt}
                    </span>
                    <input
                      placeholder={`Enter option ${opt}`}
                      value={newQuestion[key] as string}
                      onChange={e => setNewQuestion({ ...newQuestion, [key]: e.target.value })}
                      style={{ ...inputStyle, flex: 1, marginTop: 0, borderColor: isCorrect ? "#2563eb" : "#e5e7eb" }}
                    />
                  </div>
                )
              })}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowModal(false); setModalError("") }}
                style={{ padding: "10px 24px", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestion}
                disabled={modalLoading}
                style={{ padding: "10px 24px", backgroundColor: "#111827", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
              >
                {modalLoading ? "Saving..." : "Add Question"}
              </button>
            </div>
          </div>
        </div>
      )}




      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
      {/* Edit Question Modal */}
            {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          courses={courses}
          onClose={() => setEditingQuestion(null)}
          onSaved={() => { fetchAllData(); setEditingQuestion(null) }}
        />
      )}
    </div>
    
  )
}

const card: React.CSSProperties = {
  backgroundColor: "white", borderRadius: "12px",
  padding: "24px", border: "1px solid #e5e7eb"
}
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "8px",
  border: "1px solid #e5e7eb", fontSize: "14px",
  boxSizing: "border-box", outline: "none"
}
const selectStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb",
  fontSize: "14px", backgroundColor: "white", cursor: "pointer", outline: "none"
}
const labelStyle: React.CSSProperties = {
  fontWeight: "600", fontSize: "14px", color: "#374151"
}
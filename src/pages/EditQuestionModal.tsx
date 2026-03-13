import { useState } from "react"
import { supabase } from "../supabaseClient"

interface Course {
  id: string
  course_name: string
}

interface Question {
  id: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  type: string
  course_id: string
  courses?: { course_name: string }
}

interface Props {
  question: Question
  courses: Course[]
  onClose: () => void
  onSaved: () => void
}

export default function EditQuestionModal({ question, courses, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    question_text: question.question_text,
    course_id: question.course_id,
    type: question.type,
    option_a: question.option_a,
    option_b: question.option_b,
    option_c: question.option_c,
    option_d: question.option_d,
    correct_answer: question.correct_answer,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSave = async () => {
    setError("")
    const { question_text, option_a, option_b, option_c, option_d, course_id } = form

    if (!question_text || !option_a || !option_b || !option_c || !option_d) {
      setError("Please fill in all fields."); return
    }
    if (!course_id) { setError("Please select a course."); return }

    setLoading(true)
    const { error: updateError } = await supabase
      .from("questions")
      .update({
        question_text: form.question_text,
        course_id: form.course_id,
        type: form.type,
        option_a: form.option_a,
        option_b: form.option_b,
        option_c: form.option_c,
        option_d: form.option_d,
        correct_answer: form.correct_answer,
      })
      .eq("id", question.id)
    setLoading(false)

    if (updateError) {
      setError("Error: " + updateError.message)
    } else {
      onSaved()
      onClose()
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
    >
      <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, fontWeight: "700", fontSize: "18px" }}>✏️ Edit Question</h3>
            <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>ID #{question.id} — {question.courses?.course_name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#6b7280" }}>✕</button>
        </div>

        {error && (
          <div style={{ backgroundColor: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {/* Question Text */}
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Question</label>
          <textarea
            value={form.question_text}
            onChange={e => setForm({ ...form, question_text: e.target.value })}
            rows={3}
            style={{ ...inputStyle, marginTop: "6px", resize: "vertical" }}
          />
        </div>

        {/* Course & Type */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div>
            <label style={labelStyle}>Course</label>
            <select
              value={form.course_id}
              onChange={e => setForm({ ...form, course_id: e.target.value })}
              style={{ ...selectStyle, marginTop: "6px", width: "100%" }}
            >
              {courses.map(c => <option key={c.id} value={c.id}>{c.course_name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type</label>
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
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
          <p style={{ color: "#6b7280", fontSize: "12px", margin: "4px 0 12px" }}>Select the radio button next to the correct answer</p>
          {(["A", "B", "C", "D"] as const).map(opt => {
            const key = `option_${opt.toLowerCase()}` as keyof typeof form
            const optLabel = `Option ${opt}`
            const isCorrect = form.correct_answer === optLabel
            return (
              <div key={opt} style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                <input
                  type="radio"
                  name="correct_answer"
                  checked={isCorrect}
                  onChange={() => setForm({ ...form, correct_answer: optLabel })}
                  style={{ width: "16px", height: "16px", accentColor: "#2563eb", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ fontWeight: "600", minWidth: "64px", color: isCorrect ? "#2563eb" : "#374151", fontSize: "14px" }}>
                  Option {opt}
                </span>
                <input
                  value={form[key] as string}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  style={{ ...inputStyle, flex: 1, marginTop: 0, borderColor: isCorrect ? "#2563eb" : "#e5e7eb", backgroundColor: isCorrect ? "#eff6ff" : "white" }}
                />
                {isCorrect && (
                  <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700", flexShrink: 0 }}>✅ Correct</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ padding: "10px 24px", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{ padding: "10px 24px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}
          >
            {loading ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", boxSizing: "border-box", outline: "none" }
const selectStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", backgroundColor: "white", cursor: "pointer", outline: "none" }
const labelStyle: React.CSSProperties = { fontWeight: "600", fontSize: "14px", color: "#374151" }
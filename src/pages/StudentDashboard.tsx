import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import StudentResults from "./StudentResults"


interface Props {
  studentId: string
  studentName: string
  onLogout: () => void
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

interface CourseScore {
  course_name: string
  course_id: string
  score: number
  total: number
  percentage: number
}

type Stage = "intro" | "assessment" | "results"

export default function StudentDashboard({ studentId, studentName, onLogout }: Props) {
  const [stage, setStage] = useState<Stage>("intro")
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [alreadyTaken, setAlreadyTaken] = useState(false)

  useEffect(() => { checkIfAlreadyTaken() }, [])

  const checkIfAlreadyTaken = async () => {
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .eq("student_id", studentId)
      .limit(1)
    if (data && data.length > 0) setAlreadyTaken(true)
  }

  const loadQuestions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("questions")
      .select("*, courses(course_name)")
      .order("course_id")
    setLoading(false)
    if (error || !data) { alert("Failed to load questions."); return }
    // Shuffle questions
    const shuffled = [...data].sort(() => Math.random() - 0.5)
    setQuestions(shuffled)
    setStage("assessment")
  }

  const handleAnswer = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      const unanswered = questions.length - Object.keys(answers).length
      if (!confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return
    }

    setLoading(true)

    // Calculate scores per course
    const courseMap: Record<string, { course_id: string; score: number; total: number }> = {}

    questions.forEach(q => {
      const courseName = q.courses?.course_name || "Unknown"
      if (!courseMap[courseName]) {
        courseMap[courseName] = { course_id: q.course_id, score: 0, total: 0 }
      }
      courseMap[courseName].total += 1
      const userAnswer = answers[q.id]
      if (userAnswer === q.correct_answer) {
        courseMap[courseName].score += 1
      }
    })

    const scores: CourseScore[] = Object.entries(courseMap).map(([name, data]) => ({
      course_name: name,
      course_id: data.course_id,
      score: data.score,
      total: data.total,
      percentage: Math.round((data.score / data.total) * 100),
    })).sort((a, b) => b.percentage - a.percentage)

    // Save each course assessment to Supabase
    for (const cs of scores) {
      await supabase.from("assessments").insert([{
        student_id: studentId,
        course_id: cs.course_id,
        score: cs.score,
        total_items: cs.total,
        passed: cs.percentage >= 50,
      }])
    }

    // Save rankings
    for (let i = 0; i < scores.length; i++) {
      await supabase.from("rankings").insert([{
        student_id: studentId,
        course_id: scores[i].course_id,
        score: scores[i].score,
        rank: i + 1,
        status: i < 3 ? "included" : "waitlist",
      }])
    }

    setLoading(false)
    setStage("results")
  }

  const currentQuestion = questions[currentIndex]
  const progress = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0
  const answeredCount = Object.keys(answers).length

  // ── INTRO STAGE ──
  if (stage === "intro") {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", width: "100%" }}>
        {/* Header */}
        <div style={{ backgroundColor: "white", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: "700", fontSize: "18px" }}>TECHNO-VOC</h2>
            <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Welcome, {studentName}</p>
          </div>
          <button onClick={onLogout} style={btnOutline}>↪ Logout</button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "40px", width: "100%", maxWidth: "700px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>

            <h2 style={{ fontWeight: "700", fontSize: "20px", margin: "0 0 8px" }}>TVE Strand Assessment</h2>
            <p style={{ color: "#6b7280", margin: "0 0 24px", fontSize: "14px" }}>
              This assessment will help determine which Technical-Vocational Education courses are most suitable for you
            </p>

            {alreadyTaken && (
              <div style={{ backgroundColor: "#fef9c3", border: "1px solid #fcd34d", borderRadius: "10px", padding: "14px", marginBottom: "20px" }}>
                <p style={{ color: "#92400e", fontWeight: "600", margin: "0 0 4px" }}>⚠ Already Taken</p>
                <p style={{ color: "#92400e", fontSize: "13px", margin: 0 }}>You have already taken this assessment. You can retake it but results will be added again.</p>
              </div>
            )}

            {/* Assessment Info */}
            <div style={{ backgroundColor: "#eff6ff", borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
              <p style={{ fontWeight: "700", color: "#1d4ed8", margin: "0 0 12px", fontSize: "15px" }}>Assessment Information</p>
              {[
                "Total Questions: 100",
                "Question Types: Pre-skilled and Aptitude",
                "Time Limit: No time limit (take your time)",
                "Passing Score: 50%",
                "Available Courses: Automotive, Agriculture, ICT, Drafting, Beauty-care, Dressmaking, Carpentry, Food-tech, Electricity, Electronics, SMAW",
              ].map((item, i) => (
                <p key={i} style={{ color: "#1e40af", fontSize: "14px", margin: "0 0 6px" }}>• {item}</p>
              ))}
            </div>

            {/* Before You Start */}
            <div style={{ backgroundColor: "#fffbeb", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
              <p style={{ fontWeight: "700", color: "#92400e", margin: "0 0 12px", fontSize: "15px" }}>Before You Start</p>
              {[
                "Read each question carefully",
                "Choose the best answer from the options provided",
                "You can navigate between questions",
                "Make sure to answer all questions before submitting",
                "Based on your results, you will receive top 3 course recommendations",
              ].map((item, i) => (
                <p key={i} style={{ color: "#92400e", fontSize: "14px", margin: "0 0 6px" }}>• {item}</p>
              ))}
            </div>

            <button onClick={loadQuestions} disabled={loading} style={{ ...btnDark, width: "100%", padding: "16px", fontSize: "16px" }}>
              {loading ? "Loading Questions..." : "📋 Start Assessment"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── ASSESSMENT STAGE ──
  if (stage === "assessment") {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", width: "100%" }}>
        {/* Header */}
        <div style={{ backgroundColor: "white", padding: "12px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: "700", fontSize: "16px" }}>TECHNO-VOC Assessment</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
              Question {currentIndex + 1} of {questions.length} • Answered: {answeredCount}/{questions.length}
            </p>
          </div>
          <button onClick={() => { if (confirm("Exit assessment? Progress will be lost.")) setStage("intro") }} style={btnOutline}>✕ Exit</button>
        </div>

        {/* Progress Bar */}
        <div style={{ backgroundColor: "#e5e7eb", height: "6px", width: "100%" }}>
          <div style={{ backgroundColor: "#2563eb", height: "6px", width: `${progress}%`, transition: "width 0.3s" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "center", padding: "32px 20px" }}>
          <div style={{ width: "100%", maxWidth: "750px" }}>

            {/* Course & Type Badge */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <span style={{ backgroundColor: "#dbeafe", color: "#1d4ed8", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
                {currentQuestion?.courses?.course_name}
              </span>
              <span style={{ backgroundColor: currentQuestion?.type === "pre-skilled" ? "#ede9fe" : "#fef3c7", color: currentQuestion?.type === "pre-skilled" ? "#6d28d9" : "#92400e", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
                {currentQuestion?.type}
              </span>
            </div>

            {/* Question Card */}
            <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", marginBottom: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 12px" }}>Question {currentIndex + 1}</p>
              <h3 style={{ fontSize: "18px", fontWeight: "600", margin: "0 0 24px", lineHeight: "1.5" }}>
                {currentQuestion?.question_text}
              </h3>

              {/* Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {([
                  { label: "Option A", value: currentQuestion?.option_a },
                  { label: "Option B", value: currentQuestion?.option_b },
                  { label: "Option C", value: currentQuestion?.option_c },
                  { label: "Option D", value: currentQuestion?.option_d },
                ] as { label: string; value: string }[]).map((opt) => {
                  const isSelected = answers[currentQuestion?.id] === opt.label
                  return (
                    <div
                      key={opt.label}
                      onClick={() => handleAnswer(currentQuestion.id, opt.label)}
                      style={{
                        display: "flex", alignItems: "center", gap: "14px",
                        padding: "14px 18px", borderRadius: "10px", cursor: "pointer",
                        border: isSelected ? "2px solid #2563eb" : "2px solid #e5e7eb",
                        backgroundColor: isSelected ? "#eff6ff" : "white",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        backgroundColor: isSelected ? "#2563eb" : "#f3f4f6",
                        color: isSelected ? "white" : "#374151",
                        fontWeight: "700", fontSize: "13px"
                      }}>
                        {opt.label.split(" ")[1]}
                      </div>
                      <span style={{ fontSize: "15px", color: isSelected ? "#1d4ed8" : "#374151", fontWeight: isSelected ? "600" : "400" }}>
                        {opt.value}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <button
                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                style={{ ...btnOutline, opacity: currentIndex === 0 ? 0.4 : 1 }}
              >
                ← Previous
              </button>

              <span style={{ color: "#6b7280", fontSize: "14px" }}>{currentIndex + 1} / {questions.length}</span>

              {currentIndex < questions.length - 1 ? (
                <button onClick={() => setCurrentIndex(i => i + 1)} style={btnDark}>Next →</button>
              ) : (
                <button onClick={handleSubmit} disabled={loading} style={{ ...btnDark, backgroundColor: "#16a34a" }}>
                  {loading ? "Submitting..." : "✅ Submit Assessment"}
                </button>
              )}
            </div>

            {/* Question Navigator */}
            <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <p style={{ fontWeight: "600", fontSize: "13px", margin: "0 0 10px", color: "#374151" }}>Question Navigator</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    style={{
                      width: "32px", height: "32px", borderRadius: "6px", border: "none",
                      cursor: "pointer", fontSize: "12px", fontWeight: "600",
                      backgroundColor: currentIndex === i ? "#2563eb" : answers[q.id] ? "#16a34a" : "#f3f4f6",
                      color: currentIndex === i || answers[q.id] ? "white" : "#374151",
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "16px", marginTop: "10px", fontSize: "12px", color: "#6b7280" }}>
                <span>🟦 Current</span>
                <span>🟩 Answered ({answeredCount})</span>
                <span>⬜ Unanswered ({questions.length - answeredCount})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  // ── RESULTS STAGE ──
  if (stage === "results") {
    return (
      <StudentResults
        studentId={studentId}
        studentName={studentName}
        onLogout={onLogout}
        onRetake={() => {
          setStage("intro")
          setAnswers({})
          setCurrentIndex(0)
          setQuestions([])
        }}
      />
    )
  }

  return null
}

const btnDark: React.CSSProperties = { padding: "10px 24px", backgroundColor: "#111827", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }
const btnOutline: React.CSSProperties = { padding: "8px 16px", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }
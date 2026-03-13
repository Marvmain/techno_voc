import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

interface Props {
  studentId: string
  studentName: string
  onLogout: () => void
  onRetake: () => void
}

interface AssessmentResult {
  id: string
  score: number
  total_items: number
  passed: boolean
  taken_at: string
  courses?: { course_name: string }
}

interface RankingResult {
  id: string
  score: number
  rank: number
  status: string
  courses?: { course_name: string; capacity: number }
}

export default function StudentResults({ studentId, studentName, onLogout, onRetake }: Props) {
  const [assessments, setAssessments] = useState<AssessmentResult[]>([])
  const [rankings, setRankings] = useState<RankingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"scores" | "rankings">("scores")

  useEffect(() => { fetchResults() }, [])

  const fetchResults = async () => {
    setLoading(true)

    const { data: aData } = await supabase
      .from("assessments")
      .select("*, courses(course_name)")
      .eq("student_id", studentId)
      .order("score", { ascending: false })

    const { data: rData } = await supabase
      .from("rankings")
      .select("*, courses(course_name, capacity)")
      .eq("student_id", studentId)
      .order("score", { ascending: false })

    setAssessments(aData || [])
    setRankings(rData || [])
    setLoading(false)
  }

  const top3 = rankings.slice(0, 3)
  const totalScore = assessments.reduce((s, a) => s + a.score, 0)
  const totalItems = assessments.reduce((s, a) => s + a.total_items, 0)
  const overallPct = totalItems > 0 ? Math.round((totalScore / totalItems) * 100) : 0
  const passed = overallPct >= 50
  const takenAt = assessments[0]?.taken_at
    ? new Date(assessments[0].taken_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : null

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f3f4f6", width: "100%" }}>

      {/* Header */}
      <div style={{ backgroundColor: "white", padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: "700", fontSize: "18px" }}>TECHNO-VOC</h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>Welcome, {studentName}</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={onRetake} style={btnOutline}>📋 Retake Assessment</button>
          <button onClick={onLogout} style={btnOutline}>↪ Logout</button>
        </div>
      </div>

      <div style={{ padding: "32px 40px", maxWidth: "960px", margin: "0 auto", boxSizing: "border-box" as any }}>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontSize: "40px", margin: "0 0 8px" }}>⏳</p>
            <p style={{ color: "#6b7280" }}>Loading your results...</p>
          </div>

        ) : assessments.length === 0 ? (
          /* ── No Assessment Taken ── */
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "56px 48px", textAlign: "center", maxWidth: "480px", width: "100%", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: "52px", margin: "0 0 16px" }}>📋</p>
              <h3 style={{ fontWeight: "700", fontSize: "20px", margin: "0 0 10px" }}>No Assessment Yet</h3>
              <p style={{ color: "#6b7280", margin: "0 0 28px", lineHeight: "1.6" }}>
                You haven't taken the TVE Strand Assessment yet. Take it now to find out which courses best match your skills!
              </p>
              <button onClick={onRetake} style={{ ...btnDark, padding: "14px 36px", fontSize: "15px", width: "100%" }}>
                📋 Start Assessment Now
              </button>
            </div>
          </div>

        ) : (
          <>
            {/* ── Result Banner ── */}
            <div style={{
              backgroundColor: passed ? "#f0fdf4" : "#fef2f2",
              border: `2px solid ${passed ? "#16a34a" : "#dc2626"}`,
              borderRadius: "16px", padding: "28px 32px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: "24px", flexWrap: "wrap", gap: "20px"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "36px" }}>{passed ? "🎉" : "📚"}</span>
                  <h2 style={{ fontWeight: "800", fontSize: "24px", margin: 0, color: passed ? "#15803d" : "#dc2626" }}>
                    {passed ? "You Passed!" : "Assessment Complete"}
                  </h2>
                </div>
                <p style={{ color: "#6b7280", margin: "0 0 4px" }}>
                  {passed ? "You have qualified for TVE strand enrollment." : "Keep practicing to improve your score."}
                </p>
                {takenAt && (
                  <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>📅 Taken: {takenAt}</p>
                )}
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                {[
                  { label: "Total Score", value: totalScore, color: "#2563eb" },
                  { label: "Out of", value: totalItems, color: "#6b7280" },
                  { label: "Score Rate", value: `${overallPct}%`, color: passed ? "#16a34a" : "#dc2626" },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: "center", backgroundColor: "white", borderRadius: "12px", padding: "14px 20px", minWidth: "80px" }}>
                    <p style={{ fontSize: "26px", fontWeight: "800", margin: "0 0 2px", color: stat.color }}>{stat.value}</p>
                    <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Top 3 Recommendations ── */}
            <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px", marginBottom: "20px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <h3 style={{ fontWeight: "700", fontSize: "17px", margin: "0 0 4px" }}>🏆 Your Top 3 Course Recommendations</h3>
              <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 20px" }}>Based on your assessment performance</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {top3.map((r, i) => {
                  const pct = Math.min(Math.round((r.score / 10) * 100), 100)
                  return (
                    <div key={r.id} style={{
                      display: "flex", alignItems: "center", gap: "16px", padding: "18px",
                      borderRadius: "12px",
                      backgroundColor: i === 0 ? "#fffbeb" : i === 1 ? "#f8fafc" : "#f9fafb",
                      border: `1px solid ${i === 0 ? "#fcd34d" : "#e5e7eb"}`
                    }}>
                      <span style={{ fontSize: "30px", flexShrink: 0 }}>{["🥇", "🥈", "🥉"][i]}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: "700", margin: "0 0 8px", fontSize: "16px" }}>{r.courses?.course_name}</p>
                        <div style={{ backgroundColor: "#e5e7eb", borderRadius: "4px", height: "8px", marginBottom: "6px" }}>
                          <div style={{ backgroundColor: i === 0 ? "#d97706" : "#2563eb", height: "8px", borderRadius: "4px", width: `${pct}%`, transition: "width 0.6s" }} />
                        </div>
                        <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>Score: {r.score} pts</p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <span style={{
                          backgroundColor: r.status === "included" ? "#dcfce7" : "#fef3c7",
                          color: r.status === "included" ? "#16a34a" : "#92400e",
                          padding: "5px 14px", borderRadius: "20px",
                          fontSize: "12px", fontWeight: "700",
                          display: "block", marginBottom: "4px"
                        }}>
                          {r.status === "included" ? "✅ Included" : "⏳ Waitlist"}
                        </span>
                        <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>Cap: {r.courses?.capacity || 70}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Sub Tabs ── */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "16px", backgroundColor: "white", padding: "4px", borderRadius: "10px", border: "1px solid #e5e7eb", width: "fit-content" }}>
              {(["scores", "rankings"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "9px 24px", borderRadius: "8px", border: "none", cursor: "pointer",
                  fontWeight: "600", fontSize: "14px",
                  backgroundColor: activeTab === tab ? "#111827" : "transparent",
                  color: activeTab === tab ? "white" : "#6b7280"
                }}>
                  {tab === "scores" ? "📊 Score Breakdown" : "🏅 Course Rankings"}
                </button>
              ))}
            </div>

            {/* ── Score Breakdown Table ── */}
            {activeTab === "scores" && (
              <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <h3 style={{ fontWeight: "700", fontSize: "16px", margin: "0 0 16px" }}>📊 Score Breakdown by Course</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      {["Course", "Score", "Total Items", "Percentage", "Status"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: "600" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((a, i) => {
                      const pct = Math.round((a.score / a.total_items) * 100)
                      return (
                        <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                          <td style={{ padding: "12px", fontWeight: "500" }}>{a.courses?.course_name}</td>
                          <td style={{ padding: "12px", fontWeight: "700", color: "#2563eb" }}>{a.score}</td>
                          <td style={{ padding: "12px", color: "#6b7280" }}>{a.total_items}</td>
                          <td style={{ padding: "12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ backgroundColor: "#e5e7eb", borderRadius: "4px", height: "6px", width: "80px" }}>
                                <div style={{ backgroundColor: pct >= 50 ? "#16a34a" : "#f59e0b", height: "6px", borderRadius: "4px", width: `${pct}%` }} />
                              </div>
                              <span style={{ fontWeight: "600" }}>{pct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{
                              backgroundColor: a.passed ? "#dcfce7" : "#fef2f2",
                              color: a.passed ? "#16a34a" : "#dc2626",
                              padding: "3px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600"
                            }}>
                              {a.passed ? "Passed" : "Failed"}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: "2px solid #e5e7eb", backgroundColor: "#f8fafc" }}>
                      <td style={{ padding: "12px", fontWeight: "700" }}>OVERALL TOTAL</td>
                      <td style={{ padding: "12px", fontWeight: "800", color: "#2563eb", fontSize: "16px" }}>{totalScore}</td>
                      <td style={{ padding: "12px", fontWeight: "700", color: "#6b7280" }}>{totalItems}</td>
                      <td style={{ padding: "12px", fontWeight: "700" }}>{overallPct}%</td>
                      <td style={{ padding: "12px" }}>
                        <span style={{
                          backgroundColor: passed ? "#dcfce7" : "#fef2f2",
                          color: passed ? "#16a34a" : "#dc2626",
                          padding: "3px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "700"
                        }}>
                          {passed ? "✅ Overall Passed" : "❌ Overall Failed"}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ── Rankings Table ── */}
            {activeTab === "rankings" && (
              <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <h3 style={{ fontWeight: "700", fontSize: "16px", margin: "0 0 16px" }}>🏅 Your Rankings per Course</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      {["Course", "Your Score", "Your Rank", "Capacity", "Status"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: "600" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                        <td style={{ padding: "12px", fontWeight: "500" }}>{r.courses?.course_name}</td>
                        <td style={{ padding: "12px", fontWeight: "700", color: "#2563eb" }}>{r.score}</td>
                        <td style={{ padding: "12px", fontWeight: "700" }}>
                          {r.rank === 1 ? "🥇 #1" : r.rank === 2 ? "🥈 #2" : r.rank === 3 ? "🥉 #3" : `#${r.rank}`}
                        </td>
                        <td style={{ padding: "12px", color: "#6b7280" }}>{r.courses?.capacity || 70} slots</td>
                        <td style={{ padding: "12px" }}>
                          <span style={{
                            backgroundColor: r.status === "included" ? "#dcfce7" : "#fef3c7",
                            color: r.status === "included" ? "#16a34a" : "#92400e",
                            padding: "4px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: "600"
                          }}>
                            {r.status === "included" ? "✅ Included" : "⏳ Waitlist"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Retake */}
            <div style={{ textAlign: "center", marginTop: "28px" }}>
              <button onClick={onRetake} style={{ ...btnDark, padding: "14px 40px", fontSize: "15px" }}>
                🔄 Retake Assessment
              </button>
              <p style={{ color: "#9ca3af", fontSize: "12px", marginTop: "8px" }}>
                Note: Retaking will add new results to your record
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const btnDark: React.CSSProperties = { padding: "10px 24px", backgroundColor: "#111827", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }
const btnOutline: React.CSSProperties = { padding: "8px 16px", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }
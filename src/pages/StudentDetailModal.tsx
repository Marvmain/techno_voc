import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import { printStudentResults } from "./printResults"

interface Props {
  student: {
    id: string
    full_name: string
    lrn: string
    school_year: string
    phone_number: string
    created_at: string
  }
  onClose: () => void
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

export default function StudentDetailModal({ student, onClose }: Props) {
  const [assessments, setAssessments] = useState<AssessmentResult[]>([])
  const [rankings, setRankings] = useState<RankingResult[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"scores" | "rankings">("scores")

  useEffect(() => {
    fetchResults()
    // Close on Escape key
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const fetchResults = async () => {
    setLoading(true)

    const { data: aData } = await supabase
      .from("assessments")
      .select("*, courses(course_name)")
      .eq("student_id", student.id)
      .order("score", { ascending: false })

    const { data: rData } = await supabase
      .from("rankings")
      .select("*, courses(course_name, capacity)")
      .eq("student_id", student.id)
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
    : "Not taken yet"

  const handlePrint = () => {
    printStudentResults({
      studentName: student.full_name,
      studentLRN: student.lrn,
      schoolYear: student.school_year,
      takenAt,
      totalScore,
      totalItems,
      overallPercent: overallPct,
      passed,
      top3: top3.map(r => ({
        course_name: r.courses?.course_name || "",
        score: r.score,
        status: r.status,
      })),
      assessments: assessments.map(a => ({
        course_name: a.courses?.course_name || "",
        score: a.score,
        total_items: a.total_items,
        passed: a.passed,
      })),
      rankings: rankings.map(r => ({
        course_name: r.courses?.course_name || "",
        score: r.score,
        rank: r.rank,
        status: r.status,
      })),
    })
  }

  return (
    // Backdrop
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
    >
      {/* Modal */}
      <div style={{ backgroundColor: "white", borderRadius: "16px", width: "100%", maxWidth: "800px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>

        {/* Modal Header */}
        <div style={{ padding: "24px 28px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "sticky", top: 0, backgroundColor: "white", zIndex: 10, borderRadius: "16px 16px 0 0" }}>
          <div>
            <h2 style={{ fontWeight: "800", fontSize: "20px", margin: "0 0 4px" }}>
              {student.full_name}
            </h2>
            <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "#6b7280" }}>
              <span>📋 LRN: <strong>{student.lrn}</strong></span>
              <span>📅 SY: <strong>{student.school_year}</strong></span>
              <span>📱 {student.phone_number}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {assessments.length > 0 && (
              <button onClick={handlePrint} style={btnPrint}>🖨 Print Results</button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: "8px", width: "36px", height: "36px", cursor: "pointer", fontSize: "18px", color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>

          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: "32px", margin: "0 0 8px" }}>⏳</p>
              <p style={{ color: "#6b7280" }}>Loading results...</p>
            </div>

          ) : assessments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <p style={{ fontSize: "40px", margin: "0 0 12px" }}>📋</p>
              <h3 style={{ fontWeight: "700", margin: "0 0 8px" }}>No Assessment Taken</h3>
              <p style={{ color: "#6b7280", margin: 0 }}>
                {student.full_name} has not taken the TVE Strand Assessment yet.
              </p>
            </div>

          ) : (
            <>
              {/* Score Banner */}
              <div style={{
                backgroundColor: passed ? "#f0fdf4" : "#fef2f2",
                border: `2px solid ${passed ? "#16a34a" : "#dc2626"}`,
                borderRadius: "12px", padding: "20px 24px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: "20px", flexWrap: "wrap", gap: "12px"
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <span style={{ fontSize: "28px" }}>{passed ? "🎉" : "📚"}</span>
                    <h3 style={{ fontWeight: "800", fontSize: "20px", margin: 0, color: passed ? "#15803d" : "#dc2626" }}>
                      {passed ? "Passed" : "Failed"}
                    </h3>
                  </div>
                  <p style={{ color: "#9ca3af", fontSize: "13px", margin: 0 }}>📅 Taken: {takenAt}</p>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[
                    { label: "Score", value: totalScore, color: "#2563eb" },
                    { label: "Total", value: totalItems, color: "#6b7280" },
                    { label: "Rate", value: `${overallPct}%`, color: passed ? "#16a34a" : "#dc2626" },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: "center", backgroundColor: "white", borderRadius: "10px", padding: "10px 16px", minWidth: "68px" }}>
                      <p style={{ fontSize: "22px", fontWeight: "800", margin: "0 0 2px", color: s.color }}>{s.value}</p>
                      <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 3 */}
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontWeight: "700", fontSize: "15px", margin: "0 0 12px" }}>🏆 Top 3 Course Recommendations</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {top3.map((r, i) => (
                    <div key={r.id} style={{
                      display: "flex", alignItems: "center", gap: "14px", padding: "14px 16px",
                      borderRadius: "10px",
                      backgroundColor: i === 0 ? "#fffbeb" : "#f9fafb",
                      border: `1px solid ${i === 0 ? "#fcd34d" : "#e5e7eb"}`
                    }}>
                      <span style={{ fontSize: "24px" }}>{["🥇", "🥈", "🥉"][i]}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: "700", margin: "0 0 6px" }}>{r.courses?.course_name}</p>
                        <div style={{ backgroundColor: "#e5e7eb", borderRadius: "4px", height: "6px" }}>
                          <div style={{ backgroundColor: i === 0 ? "#d97706" : "#2563eb", height: "6px", borderRadius: "4px", width: `${Math.min((r.score / 10) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontWeight: "700", color: "#2563eb", margin: "0 0 4px" }}>{r.score} pts</p>
                        <span style={{
                          backgroundColor: r.status === "included" ? "#dcfce7" : "#fef3c7",
                          color: r.status === "included" ? "#16a34a" : "#92400e",
                          padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700"
                        }}>
                          {r.status === "included" ? "✅ Included" : "⏳ Waitlist"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub Tabs */}
              <div style={{ display: "flex", gap: "4px", marginBottom: "14px", backgroundColor: "#f3f4f6", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
                {(["scores", "rankings"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: "7px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
                    fontWeight: "600", fontSize: "13px",
                    backgroundColor: activeTab === tab ? "white" : "transparent",
                    color: activeTab === tab ? "#111827" : "#6b7280",
                    boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.08)" : "none"
                  }}>
                    {tab === "scores" ? "📊 Score Breakdown" : "🏅 Rankings"}
                  </button>
                ))}
              </div>

              {/* Score Breakdown Table */}
              {activeTab === "scores" && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      {["Course", "Score", "Total", "Percentage", "Status"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#6b7280", fontWeight: "600" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((a, i) => {
                      const pct = Math.round((a.score / a.total_items) * 100)
                      return (
                        <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                          <td style={{ padding: "9px 12px", fontWeight: "500" }}>{a.courses?.course_name}</td>
                          <td style={{ padding: "9px 12px", fontWeight: "700", color: "#2563eb" }}>{a.score}</td>
                          <td style={{ padding: "9px 12px", color: "#6b7280" }}>{a.total_items}</td>
                          <td style={{ padding: "9px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div style={{ backgroundColor: "#e5e7eb", borderRadius: "4px", height: "6px", width: "70px" }}>
                                <div style={{ backgroundColor: pct >= 50 ? "#16a34a" : "#f59e0b", height: "6px", borderRadius: "4px", width: `${pct}%` }} />
                              </div>
                              <span style={{ fontWeight: "600", fontSize: "12px" }}>{pct}%</span>
                            </div>
                          </td>
                          <td style={{ padding: "9px 12px" }}>
                            <span style={{
                              backgroundColor: a.passed ? "#dcfce7" : "#fef2f2",
                              color: a.passed ? "#16a34a" : "#dc2626",
                              padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600"
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
                      <td style={{ padding: "9px 12px", fontWeight: "700" }}>TOTAL</td>
                      <td style={{ padding: "9px 12px", fontWeight: "800", color: "#2563eb" }}>{totalScore}</td>
                      <td style={{ padding: "9px 12px", color: "#6b7280", fontWeight: "700" }}>{totalItems}</td>
                      <td style={{ padding: "9px 12px", fontWeight: "700" }}>{overallPct}%</td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{
                          backgroundColor: passed ? "#dcfce7" : "#fef2f2",
                          color: passed ? "#16a34a" : "#dc2626",
                          padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700"
                        }}>
                          {passed ? "✅ Passed" : "❌ Failed"}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* Rankings Table */}
              {activeTab === "rankings" && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      {["Course", "Score", "Rank", "Capacity", "Status"].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#6b7280", fontWeight: "600" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                        <td style={{ padding: "9px 12px", fontWeight: "500" }}>{r.courses?.course_name}</td>
                        <td style={{ padding: "9px 12px", fontWeight: "700", color: "#2563eb" }}>{r.score}</td>
                        <td style={{ padding: "9px 12px", fontWeight: "700" }}>
                          {r.rank === 1 ? "🥇 #1" : r.rank === 2 ? "🥈 #2" : r.rank === 3 ? "🥉 #3" : `#${r.rank}`}
                        </td>
                        <td style={{ padding: "9px 12px", color: "#6b7280" }}>{r.courses?.capacity || 70} slots</td>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{
                            backgroundColor: r.status === "included" ? "#dcfce7" : "#fef3c7",
                            color: r.status === "included" ? "#16a34a" : "#92400e",
                            padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600"
                          }}>
                            {r.status === "included" ? "✅ Included" : "⏳ Waitlist"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const btnPrint: React.CSSProperties = {
  padding: "8px 16px", backgroundColor: "#2563eb", color: "white",
  border: "none", borderRadius: "8px", cursor: "pointer",
  fontWeight: "600", fontSize: "13px"
}
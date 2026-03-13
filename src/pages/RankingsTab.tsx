import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

interface RankingEntry {
  id: string
  student_id: string
  course_id: string
  score: number
  rank: number
  status: string
  school_year: string
  students?: { full_name: string; lrn: string; phone_number: string }
  courses?: { course_name: string; capacity: number }
}

interface Course {
  id: string
  course_name: string
  capacity: number
}

export default function RankingsTab() {
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)

    // Fetch courses
    const { data: courseData } = await supabase
      .from("courses")
      .select("*")
      .order("course_name")
    setCourses(courseData || [])

    // Fetch rankings with student and course info
    const { data: rankData } = await supabase
      .from("rankings")
      .select("*, students(full_name, lrn, phone_number), courses(course_name, capacity)")
      .order("score", { ascending: false })
    setRankings(rankData || [])

    setLoading(false)
  }

  // Recalculate rankings per course based on score
  const recalculateRankings = async () => {
    if (!confirm("Recalculate all rankings based on current scores?")) return
    setLoading(true)

    for (const course of courses) {
      const courseRankings = rankings
        .filter(r => r.course_id === course.id)
        .sort((a, b) => b.score - a.score)

      for (let i = 0; i < courseRankings.length; i++) {
        const status = i < course.capacity ? "included" : "waitlist"
        await supabase
          .from("rankings")
          .update({ rank: i + 1, status })
          .eq("id", courseRankings[i].id)
      }
    }

    await fetchData()
  }

  // Export rankings as CSV
  const exportCSV = (courseId?: string) => {
    const filtered = courseId && courseId !== "all"
      ? rankings.filter(r => r.course_id === courseId)
      : rankings

    const csv = [
      "Rank,Student Name,LRN,Course,Score,Status,Phone",
      ...filtered.map(r =>
        `${r.rank},${r.students?.full_name || ""},${r.students?.lrn || ""},${r.courses?.course_name || ""},${r.score},${r.status},${r.students?.phone_number || ""}`
      )
    ].join("\n")

    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = courseId && courseId !== "all"
      ? `rankings-${courses.find(c => c.id === courseId)?.course_name}.csv`
      : "rankings-all.csv"
    a.click()
  }

  // Filter rankings by selected course
  const filteredRankings = selectedCourse === "all"
    ? rankings
    : rankings.filter(r => r.course_id === selectedCourse)

  // Stats for selected course
  const included = filteredRankings.filter(r => r.status === "included").length
  const waitlist = filteredRankings.filter(r => r.status === "waitlist").length
  const selectedCourseData = courses.find(c => c.id === selectedCourse)
  const capacity = selectedCourse === "all"
    ? courses.reduce((sum, c) => sum + c.capacity, 0)
    : selectedCourseData?.capacity || 70

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontWeight: "700", fontSize: "22px", margin: "0 0 4px" }}>Course Rankings</h2>
          <p style={{ color: "#6b7280", margin: 0 }}>Student rankings by course with carrying capacity</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={recalculateRankings}
            style={{ padding: "10px 16px", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
          >
            🔄 Recalculate
          </button>
          <button
            onClick={() => exportCSV(selectedCourse)}
            style={{ padding: "10px 16px", backgroundColor: "#374151", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
          >
            ⬇ Export {selectedCourse === "all" ? "All" : selectedCourseData?.course_name}
          </button>
        </div>
      </div>

      {/* Course Selector */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb", marginBottom: "16px" }}>
        <p style={{ fontWeight: "600", margin: "0 0 4px" }}>Select Course</p>
        <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 12px" }}>View rankings for a specific course</p>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            style={{ flex: 1, minWidth: "200px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", backgroundColor: "white", cursor: "pointer" }}
          >
            <option value="all">All Courses</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.course_name}</option>
            ))}
          </select>
          <button
            onClick={() => exportCSV(selectedCourse)}
            style={{ padding: "10px 20px", backgroundColor: "#111827", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
          >
            ⬇ Export {selectedCourse !== "all" && selectedCourseData?.course_name}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "16px" }}>
        {[
          ["Total Students", filteredRankings.length, "#2563eb"],
          ["Capacity", capacity, "#7c3aed"],
          ["Included", included, "#16a34a"],
          ["Waitlist", waitlist, "#f59e0b"],
        ].map(([label, val, color]) => (
          <div key={label as string} style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 8px" }}>{label}</p>
            <h2 style={{ color: color as string, fontSize: "28px", margin: 0, fontWeight: "700" }}>{val}</h2>
          </div>
        ))}
      </div>

      {/* Rankings Table */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", border: "1px solid #e5e7eb" }}>
        <p style={{ fontWeight: "600", margin: "0 0 4px", fontSize: "16px" }}>
          {selectedCourse === "all" ? "All Rankings" : `${selectedCourseData?.course_name} Rankings`}
        </p>
        <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 16px" }}>
          Showing {filteredRankings.length} students ranked by score
        </p>

        {loading ? (
          <p style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0" }}>Loading rankings...</p>
        ) : filteredRankings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ fontSize: "32px", margin: "0 0 8px" }}>📊</p>
            <p style={{ color: "#9ca3af", margin: 0 }}>No students in rankings yet.</p>
            <p style={{ color: "#9ca3af", fontSize: "13px", margin: "4px 0 0" }}>Students will appear here after taking the assessment.</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                {["Rank", "Student Name", "LRN", selectedCourse === "all" ? "Course" : "", "Score", "Status", "Action"].filter(Boolean).map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: "600" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRankings.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                  {/* Rank */}
                  <td style={{ padding: "12px", fontWeight: "700" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`}
                    </div>
                  </td>

                  {/* Student Name */}
                  <td style={{ padding: "12px", fontWeight: "500" }}>
                    {r.students?.full_name || "—"}
                  </td>

                  {/* LRN */}
                  <td style={{ padding: "12px", color: "#6b7280" }}>
                    {r.students?.lrn || "—"}
                  </td>

                  {/* Course (only if showing all) */}
                  {selectedCourse === "all" && (
                    <td style={{ padding: "12px" }}>
                      <span style={{ backgroundColor: "#dbeafe", color: "#1d4ed8", padding: "2px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>
                        {r.courses?.course_name}
                      </span>
                    </td>
                  )}

                  {/* Score */}
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ backgroundColor: "#e5e7eb", borderRadius: "4px", height: "6px", width: "80px" }}>
                        <div style={{
                          backgroundColor: r.score >= 5 ? "#16a34a" : "#f59e0b",
                          height: "6px", borderRadius: "4px",
                          width: `${Math.min((r.score / 10) * 100, 100)}%`
                        }} />
                      </div>
                      <span style={{ fontWeight: "600" }}>{r.score}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      backgroundColor: r.status === "included" ? "#dcfce7" : "#fef3c7",
                      color: r.status === "included" ? "#16a34a" : "#92400e",
                      padding: "4px 12px", borderRadius: "20px",
                      fontSize: "12px", fontWeight: "600"
                    }}>
                      {r.status === "included" ? "✅ Included" : "⏳ Waitlist"}
                    </span>
                  </td>

                  {/* Action */}
                  <td style={{ padding: "12px" }}>
                    <button
                      onClick={async () => {
                        const newStatus = r.status === "included" ? "waitlist" : "included"
                        await supabase.from("rankings").update({ status: newStatus }).eq("id", r.id)
                        fetchData()
                      }}
                      style={{
                        padding: "4px 12px",
                        backgroundColor: r.status === "included" ? "#fef2f2" : "#f0fdf4",
                        color: r.status === "included" ? "#dc2626" : "#16a34a",
                        border: "none", borderRadius: "6px",
                        cursor: "pointer", fontSize: "12px", fontWeight: "600"
                      }}
                    >
                      {r.status === "included" ? "Move to Waitlist" : "Move to Included"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* How Rankings Work */}
      <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "20px", marginTop: "16px" }}>
        <p style={{ fontWeight: "700", color: "#1d4ed8", margin: "0 0 10px" }}>ℹ How Rankings Work</p>
        <ul style={{ paddingLeft: "16px", color: "#1e40af", fontSize: "13px", lineHeight: "2", margin: 0 }}>
          <li>Students are ranked by their performance score in each course</li>
          <li>Each course has a carrying capacity of 70 students</li>
          <li>Top-ranked students (up to capacity) are marked as <strong>Included</strong></li>
          <li>Students beyond capacity are placed on the <strong>Waitlist</strong></li>
          <li>Rankings are based on course-specific assessment scores</li>
          <li>Students receive top 3 course recommendations based on their overall performance</li>
          <li>Admin can manually move students between Included and Waitlist</li>
        </ul>
      </div>
    </div>
  )
}
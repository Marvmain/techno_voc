import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

interface Course {
  id: string
  course_name: string
  capacity: number
  created_at: string
}

interface CourseStats extends Course {
  enrolled: number
  waitlist: number
  totalAssessed: number
  passedCount: number
}

export default function CoursesTab() {
  const [courses, setCourses] = useState<CourseStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "enrolled" | "available">("enrolled")

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)

    // Fetch all courses
    const { data: courseData } = await supabase
      .from("courses")
      .select("*")
      .order("course_name")

    if (!courseData) { setLoading(false); return }

    // For each course, get counts from rankings and assessments
    const statsPromises = courseData.map(async (course) => {
      // Count included students (enrolled)
      const { count: enrolled } = await supabase
        .from("rankings")
        .select("*", { count: "exact", head: true })
        .eq("course_id", course.id)
        .eq("status", "included")

      // Count waitlisted students
      const { count: waitlist } = await supabase
        .from("rankings")
        .select("*", { count: "exact", head: true })
        .eq("course_id", course.id)
        .eq("status", "waitlist")

      // Count total assessed
      const { count: totalAssessed } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", course.id)

      // Count passed
      const { count: passedCount } = await supabase
        .from("assessments")
        .select("*", { count: "exact", head: true })
        .eq("course_id", course.id)
        .eq("passed", true)

      return {
        ...course,
        enrolled: enrolled || 0,
        waitlist: waitlist || 0,
        totalAssessed: totalAssessed || 0,
        passedCount: passedCount || 0,
      }
    })

    const stats = await Promise.all(statsPromises)
    setCourses(stats)
    setLoading(false)
  }

  const filtered = courses
    .filter(c => c.course_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.course_name.localeCompare(b.course_name)
      if (sortBy === "enrolled") return b.enrolled - a.enrolled
      if (sortBy === "available") return (a.capacity - a.enrolled) - (b.capacity - b.enrolled)
      return 0
    })

  const totalEnrolled = courses.reduce((s, c) => s + c.enrolled, 0)
  const totalCapacity = courses.reduce((s, c) => s + c.capacity, 0)
  const totalWaitlist = courses.reduce((s, c) => s + c.waitlist, 0)
  const totalAssessed = courses.reduce((s, c) => s + c.totalAssessed, 0)

  const getBarColor = (pct: number) => {
    if (pct >= 90) return "#dc2626"  // red - almost full
    if (pct >= 60) return "#f59e0b"  // yellow - filling up
    return "#16a34a"                  // green - available
  }

  const courseIcons: Record<string, string> = {
    "Automotive": "🔧", "Agriculture": "🌾", "ICT": "💻",
    "Drafting": "📐", "Beauty-care": "💄", "Dressmaking": "🧵",
    "Carpentry": "🪚", "Food-tech": "🍳", "Electricity": "⚡",
    "Electronics": "🔌", "SMAW": "🔥"
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontWeight: "700", fontSize: "22px", margin: "0 0 4px" }}>Course Enrollment</h2>
          <p style={{ color: "#6b7280", margin: 0 }}>Real-time student count per TVE course</p>
        </div>
        <button
          onClick={fetchData}
          style={{ padding: "10px 16px", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Enrolled", value: totalEnrolled, sub: `of ${totalCapacity} total slots`, color: "#2563eb", icon: "👥" },
          { label: "Available Slots", value: totalCapacity - totalEnrolled, sub: "slots remaining", color: "#16a34a", icon: "✅" },
          { label: "On Waitlist", value: totalWaitlist, sub: "waiting for slots", color: "#f59e0b", icon: "⏳" },
          { label: "Total Assessed", value: totalAssessed, sub: "assessments taken", color: "#7c3aed", icon: "📋" },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 6px" }}>{stat.label}</p>
                <h2 style={{ color: stat.color, fontSize: "28px", margin: "0 0 4px", fontWeight: "700" }}>{stat.value}</h2>
                <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>{stat.sub}</p>
              </div>
              <span style={{ fontSize: "24px" }}>{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Capacity Bar */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <p style={{ fontWeight: "700", margin: 0, fontSize: "15px" }}>Overall Capacity Usage</p>
          <p style={{ fontWeight: "700", margin: 0, color: "#2563eb" }}>
            {totalEnrolled} / {totalCapacity} ({Math.round((totalEnrolled / totalCapacity) * 100)}%)
          </p>
        </div>
        <div style={{ backgroundColor: "#e5e7eb", borderRadius: "8px", height: "14px" }}>
          <div style={{
            backgroundColor: getBarColor((totalEnrolled / totalCapacity) * 100),
            height: "14px", borderRadius: "8px",
            width: `${Math.min((totalEnrolled / totalCapacity) * 100, 100)}%`,
            transition: "width 0.5s"
          }} />
        </div>
        <div style={{ display: "flex", gap: "20px", marginTop: "10px", fontSize: "12px" }}>
          <span style={{ color: "#16a34a" }}>🟢 Under 60% — Available</span>
          <span style={{ color: "#f59e0b" }}>🟡 60–89% — Filling Up</span>
          <span style={{ color: "#dc2626" }}>🔴 90%+ — Almost Full</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "16px", border: "1px solid #e5e7eb", marginBottom: "16px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <input
          placeholder="🔍 Search course..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: "200px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", outline: "none" }}
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "14px", backgroundColor: "white", cursor: "pointer", outline: "none" }}
        >
          <option value="enrolled">Sort by Most Enrolled</option>
          <option value="available">Sort by Most Available</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* Course Cards Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ fontSize: "32px", margin: "0 0 8px" }}>⏳</p>
          <p style={{ color: "#6b7280" }}>Loading course data...</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          {filtered.map(course => {
            const pct = Math.round((course.enrolled / course.capacity) * 100)
            const available = course.capacity - course.enrolled
            const barColor = getBarColor(pct)
            const icon = courseIcons[course.course_name] || "📚"
            const passRate = course.totalAssessed > 0 ? Math.round((course.passedCount / course.totalAssessed) * 100) : 0

            return (
              <div key={course.id} style={{ backgroundColor: "white", borderRadius: "14px", padding: "20px", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", transition: "box-shadow 0.2s" }}>
                {/* Course Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>
                      {icon}
                    </div>
                    <div>
                      <p style={{ fontWeight: "700", margin: 0, fontSize: "15px" }}>{course.course_name}</p>
                      <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>Capacity: {course.capacity}</p>
                    </div>
                  </div>
                  <span style={{
                    backgroundColor: available === 0 ? "#fef2f2" : available <= 10 ? "#fef3c7" : "#f0fdf4",
                    color: available === 0 ? "#dc2626" : available <= 10 ? "#92400e" : "#16a34a",
                    padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "700"
                  }}>
                    {available === 0 ? "FULL" : available <= 10 ? "ALMOST FULL" : "OPEN"}
                  </span>
                </div>

                {/* Capacity Bar */}
                <div style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>Enrolled</span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: barColor }}>{course.enrolled} / {course.capacity}</span>
                  </div>
                  <div style={{ backgroundColor: "#e5e7eb", borderRadius: "6px", height: "10px" }}>
                    <div style={{ backgroundColor: barColor, height: "10px", borderRadius: "6px", width: `${Math.min(pct, 100)}%`, transition: "width 0.5s" }} />
                  </div>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: "4px 0 0", textAlign: "right" }}>{pct}% full</p>
                </div>

                {/* Stats Row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", borderTop: "1px solid #f3f4f6", paddingTop: "12px" }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontWeight: "700", fontSize: "16px", margin: "0 0 2px", color: "#16a34a" }}>{course.enrolled}</p>
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Enrolled</p>
                  </div>
                  <div style={{ textAlign: "center", borderLeft: "1px solid #f3f4f6", borderRight: "1px solid #f3f4f6" }}>
                    <p style={{ fontWeight: "700", fontSize: "16px", margin: "0 0 2px", color: "#f59e0b" }}>{course.waitlist}</p>
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Waitlist</p>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontWeight: "700", fontSize: "16px", margin: "0 0 2px", color: "#2563eb" }}>{available}</p>
                    <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>Available</p>
                  </div>
                </div>

                {/* Pass Rate */}
                {course.totalAssessed > 0 && (
                  <div style={{ marginTop: "10px", backgroundColor: "#f8fafc", borderRadius: "8px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>Pass Rate</span>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: passRate >= 50 ? "#16a34a" : "#dc2626" }}>
                      {passRate}% ({course.passedCount}/{course.totalAssessed})
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Table View */}
      <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontWeight: "700", fontSize: "16px", margin: "0 0 16px" }}>📋 Course Summary Table</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              {["Course", "Enrolled", "Waitlist", "Available", "Capacity", "Pass Rate", "Status"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", color: "#6b7280", fontWeight: "600" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((course, i) => {
              const available = course.capacity - course.enrolled
              const pct = Math.round((course.enrolled / course.capacity) * 100)
              const passRate = course.totalAssessed > 0 ? Math.round((course.passedCount / course.totalAssessed) * 100) : 0
              return (
                <tr key={course.id} style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: i % 2 === 0 ? "white" : "#f9fafb" }}>
                  <td style={{ padding: "12px", fontWeight: "500" }}>
                    {courseIcons[course.course_name] || "📚"} {course.course_name}
                  </td>
                  <td style={{ padding: "12px", fontWeight: "700", color: "#16a34a" }}>{course.enrolled}</td>
                  <td style={{ padding: "12px", color: "#f59e0b", fontWeight: "600" }}>{course.waitlist}</td>
                  <td style={{ padding: "12px", fontWeight: "600", color: available === 0 ? "#dc2626" : "#2563eb" }}>{available}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{course.capacity}</td>
                  <td style={{ padding: "12px" }}>
                    {course.totalAssessed > 0
                      ? <span style={{ fontWeight: "600", color: passRate >= 50 ? "#16a34a" : "#dc2626" }}>{passRate}%</span>
                      : <span style={{ color: "#9ca3af" }}>N/A</span>
                    }
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{
                      backgroundColor: available === 0 ? "#fef2f2" : pct >= 60 ? "#fef3c7" : "#f0fdf4",
                      color: available === 0 ? "#dc2626" : pct >= 60 ? "#92400e" : "#16a34a",
                      padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600"
                    }}>
                      {available === 0 ? "Full" : pct >= 60 ? "Filling Up" : "Open"}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
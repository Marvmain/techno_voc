import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

interface OverviewStats {
  totalStudents: number
  totalAssessments: number
  qualified: number
  passingRate: number
  mostTakenCourse: string
  mostTakenCount: number
  totalEnrolled: number
  totalWaitlist: number
  courseBreakdown: { course_name: string; count: number; enrolled: number; passRate: number }[]
}

export default function OverviewTab() {
  const [stats, setStats] = useState<OverviewStats>({
    totalStudents: 0,
    totalAssessments: 0,
    qualified: 0,
    passingRate: 0,
    mostTakenCourse: "—",
    mostTakenCount: 0,
    totalEnrolled: 0,
    totalWaitlist: 0,
    courseBreakdown: [],
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>("")

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    setLoading(true)

    // Total students
    const { count: totalStudents } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })

    // Total assessments taken
    const { count: totalAssessments } = await supabase
      .from("assessments")
      .select("*", { count: "exact", head: true })

    // Qualified students (passed at least one course)
    const { count: qualified } = await supabase
      .from("assessments")
      .select("*", { count: "exact", head: true })
      .eq("passed", true)

    // Passing rate
    const passingRate = totalAssessments && totalAssessments > 0
      ? Math.round(((qualified || 0) / totalAssessments) * 100)
      : 0

    // Total enrolled (included in rankings)
    const { count: totalEnrolled } = await supabase
      .from("rankings")
      .select("*", { count: "exact", head: true })
      .eq("status", "included")

    // Total waitlist
    const { count: totalWaitlist } = await supabase
      .from("rankings")
      .select("*", { count: "exact", head: true })
      .eq("status", "waitlist")

    // Course breakdown — assessments per course
    const { data: courseData } = await supabase
      .from("assessments")
      .select("course_id, passed, courses(course_name)")

    // Build course breakdown
    const courseMap: Record<string, { course_name: string; count: number; passed: number }> = {}
    courseData?.forEach((a: any) => {
      const name = a.courses?.course_name || "Unknown"
      if (!courseMap[name]) courseMap[name] = { course_name: name, count: 0, passed: 0 }
      courseMap[name].count += 1
      if (a.passed) courseMap[name].passed += 1
    })

    // Enrolled per course
    const { data: rankData } = await supabase
      .from("rankings")
      .select("course_id, status, courses(course_name)")

    const enrolledMap: Record<string, number> = {}
    rankData?.forEach((r: any) => {
      const name = r.courses?.course_name || "Unknown"
      if (r.status === "included") enrolledMap[name] = (enrolledMap[name] || 0) + 1
    })

    const courseBreakdown = Object.values(courseMap)
      .map(c => ({
        course_name: c.course_name,
        count: c.count,
        enrolled: enrolledMap[c.course_name] || 0,
        passRate: c.count > 0 ? Math.round((c.passed / c.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    const mostTaken = courseBreakdown[0]

    setStats({
      totalStudents: totalStudents || 0,
      totalAssessments: totalAssessments || 0,
      qualified: qualified || 0,
      passingRate,
      mostTakenCourse: mostTaken?.course_name || "—",
      mostTakenCount: mostTaken?.count || 0,
      totalEnrolled: totalEnrolled || 0,
      totalWaitlist: totalWaitlist || 0,
      courseBreakdown,
    })

    setLastUpdated(new Date().toLocaleTimeString())
    setLoading(false)
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
          <h2 style={{ fontWeight: "700", fontSize: "22px", margin: "0 0 4px" }}>Dashboard Overview</h2>
          <p style={{ color: "#6b7280", margin: 0, fontSize: "13px" }}>
            {lastUpdated ? `Last updated: ${lastUpdated}` : "Loading live data..."}
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          style={{ padding: "10px 16px", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
        >
          {loading ? "⏳ Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {/* Main Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Students", value: stats.totalStudents, icon: "👥", color: "#2563eb", bg: "#eff6ff", sub: "registered students" },
          { label: "Qualified", value: stats.qualified, icon: "✅", color: "#16a34a", bg: "#f0fdf4", sub: "passed at least one course" },
          { label: "Passing Rate", value: `${stats.passingRate}%`, icon: "📈", color: "#7c3aed", bg: "#f5f3ff", sub: "overall pass rate" },
          { label: "Most Taken", value: stats.mostTakenCourse, icon: "🏆", color: "#d97706", bg: "#fffbeb", sub: `${stats.mostTakenCount} assessments` },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: stat.bg, borderRadius: "14px", padding: "20px", border: `1px solid ${stat.color}22` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <p style={{ color: "#6b7280", fontSize: "13px", margin: 0, fontWeight: "600" }}>{stat.label}</p>
              <span style={{ fontSize: "22px" }}>{stat.icon}</span>
            </div>
            <h2 style={{ color: stat.color, fontSize: stat.label === "Most Taken" ? "18px" : "30px", margin: "0 0 4px", fontWeight: "800", lineHeight: 1.1 }}>
              {loading ? "—" : stat.value}
            </h2>
            <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
        {[
          { label: "Total Assessments Taken", value: stats.totalAssessments, icon: "📋", color: "#0891b2" },
          { label: "Total Enrolled (Included)", value: stats.totalEnrolled, icon: "🎓", color: "#16a34a" },
          { label: "On Waitlist", value: stats.totalWaitlist, icon: "⏳", color: "#f59e0b" },
        ].map(stat => (
          <div key={stat.label} style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: `${stat.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 4px" }}>{stat.label}</p>
              <h3 style={{ color: stat.color, fontSize: "24px", margin: 0, fontWeight: "800" }}>
                {loading ? "—" : stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Course Breakdown */}
      <div style={{ backgroundColor: "white", borderRadius: "14px", padding: "24px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
        <h3 style={{ fontWeight: "700", fontSize: "16px", margin: "0 0 4px" }}>📊 Course Assessment Breakdown</h3>
        <p style={{ color: "#6b7280", fontSize: "13px", margin: "0 0 20px" }}>Number of students who took assessment per course</p>

        {loading ? (
          <p style={{ textAlign: "center", color: "#9ca3af", padding: "32px 0" }}>Loading data...</p>
        ) : stats.courseBreakdown.length === 0 ? (
          <p style={{ textAlign: "center", color: "#9ca3af", padding: "32px 0" }}>No assessment data yet. Students will appear here after taking the assessment.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {stats.courseBreakdown.map((c, i) => {
              const maxCount = stats.courseBreakdown[0]?.count || 1
              const barWidth = Math.round((c.count / maxCount) * 100)
              return (
                <div key={c.course_name} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "28px", textAlign: "right", color: "#9ca3af", fontSize: "13px", fontWeight: "600", flexShrink: 0 }}>
                    #{i + 1}
                  </div>
                  <div style={{ width: "28px", fontSize: "16px", flexShrink: 0 }}>
                    {courseIcons[c.course_name] || "📚"}
                  </div>
                  <div style={{ width: "120px", fontSize: "13px", fontWeight: "600", flexShrink: 0 }}>
                    {c.course_name}
                  </div>
                  <div style={{ flex: 1, backgroundColor: "#f3f4f6", borderRadius: "6px", height: "10px" }}>
                    <div style={{
                      backgroundColor: i === 0 ? "#2563eb" : i === 1 ? "#7c3aed" : i === 2 ? "#16a34a" : "#94a3b8",
                      height: "10px", borderRadius: "6px",
                      width: `${barWidth}%`,
                      transition: "width 0.6s"
                    }} />
                  </div>
                  <div style={{ display: "flex", gap: "12px", flexShrink: 0, fontSize: "12px" }}>
                    <span style={{ fontWeight: "700", color: "#374151", minWidth: "60px" }}>{c.count} students</span>
                    <span style={{ color: "#16a34a", fontWeight: "600", minWidth: "50px" }}>{c.enrolled} enrolled</span>
                    <span style={{
                      backgroundColor: c.passRate >= 50 ? "#dcfce7" : "#fef2f2",
                      color: c.passRate >= 50 ? "#16a34a" : "#dc2626",
                      padding: "2px 8px", borderRadius: "20px", fontWeight: "600"
                    }}>
                      {c.passRate}% pass
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Summary */}
      <div style={{ backgroundColor: "#f8fafc", borderRadius: "14px", padding: "20px", border: "1px solid #e2e8f0" }}>
        <h3 style={{ fontWeight: "700", fontSize: "15px", margin: "0 0 14px", color: "#374151" }}>📝 Quick Summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            { label: "Students registered", value: stats.totalStudents },
            { label: "Assessment attempts", value: stats.totalAssessments },
            { label: "Students who passed at least one course", value: stats.qualified },
            { label: "Overall passing rate", value: `${stats.passingRate}%` },
            { label: "Students currently enrolled", value: stats.totalEnrolled },
            { label: "Students on waitlist", value: stats.totalWaitlist },
            { label: "Most popular course", value: stats.mostTakenCourse },
            { label: "Courses available", value: 11 },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", backgroundColor: "white", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
              <span style={{ color: "#6b7280", fontSize: "13px" }}>{item.label}</span>
              <span style={{ fontWeight: "700", fontSize: "13px", color: "#111827" }}>{loading ? "—" : item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

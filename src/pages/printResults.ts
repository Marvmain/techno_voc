// printResults.ts
// Call this function to open a print-ready PDF window for a student's results

interface AssessmentRow {
  course_name: string
  score: number
  total_items: number
  passed: boolean
}

interface RankingRow {
  course_name: string
  score: number
  rank: number
  status: string
}

interface PrintResultsOptions {
  studentName: string
  studentLRN: string
  schoolYear: string
  takenAt: string
  totalScore: number
  totalItems: number
  overallPercent: number
  passed: boolean
  top3: { course_name: string; score: number; status: string }[]
  assessments: AssessmentRow[]
  rankings: RankingRow[]
}

export function printStudentResults(opts: PrintResultsOptions) {
  const {
    studentName, studentLRN, schoolYear, takenAt,
    totalScore, totalItems, overallPercent, passed,
    top3, assessments, rankings
  } = opts

  const top3Rows = top3.map((r, i) => `
    <tr>
      <td>${i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} #${i + 1}</td>
      <td><strong>${r.course_name}</strong></td>
      <td>${r.score} pts</td>
      <td class="${r.status === 'included' ? 'badge-green' : 'badge-yellow'}">
        ${r.status === 'included' ? 'Included' : 'Waitlist'}
      </td>
    </tr>
  `).join("")

  const rankingRows = rankings.map((r) => `
    <tr>
      <td>${r.rank === 1 ? "🥇 #1" : r.rank === 2 ? "🥈 #2" : r.rank === 3 ? "🥉 #3" : "#" + r.rank}</td>
      <td>${r.course_name}</td>
      <td><strong>${r.score}</strong></td>
      <td class="${r.status === 'included' ? 'badge-green' : 'badge-yellow'}">
        ${r.status === 'included' ? 'Included' : 'Waitlist'}
      </td>
    </tr>
  `).join("")

  const assessmentRows = assessments.map((a, i) => {
    const pct = Math.round((a.score / a.total_items) * 100)
    return `
      <tr>
        <td>${i + 1}</td>
        <td>${a.course_name}</td>
        <td><strong>${a.score}</strong></td>
        <td>${a.total_items}</td>
        <td>${pct}%</td>
        <td class="${a.passed ? 'badge-green' : 'badge-red'}">${a.passed ? 'Passed' : 'Failed'}</td>
      </tr>
    `
  }).join("")

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>TECHNO-VOC Results — ${studentName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: white; padding: 32px; }

    /* Header */
    .header { text-align: center; border-bottom: 3px solid #111827; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 26px; font-weight: 900; letter-spacing: 2px; margin-bottom: 4px; }
    .header p { font-size: 13px; color: #444; margin: 2px 0; }

    /* Student Info */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 20px; background: #f8fafc; padding: 14px 18px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .info-item { display: flex; justify-content: space-between; }
    .info-label { color: #555; font-size: 12px; }
    .info-value { font-weight: 700; font-size: 13px; }

    /* Score Banner */
    .score-banner { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-radius: 10px; margin-bottom: 20px; border: 2px solid ${passed ? '#16a34a' : '#dc2626'}; background: ${passed ? '#f0fdf4' : '#fef2f2'}; }
    .score-banner h2 { font-size: 18px; color: ${passed ? '#15803d' : '#dc2626'}; }
    .score-banner p { font-size: 12px; color: #555; margin-top: 4px; }
    .score-boxes { display: flex; gap: 12px; }
    .score-box { text-align: center; background: white; border-radius: 8px; padding: 10px 16px; min-width: 70px; }
    .score-box .num { font-size: 22px; font-weight: 900; color: ${passed ? '#16a34a' : '#dc2626'}; }
    .score-box .lbl { font-size: 10px; color: #888; }

    /* Section */
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; font-weight: 800; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #111827; color: white; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: 700; }
    td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
    tr:nth-child(even) td { background: #f9fafb; }

    /* Badges */
    .badge-green  { color: #16a34a; font-weight: 700; }
    .badge-red    { color: #dc2626; font-weight: 700; }
    .badge-yellow { color: #92400e; font-weight: 700; }

    /* Footer */
    .footer { margin-top: 32px; border-top: 2px solid #e5e7eb; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-sig { text-align: center; flex: 1; }
    .footer-sig .sig-line { border-top: 1px solid #111; width: 180px; margin: 40px auto 4px; }
    .footer-sig p { font-size: 11px; color: #555; }
    .footer-note { font-size: 10px; color: #aaa; text-align: right; }

    @media print {
      body { padding: 16px; }
      @page { margin: 12mm; size: A4; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <h1>TECHNO-VOC</h1>
    <p>Technical-Vocational Assessment Results</p>
    <p> Northern Antique Vocational School — NAVS</p>
  </div>

  <!-- Student Info -->
  <div class="info-grid">
    <div class="info-item"><span class="info-label">Student Name</span><span class="info-value">${studentName}</span></div>
    <div class="info-item"><span class="info-label">Student LRN</span><span class="info-value">${studentLRN}</span></div>
    <div class="info-item"><span class="info-label">School Year</span><span class="info-value">${schoolYear}</span></div>
    <div class="info-item"><span class="info-label">Date Taken</span><span class="info-value">${takenAt}</span></div>
  </div>

  <!-- Score Banner -->
  <div class="score-banner">
    <div>
      <h2>${passed ? "✅ PASSED" : "❌ FAILED"}</h2>
      <p>${passed ? "Qualified for TVE strand enrollment." : "Did not meet the passing threshold."}</p>
    </div>
    <div class="score-boxes">
      <div class="score-box"><div class="num">${totalScore}</div><div class="lbl">Score</div></div>
      <div class="score-box"><div class="num">${totalItems}</div><div class="lbl">Total</div></div>
      <div class="score-box"><div class="num">${overallPercent}%</div><div class="lbl">Rate</div></div>
    </div>
  </div>

  <!-- Top 3 Recommendations -->
  <div class="section">
    <div class="section-title">🏆 Top 3 Course Recommendations</div>
    <table>
      <thead>
        <tr><th>Rank</th><th>Course</th><th>Score</th><th>Status</th></tr>
      </thead>
      <tbody>${top3Rows}</tbody>
    </table>
  </div>

  <!-- Score Breakdown -->
  <div class="section">
    <div class="section-title">📊 Score Breakdown by Course</div>
    <table>
      <thead>
        <tr><th>#</th><th>Course</th><th>Score</th><th>Total Items</th><th>Percentage</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${assessmentRows}
        <tr style="background:#111827; color:white;">
          <td colspan="2"><strong>OVERALL TOTAL</strong></td>
          <td><strong>${totalScore}</strong></td>
          <td><strong>${totalItems}</strong></td>
          <td><strong>${overallPercent}%</strong></td>
          <td style="color:${passed ? '#86efac' : '#fca5a5'}"><strong>${passed ? 'PASSED' : 'FAILED'}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Course Rankings -->
  <div class="section">
    <div class="section-title">🏅 Course Rankings</div>
    <table>
      <thead>
        <tr><th>Rank</th><th>Course</th><th>Score</th><th>Status</th></tr>
      </thead>
      <tbody>${rankingRows}</tbody>
    </table>
  </div>

  <!-- Footer / Signature -->
  <div class="footer">
    <div class="footer-sig">
      <div class="sig-line"></div>
      <p><strong>Guidance Counselor / TVE Coordinator</strong></p>
      <p>Signature over Printed Name</p>
    </div>
    <div class="footer-note">
      <p>Generated by TECHNO-VOC Assessment System</p>
      <p>${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
  </div>

</body>
</html>
  `

  // Open in new window and trigger print
  const win = window.open("", "_blank", "width=900,height=700")
  if (!win) { alert("Please allow popups to print your results."); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}
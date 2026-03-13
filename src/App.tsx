import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import StudentDashboard from './pages/StudentDashboard'

type UserSession =
  | { role: "admin"; name: string }
  | { role: "student"; id: string; name: string }
  | null

function App() {
  const [session, setSession] = useState<UserSession>(null)

  // ── Not logged in → Login Page ──
  if (!session) {
    return <LoginPage onLogin={setSession} />
  }

  // ── Admin logged in → Admin Dashboard ──
  if (session.role === "admin") {
    return (
      <AdminDashboard
        adminName={session.name}
        onLogout={() => setSession(null)}
      />
    )
  }

  // ── Student logged in → Student Dashboard ──
  return (
    <StudentDashboard
      studentId={session.id}
      studentName={session.name}
      onLogout={() => setSession(null)}
    />
  )
}

export default App
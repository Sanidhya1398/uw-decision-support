import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CaseQueue from './pages/CaseQueue'
import CaseDetail from './pages/CaseDetail'
import RulesAdmin from './components/admin/RulesAdmin'
import { useAuthStore } from './stores/authStore'

function App() {
  const { isAuthenticated, login } = useAuthStore()

  // Auto-login for demo purposes
  if (!isAuthenticated) {
    login({
      id: 'UW001',
      name: 'Demo Underwriter',
      role: 'senior_underwriter',
      email: 'demo@example.com',
    })
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="cases" element={<CaseQueue />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        <Route path="cases/:id/:tab" element={<CaseDetail />} />
        <Route path="admin/rules" element={<RulesAdmin />} />
      </Route>
    </Routes>
  )
}

export default App

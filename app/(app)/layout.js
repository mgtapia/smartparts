import AppShell from '@components/layout/AppShell'
import RequireAuth from '@components/layout/RequireAuth'

export default function AppGroupLayout({ children }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  )
}

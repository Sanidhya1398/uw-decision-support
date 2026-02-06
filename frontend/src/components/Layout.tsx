import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import {
  LayoutDashboard,
  FolderOpen,
  User,
  LogOut,
  Settings,
  Cog,
} from 'lucide-react'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Case Queue', href: '/cases', icon: FolderOpen },
  { name: 'Rules Admin', href: '/admin/rules', icon: Cog },
]

export default function Layout() {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-primary-900">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 bg-primary-950">
            <h1 className="text-lg font-semibold text-white">
              UW Workbench
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary-800 text-white'
                      : 'text-primary-200 hover:bg-primary-800 hover:text-white'
                  )
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-primary-800">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-primary-300 truncate capitalize">
                  {user?.role.replace(/_/g, ' ')}
                </p>
              </div>
              <button
                onClick={logout}
                className="ml-2 p-1 text-primary-300 hover:text-white"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div>
              {/* Breadcrumb will go here */}
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-500">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

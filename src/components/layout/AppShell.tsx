import { ChevronDown, Menu, Search, X, PlusCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { NAV_ITEMS, ROLE_LABEL } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { getSnapshot, globalSearch, subscribe } from '../../demo/store'
import { useSyncExternalStore } from 'react'
import { GovernmentTopBar, OfficialAicteHeader } from '../AicteBrand'

export function AppShell() {
  const { profile, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [q, setQ] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [adminDropdown, setAdminDropdown] = useState(false)
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const navigate = useNavigate()
  const location = useLocation()

  const results = useMemo(
    () => (profile && searchOpen ? globalSearch(q, profile) : null),
    [q, profile, searchOpen],
  )

  if (!profile) return null

  const items = NAV_ITEMS.filter((i) => i.roles.includes(profile.role))
  const mainNav = items.filter((i) => i.section !== 'Administration')
  const adminNav = items.filter((i) => i.section === 'Administration')

  const unread = snapshot.notifications.filter((n) => n.user_id === profile.id && !n.read).length
  const overlapCount = snapshot.links.filter((l) => !l.dismissed && l.relationship_type === 'CROSS_BUREAU_OVERLAP').length

  const bureau = snapshot.bureaus.find((b) => b.id === profile.bureau_id)
  const bureauCode = bureau ? bureau.code : profile.role === 'SUPER_ADMIN' ? 'Headquarters' : 'Regulation'

  return (
    <div className="min-h-screen bg-[#f4f7fb] flex flex-col font-sans text-[#1c2b3a]">
      {/* 1. Official Government of India Top Bar */}
      <GovernmentTopBar />

      {/* 2. Official AICTE Brand Masthead */}
      <OfficialAicteHeader
        officerName={profile.full_name}
        officerRole={ROLE_LABEL[profile.role]}
        officerBureau={bureauCode}
        onLogout={logout}
      />

      {/* 3. Official AICTE Navigation Bar (Deep Navy with Saffron Bottom Trim) */}
      <nav className="bg-[#003366] text-white sticky top-0 z-30 shadow-md border-b-4 border-[#ff9933]">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-white hover:bg-[#002244] rounded cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="hidden lg:flex items-center space-x-1">
            {mainNav.map((item) => {
              const isActive = location.pathname.startsWith(item.to)
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'px-3.5 py-3 text-[13px] font-bold tracking-wide uppercase transition flex items-center gap-1.5 border-b-2',
                    isActive
                      ? 'bg-[#002244] text-[#ffd580] border-[#ff9933]'
                      : 'text-white/90 hover:bg-[#002a54] hover:text-white border-transparent'
                  )}
                >
                  {item.label}
                  {item.to === '/overlap' && overlapCount > 0 ? (
                    <span className="bg-[#ff9933] text-[#002244] font-black text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                      {overlapCount}
                    </span>
                  ) : null}
                  {item.to === '/notifications' && unread > 0 ? (
                    <span className="bg-[#b91c1c] text-white font-black text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                      {unread}
                    </span>
                  ) : null}
                </NavLink>
              )
            })}

            {/* Admin Dropdown for Super Admin */}
            {adminNav.length > 0 ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAdminDropdown(!adminDropdown)}
                  onBlur={() => setTimeout(() => setAdminDropdown(false), 200)}
                  className={cn(
                    'px-3.5 py-3 text-[13px] font-bold tracking-wide uppercase transition flex items-center gap-1 border-b-2 cursor-pointer',
                    adminNav.some((a) => location.pathname.startsWith(a.to))
                      ? 'bg-[#002244] text-[#ffd580] border-[#ff9933]'
                      : 'text-white/90 hover:bg-[#002a54] hover:text-white border-transparent'
                  )}
                >
                  <span>Administration</span>
                  <ChevronDown size={14} className={adminDropdown ? 'rotate-180 transition' : 'transition'} />
                </button>
                {adminDropdown ? (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-[#cbd5e1] rounded-[3px] shadow-lg py-1 z-40 text-left">
                    {adminNav.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setAdminDropdown(false)}
                        className="block px-4 py-2 text-[13px] font-semibold text-[#003366] hover:bg-[#f1f5f9] transition"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Right Action: Register Case & Public Portal */}
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden md:flex items-center gap-1 text-[11px] font-bold text-white/90 hover:text-white bg-[#002244] px-2.5 py-1.5 rounded-[3px] border border-white/20 transition"
              title="Switch to Public Complaint Portal"
            >
              <span>Public Portal</span>
            </Link>
            <Link
              to="/complaints/new"
              className="bg-[#ff9933] hover:bg-[#e68a00] text-[#002244] font-bold text-[12px] px-3 py-1.5 rounded-[3px] transition flex items-center gap-1.5 shadow-xs uppercase tracking-wide cursor-pointer"
            >
              <PlusCircle size={15} />
              <span className="hidden sm:inline">Register Case</span>
            </Link>
          </div>
        </div>


        {/* Mobile Navigation Drawer */}
        {mobileOpen ? (
          <div className="lg:hidden bg-[#002244] border-t border-[#003366] px-4 py-3 space-y-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2 text-[13px] font-bold rounded-[3px] transition',
                    isActive ? 'bg-[#003366] text-[#ffd580]' : 'text-white/80 hover:bg-[#002a54] hover:text-white'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        ) : null}
      </nav>

      {/* 4. Sub-Navigation / Universal Search & Context Bar */}
      <div className="bg-white border-b border-[#cbd5e1] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] text-[#475569]">
            <span className="font-bold text-[#003366]">AICTE CaseSync</span>
            <span>/</span>
            <span className="font-medium text-[#64748b]">
              {ROLE_LABEL[profile.role]} Workspace ({bureauCode})
            </span>
          </div>

          {/* Universal Instant Search Bar */}
          <div className="relative w-full sm:w-96">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-[#64748b]" size={15} />
            <input
              className="w-full rounded-[3px] border border-[#cbd5e1] bg-[#f8fafc] py-1.5 pl-9 pr-3 text-[13px] text-[#003366] outline-none focus:border-[#003366] focus:bg-white transition"
              placeholder="Search Permanent ID, college name, case #, bureau..."
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
            />

            {/* Instant Search Results Dropdown */}
            {searchOpen && q.trim().length >= 2 && results ? (
              <div
                className="absolute right-0 top-full mt-1.5 w-full sm:w-[480px] rounded-[3px] border border-[#cbd5e1] bg-white p-3 shadow-xl z-50 text-left"
                onMouseLeave={() => setSearchOpen(false)}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-[#e2e8f0]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#003366]">Search Results</p>
                  <button onClick={() => setSearchOpen(false)} className="text-[#64748b] hover:text-[#003366] text-[11px]">Close</button>
                </div>

                <div className="mt-2 space-y-3 max-h-80 overflow-y-auto">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded">
                      Institutions ({results.institutions.length})
                    </p>
                    {results.institutions.length === 0 ? <p className="text-[12px] text-[#94a3b8] px-2 py-1">No matching institutions</p> : null}
                    {results.institutions.map((i) => (
                      <button
                        key={i.id}
                        type="button"
                        className="block w-full py-1.5 px-2 text-left text-[12px] hover:bg-[#eef4fa] rounded transition cursor-pointer"
                        onClick={() => {
                          navigate(`/institutions/${i.id}`)
                          setSearchOpen(false)
                          setQ('')
                        }}
                      >
                        <span className="font-bold text-[#003366]">{i.institution_name}</span>
                        <span className="block text-[11px] text-[#64748b] font-mono">{i.aicte_permanent_id} · {i.city}, {i.state}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded">
                      Cases ({results.cases.length})
                    </p>
                    {results.cases.length === 0 ? <p className="text-[12px] text-[#94a3b8] px-2 py-1">No matching cases</p> : null}
                    {results.cases.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="block w-full py-1.5 px-2 text-left text-[12px] hover:bg-[#eef4fa] rounded transition cursor-pointer"
                        onClick={() => {
                          navigate(`/complaints/${c.id}`)
                          setSearchOpen(false)
                          setQ('')
                        }}
                      >
                        <span className="font-bold text-[#003366] font-mono">{c.case_id}</span>
                        <span className="text-[#64748b] ml-1.5">· {c.subject}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 5. Main Work Area */}
      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        <Outlet />
      </main>

      {/* 6. Official AICTE Government Footer */}
      <footer className="bg-[#002244] text-white/80 border-t-4 border-[#ff9933] text-[12px] mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                AICTE Head Office
              </p>
              <p className="text-[12px] text-white/70 leading-relaxed">
                Nelson Mandela Marg, Vasant Kunj,<br />
                New Delhi - 110070<br />
                Phone: 011-26131576-78
              </p>
            </div>
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                Bureaus / Cells
              </p>
              <ul className="space-y-1 text-white/70 text-[12px]">
                <li>• Regulation Bureau (RB)</li>
                <li>• Public Grievance Redressal Cell (PGRC)</li>
                <li>• Approval Bureau</li>
                <li>• Regional Offices & Centers</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                Compliance & Security
              </p>
              <ul className="space-y-1 text-white/70 text-[12px]">
                <li>• Government of India IT Guidelines</li>
                <li>• Role-Based Access Security (RLS)</li>
                <li>• Immutable Audit Trails</li>
                <li>• Data Protection & Confidentiality</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white text-[13px] mb-2 uppercase tracking-wide">
                Administrative Mandate
              </p>
              <p className="text-[12px] text-white/70 leading-relaxed">
                AICTE Regulation Bureau<br />
                Integrated Complaint Monitoring & Status Dashboard<br />
                Ministry of Education, Government of India
              </p>
            </div>
          </div>

          <div className="border-t border-white/20 pt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/60">
            <p>© 2026 All India Council for Technical Education (AICTE). All Rights Reserved.</p>
            <p>Designed for AICTE Internal Administration · Government of India</p>
          </div>
        </div>
      </footer>
    </div>
  )
}


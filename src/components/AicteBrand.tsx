// Official AICTE and Government of India SVG Emblems and Brand Masthead

export function AicteLogo({ size = 56, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AICTE Official Emblem"
    >
      {/* Outer circular gear/sun rays */}
      <circle cx="50" cy="50" r="47" fill="#003366" stroke="#FF9933" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="42" fill="#FFFFFF" stroke="#003366" strokeWidth="1.5" />
      
      {/* Decorative gear teeth / laurel dots */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <circle
          key={deg}
          cx={50 + 44.5 * Math.cos((deg * Math.PI) / 180)}
          cy={50 + 44.5 * Math.sin((deg * Math.PI) / 180)}
          r="1.8"
          fill="#FF9933"
        />
      ))}

      {/* Circular text banner background */}
      <circle cx="50" cy="50" r="39" fill="#003366" />
      <circle cx="50" cy="50" r="29" fill="#F8FAFC" stroke="#FF9933" strokeWidth="1.2" />

      {/* Council text inside ring */}
      <path id="aicte-arc-top" d="M 22 50 A 28 28 0 0 1 78 50" fill="none" />
      <text fill="#FFFFFF" fontSize="6.5" fontWeight="bold" letterSpacing="0.8">
        <textPath href="#aicte-arc-top" startOffset="50%" textAnchor="middle">
          AICTE • अभाशशिप
        </textPath>
      </text>

      <path id="aicte-arc-bottom" d="M 78 50 A 28 28 0 0 1 22 50" fill="none" />
      <text fill="#FFD580" fontSize="5.2" fontWeight="600" letterSpacing="0.5">
        <textPath href="#aicte-arc-bottom" startOffset="50%" textAnchor="middle">
          योगः कर्मसु कौशलम्
        </textPath>
      </text>

      {/* Central Diya (Traditional Indian Lamp of Knowledge) */}
      {/* Lamp Base / Stand */}
      <path d="M 43 65 L 57 65 L 54 61 L 46 61 Z" fill="#003366" />
      <path d="M 47 61 L 53 61 L 52 56 L 48 56 Z" fill="#FF9933" />
      {/* Diya Bowl */}
      <path d="M 36 56 Q 50 63 64 56 Q 66 52 61 52 Q 50 54 39 52 Q 34 52 36 56 Z" fill="#003366" />
      <ellipse cx="50" cy="52" rx="11" ry="2.2" fill="#D97706" />
      {/* Wick */}
      <path d="M 49 52 Q 50 48 50 46" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round" />
      {/* Sacred Flame (Agni) */}
      <path
        d="M 50 32 C 55 38 56 42 53 47 C 51.5 49 48.5 49 47 47 C 44 42 45 38 50 32 Z"
        fill="#FF9933"
      />
      <path
        d="M 50 36 C 53 40 53.5 43 51.5 46 C 50.5 47 49.5 47 48.5 46 C 46.5 43 47 40 50 36 Z"
        fill="#FACC15"
      />
      <circle cx="50" cy="44" r="2" fill="#FFFFFF" />
    </svg>
  )
}

export function IndiaEmblem({ size = 44, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="National Emblem of India"
    >
      {/* Simplified Stylized Ashoka Lion Capital (National Emblem) */}
      <g fill="#003366">
        {/* Central Lion Head */}
        <ellipse cx="50" cy="22" rx="14" ry="16" />
        <path d="M 42 12 Q 50 7 58 12 Q 62 18 58 24 Q 50 28 42 24 Q 38 18 42 12 Z" fill="#B45309" />
        {/* Mane details */}
        <path d="M 37 26 Q 30 35 38 46 L 62 46 Q 70 35 63 26 Q 50 34 37 26 Z" />
        <circle cx="45" cy="20" r="1.5" fill="#FFFFFF" />
        <circle cx="55" cy="20" r="1.5" fill="#FFFFFF" />
        <path d="M 48 24 L 52 24 L 50 27 Z" fill="#FFFFFF" />
        <path d="M 46 29 Q 50 32 54 29" stroke="#FFFFFF" strokeWidth="1" fill="none" />

        {/* Left Lion Profile */}
        <path d="M 37 18 Q 24 16 22 26 Q 21 34 29 40 L 37 40 Q 33 28 37 18 Z" />
        <circle cx="27" cy="24" r="1.2" fill="#FFFFFF" />

        {/* Right Lion Profile */}
        <path d="M 63 18 Q 76 16 78 26 Q 79 34 71 40 L 63 40 Q 67 28 63 18 Z" />
        <circle cx="73" cy="24" r="1.2" fill="#FFFFFF" />

        {/* Base Platform / Abacus */}
        <rect x="20" y="47" width="60" height="13" rx="2" fill="#003366" />
        <rect x="22" y="49" width="56" height="9" rx="1" fill="#FFFFFF" />

        {/* Central Ashoka Chakra on Abacus */}
        <circle cx="50" cy="53.5" r="4" stroke="#003366" strokeWidth="0.8" fill="none" />
        <circle cx="50" cy="53.5" r="0.8" fill="#003366" />
        {/* Bull & Horse silhouettes */}
        <circle cx="33" cy="53.5" r="2.2" fill="#003366" />
        <circle cx="67" cy="53.5" r="2.2" fill="#003366" />

        {/* Lotus Base */}
        <path d="M 28 60 Q 50 70 72 60 L 68 66 Q 50 74 32 66 Z" fill="#003366" />
        <rect x="30" y="67" width="40" height="3" rx="1" fill="#003366" />

        {/* Satyameva Jayate (सत्यमेव जयते) */}
        <text
          x="50"
          y="80"
          fill="#003366"
          fontSize="7.5"
          fontWeight="bold"
          fontFamily="'Noto Sans Devanagari', 'Mangal', sans-serif"
          textAnchor="middle"
        >
          सत्यमेव जयते
        </text>
        <text
          x="50"
          y="89"
          fill="#475569"
          fontSize="4.8"
          fontWeight="600"
          letterSpacing="0.6"
          textAnchor="middle"
        >
          GOVERNMENT OF INDIA
        </text>
      </g>
    </svg>
  )
}

export function GovernmentTopBar() {
  return (
    <div className="bg-[#0b2847] text-white border-b border-[#1b3d63] text-[11px]">
      <div className="max-w-7xl mx-auto px-4 py-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ff9933]" />
            भारत सरकार | Government of India
          </span>
          <span className="hidden sm:inline text-white/40">|</span>
          <span className="hidden sm:inline text-white/80">
            शिक्षा मंत्रालय | Ministry of Education
          </span>
        </div>
        <div className="flex items-center gap-4 text-white/80">
          <a href="#main-content" className="hover:text-white transition">
            Skip to main content (मुख्य सामग्री)
          </a>
          <span className="text-white/30">|</span>
          <div className="flex items-center gap-1">
            <button className="px-1 text-[10px] hover:text-white border border-white/20 rounded">A-</button>
            <button className="px-1 text-[10px] hover:text-white border border-white/20 rounded font-semibold">A</button>
            <button className="px-1 text-[10px] hover:text-white border border-white/20 rounded font-bold">A+</button>
          </div>
          <span className="text-white/30">|</span>
          <span className="font-semibold text-[#ffd580]">English / हिन्दी</span>
        </div>
      </div>
    </div>
  )
}

export function OfficialAicteHeader({
  compact = false,
  officerName,
  officerRole,
  officerBureau,
  onLogout,
}: {
  compact?: boolean
  officerName?: string
  officerRole?: string
  officerBureau?: string
  onLogout?: () => void
}) {
  return (
    <header className="bg-white border-b border-[#cbd5e1] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: AICTE Logo + Bilingual Name */}
        <div className="flex items-center gap-3.5 min-w-0">
          <AicteLogo size={compact ? 48 : 64} className="shrink-0 drop-shadow-xs" />
          <div className="min-w-0">
            <h1 className="text-[17px] sm:text-[20px] font-bold text-[#003366] leading-tight font-serif tracking-tight">
              अखिल भारतीय तकनीकी शिक्षा परिषद
            </h1>
            <h2 className="text-[13px] sm:text-[15px] font-bold text-[#002244] tracking-wide uppercase font-sans">
              ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
            </h2>
            <p className="hidden md:block text-[11px] text-[#475569] font-medium leading-none mt-0.5">
              (A Statutory Body of the Government of India, Ministry of Education)
            </p>
          </div>
        </div>

        {/* Right: National Emblem + Logged In Officer Badge */}
        <div className="flex items-center gap-4 shrink-0">
          {officerName ? (
            <div className="hidden sm:flex flex-col items-end text-right border-r border-[#e2e8f0] pr-4">
              <span className="text-[12px] font-bold text-[#003366] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                {officerName}
              </span>
              <span className="text-[11px] font-semibold text-[#b45309]">
                {officerRole} {officerBureau ? `· ${officerBureau}` : ''}
              </span>
              <span className="text-[10px] text-[#64748b]">AICTE Internal Portal</span>
            </div>
          ) : null}

          <div className="hidden lg:flex items-center gap-2 pl-1 border-l border-[#e2e8f0]">
            <IndiaEmblem size={50} />
          </div>

          {onLogout ? (
            <button
              onClick={onLogout}
              className="bg-[#fff1f2] hover:bg-[#ffe4e6] text-[#b91c1c] border border-[#fecdd3] text-[12px] font-bold px-3 py-1.5 rounded-[3px] transition cursor-pointer"
            >
              Sign Out
            </button>
          ) : null}
        </div>
      </div>

      {/* Tricolor Government Border */}
      <div className="h-1 bg-gradient-to-r from-[#ff9933] via-white to-[#138808]" />
    </header>
  )
}

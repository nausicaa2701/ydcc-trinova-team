interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
  variant?: 'light' | 'dark' | 'auto'
}

export default function Logo({ size = 'md', showText = true, className = '', variant = 'auto' }: LogoProps) {
  const sizes = {
    sm: { icon: 'size-8', text: 'text-sm', subtitle: 'text-[8px]' },
    md: { icon: 'size-10', text: 'text-lg', subtitle: 'text-[10px]' },
    lg: { icon: 'size-14', text: 'text-2xl', subtitle: 'text-xs' }
  }

  const textColors = {
    light: 'text-slate-900',
    dark: 'text-white',
    auto: 'text-slate-900 dark:text-white'
  }

  const subtitleColors = {
    light: 'text-primary',
    dark: 'text-emerald-400',
    auto: 'text-primary dark:text-emerald-400'
  }

  const s = sizes[size]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon */}
      <div className={`${s.icon} rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden`}>
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full">
          {/* Background Circle */}
          <circle cx="100" cy="100" r="100" fill="url(#logoGrad)" />

          {/* Water/River Waves representing Mekong */}
          <path d="M25 115 Q50 95 75 115 T125 115 T175 115" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6"/>
          <path d="M25 135 Q50 115 75 135 T125 135 T175 135" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.4"/>
          <path d="M25 155 Q50 135 75 155 T125 155 T175 155" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.25"/>

          {/* Cooperative People/Hands Symbol */}
          <g transform="translate(100, 65)">
            {/* Center leaf/sprout representing agriculture */}
            <path d="M0 30 Q-10 12 0 -20 Q10 12 0 30" fill="white" opacity="0.95"/>
            <path d="M0 -5 Q-25 -12 -30 -38 Q-5 -25 0 -5" fill="white" opacity="0.85"/>
            <path d="M0 -5 Q25 -12 30 -38 Q5 -25 0 -5" fill="white" opacity="0.85"/>

            {/* Three people/dots representing cooperation */}
            <circle cx="-42" cy="5" r="12" fill="white" opacity="0.9"/>
            <circle cx="42" cy="5" r="12" fill="white" opacity="0.9"/>
            <circle cx="0" cy="-50" r="12" fill="white" opacity="0.9"/>

            {/* Connecting lines for cooperation */}
            <path d="M-30 5 Q0 -12 30 5" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7"/>
            <path d="M-35 0 Q-18 -30 0 -38" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7"/>
            <path d="M35 0 Q18 -30 0 -38" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7"/>
          </g>

          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#10B981', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#059669', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#047857', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div>
          <h2 className={`${textColors[variant]} ${s.text} font-bold leading-none tracking-tight`}>
            iCoop Mekong
          </h2>
          <span className={`${s.subtitle} font-bold uppercase tracking-widest ${subtitleColors[variant]}`}>
            Giám sát xâm nhập mặn
          </span>
        </div>
      )}
    </div>
  )
}

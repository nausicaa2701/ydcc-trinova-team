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
        <img src="/favicon.svg" alt="Logo" className="w-full h-full" />
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

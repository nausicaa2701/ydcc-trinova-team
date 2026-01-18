import { useNavigate } from 'react-router-dom'
import LanguageSwitcher from './LanguageSwitcher'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LandingPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-primary">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            </div>
            <div>
              <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-none tracking-tight">
                {t('header.appName')}
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
                {t('header.appSubtitle')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-bold shadow-md hover:bg-primary/90 transition-all"
            >
              {t('common.login')}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative w-full pt-10 lg:pt-20 pb-16 px-4 lg:px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6 text-left order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              {t('landing.disasterWarning')}
            </div>
            <h1 className="text-slate-900 dark:text-white text-4xl lg:text-6xl font-black leading-tight tracking-tight">
              {(() => {
                const title = t('landing.heroTitle', { highlight: t('landing.heroHighlight') })
                const parts = title.split(t('landing.heroHighlight'))
                return (
                  <>
                    {parts[0]}
                    <span className="text-primary italic">{t('landing.heroHighlight')}</span>
                    {parts[1]}
                  </>
                )
              })()}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg lg:text-xl font-medium leading-relaxed max-w-[540px]">
              {t('landing.heroDescription')}
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <button
                onClick={() => {
                  document.getElementById('step-1')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="flex h-14 items-center justify-center rounded-xl px-8 bg-primary text-white text-base font-bold shadow-xl shadow-primary/25 hover:translate-y-[-2px] transition-all"
              >
                {t('landing.startJourney')}
              </button>
              <button
                onClick={() => navigate('/login')}
                className="flex h-14 items-center justify-center rounded-xl px-8 bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 text-base font-bold hover:bg-slate-50 transition-all"
              >
                {t('landing.loginNow')}
              </button>
            </div>
          </div>
          <div className="relative order-1 lg:order-2">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3] group">
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/10 flex items-center justify-center">
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-xl flex items-center gap-4 border border-white/30 dark:border-slate-700">
                  <div className="size-12 rounded-lg bg-red-500 flex items-center justify-center text-white">
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {t('landing.emergencyStatus')}
                    </p>
                    <p className="text-slate-900 dark:text-white font-bold">
                      {t('landing.forecastBoundary')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-6 -right-6 size-32 bg-primary/20 rounded-full blur-3xl -z-10"></div>
            <div className="absolute -bottom-6 -left-6 size-48 bg-blue-500/20 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>
      </section>

      {/* Step 1 */}
      <section className="relative px-4 lg:px-10 py-24 bg-white dark:bg-slate-900/50" id="step-1">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center gap-4 mb-16 relative">
            <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg mb-2 shadow-lg shadow-primary/30 relative after:content-[''] after:absolute after:left-1/2 after:top-full after:w-0.5 after:h-10 after:bg-slate-300 after:-translate-x-1/2">
              1
            </div>
            <h2 className="text-primary text-sm font-bold uppercase tracking-[0.2em]">
              {t('landing.step1Title')}
            </h2>
            <h3 className="text-slate-900 dark:text-white text-3xl lg:text-4xl font-black leading-tight">
              {t('landing.step1Heading')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-[700px]">
              {t('landing.step1Description')}
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 relative">
              <div className="rounded-2xl border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden aspect-video relative group bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <h4 className="font-bold text-slate-900 dark:text-white mb-4">{t('landing.forecastBoundaryLegend')}</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="size-3 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium">{t('landing.boundary4ppm')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="size-3 rounded-full bg-amber-500"></div>
                    <span className="text-sm font-medium">{t('landing.boundary1ppm')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="size-3 rounded-full bg-primary"></div>
                    <span className="text-sm font-medium">{t('landing.safeZone')}</span>
                  </div>
                </div>
              </div>
              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                <h4 className="font-bold text-primary mb-2">{t('landing.riskScore')}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {t('landing.riskScoreDescription')}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl text-center">
                    <div className="text-xl font-black text-red-500">7-30</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">{t('landing.forecastDays')}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl text-center">
                    <div className="text-xl font-black text-primary">0-100</div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">{t('landing.riskScore')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="px-4 lg:px-10 py-24 bg-slate-50 dark:bg-slate-900" id="step-2">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center gap-4 mb-16 relative">
            <div className="size-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg mb-2 shadow-lg shadow-blue-500/30 relative after:content-[''] after:absolute after:left-1/2 after:top-full after:w-0.5 after:h-10 after:bg-slate-300 after:-translate-x-1/2">
              2
            </div>
            <h2 className="text-blue-500 text-sm font-bold uppercase tracking-[0.2em]">
              {t('landing.step2Title')}
            </h2>
            <h3 className="text-slate-900 dark:text-white text-3xl lg:text-4xl font-black leading-tight">
              {t('landing.step2Heading')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-[700px]">
              {t('landing.step2Description')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group">
              <div className="size-14 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-3">{t('landing.farmManagement')}</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {t('landing.farmManagementDescription')}
              </p>
              <ul className="space-y-3">
                <li className="text-sm">
                  <span>{t('landing.farmFeature1')}</span>
                </li>
                <li className="text-sm">
                  <span>{t('landing.farmFeature2')}</span>
                </li>
              </ul>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group border-t-4 border-t-primary">
              <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-3">{t('landing.coopManagement')}</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {t('landing.coopManagementDescription')}
              </p>
              <ul className="space-y-3">
                <li className="text-sm">
                  <span>{t('landing.coopFeature1')}</span>
                </li>
                <li className="text-sm">
                  <span>{t('landing.coopFeature2')}</span>
                </li>
              </ul>
            </div>
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all group">
              <div className="size-14 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-3">{t('landing.frontendVisualization')}</h4>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {t('landing.frontendVisualizationDescription')}
              </p>
              <ul className="space-y-3">
                <li className="text-sm">
                  <span>{t('landing.frontendFeature1')}</span>
                </li>
                <li className="text-sm">
                  <span>{t('landing.frontendFeature2')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3 - CTA Section */}
      <section className="px-4 lg:px-10 py-24">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-[2.5rem] p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 size-96 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 size-96 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col items-center gap-8">
            <div className="size-10 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-lg mb-2">
              3
            </div>
            <h2 className="text-white text-3xl lg:text-5xl font-black leading-tight max-w-[700px]">
              {t('landing.ctaTitle')}
            </h2>
            <p className="text-slate-400 text-lg max-w-[600px]">
              {t('landing.ctaDescription')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <button
                onClick={() => navigate('/login')}
                className="bg-primary text-white px-12 py-5 rounded-2xl font-black text-lg hover:scale-105 transition-transform shadow-xl shadow-primary/20"
              >
                {t('landing.loginNow')}
              </button>
              <button className="bg-white/10 text-white border border-white/20 backdrop-blur-sm px-12 py-5 rounded-2xl font-black text-lg hover:bg-white/20 transition-all">
                {t('landing.contactConsultation')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 lg:px-10 py-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 text-primary opacity-60">
            <div className="size-6 bg-primary rounded flex items-center justify-center text-white">
            </div>
            <span className="text-slate-900 dark:text-white font-bold text-sm">
              {t('landing.footerCopyright')}
            </span>
          </div>
          <div className="flex gap-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <a className="hover:text-primary transition-colors cursor-pointer">{t('landing.footerProcess')}</a>
            <a className="hover:text-primary transition-colors cursor-pointer">{t('landing.footerData')}</a>
            <a className="hover:text-primary transition-colors cursor-pointer">{t('landing.footerSecurity')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}


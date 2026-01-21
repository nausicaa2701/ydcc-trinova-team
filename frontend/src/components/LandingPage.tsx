import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LanguageSwitcher from './LanguageSwitcher'
import Logo from './Logo'
import { useLanguage } from '@/contexts/LanguageContext'
import heroIllustration from '@/assets/images/hero-illustration.svg'
import aiPrediction from '@/assets/images/ai-prediction.svg'

export default function LandingPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [isYearly, setIsYearly] = useState(false)

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="md" />
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
              <img
                src={heroIllustration}
                alt="iCoop Mekong Dashboard"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-4 rounded-xl flex items-center gap-4 border border-white/30 dark:border-slate-700">
                  <div className="size-12 rounded-lg bg-red-500 flex items-center justify-center text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
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
              <div className="rounded-2xl border-4 border-white dark:border-slate-800 shadow-2xl overflow-hidden aspect-video relative group bg-slate-900">
                <img
                  src={aiPrediction}
                  alt="AI Prediction Chart"
                  className="w-full h-full object-contain p-2"
                />
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
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
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
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
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
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
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

      {/* Pricing Section */}
      <section className="px-4 lg:px-10 py-24 bg-white dark:bg-slate-900/50" id="pricing">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col items-center text-center gap-4 mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
              {t('landing.pricingTitle')}
            </div>
            <h2 className="text-slate-900 dark:text-white text-3xl lg:text-4xl font-black leading-tight">
              {t('landing.pricingSubtitle')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-[600px]">
              {t('landing.pricingDescription')}
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center gap-4 mt-6 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  !isYearly
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                {t('landing.monthly')}
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  isYearly
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                {t('landing.yearly')}
                <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">
                  {t('landing.yearlyDiscount')}
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Free Plan */}
            <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                  {t('landing.planFree')}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {t('landing.planFreeDesc')}
                </p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    {t('landing.planFreePrice')}
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">₫</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    {isYearly ? t('landing.perYear') : t('landing.perMonth')}
                  </span>
                </div>
                <p className="text-xs text-primary font-bold mt-2 uppercase tracking-wider">
                  {t('landing.free')}
                </p>
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planFreeFeature1')}
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planFreeFeature2')}
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planFreeFeature3')}
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planFreeFeature4')}
                </li>
              </ul>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                {t('landing.getStarted')}
              </button>
            </div>

            {/* Cooperative Plan - Popular */}
            <div className="bg-primary p-8 rounded-3xl relative flex flex-col transform md:scale-105 shadow-2xl shadow-primary/30">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-400 text-amber-900 text-xs font-black uppercase tracking-wider rounded-full">
                {t('landing.popular')}
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-black text-white mb-2">
                  {t('landing.planCoop')}
                </h3>
                <p className="text-white/70 text-sm">
                  {t('landing.planCoopDesc')}
                </p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    {isYearly ? t('landing.planCoopPriceYearly') : t('landing.planCoopPrice')}
                  </span>
                  <span className="text-lg font-bold text-white">₫</span>
                  <span className="text-white/70 text-sm">
                    {isYearly ? t('landing.perYear') : t('landing.perMonth')}
                  </span>
                </div>
                {isYearly && (
                  <p className="text-xs text-white/80 mt-2">
                    ≈ {t('landing.planCoopPrice')}₫{t('landing.perMonth')}
                  </p>
                )}
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start gap-3 text-sm text-white/90">
                  <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planCoopFeature1')}
                </li>
                <li className="flex items-start gap-3 text-sm text-white/90">
                  <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planCoopFeature2')}
                </li>
                <li className="flex items-start gap-3 text-sm text-white/90">
                  <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planCoopFeature3')}
                </li>
                <li className="flex items-start gap-3 text-sm text-white/90">
                  <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planCoopFeature4')}
                </li>
                <li className="flex items-start gap-3 text-sm text-white/90">
                  <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planCoopFeature5')}
                </li>
                <li className="flex items-start gap-3 text-sm text-white/90">
                  <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planCoopFeature6')}
                </li>
                <li className="flex items-start gap-3 text-sm text-white/90">
                  <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planCoopFeature7')}
                </li>
              </ul>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 rounded-xl bg-white text-primary font-bold hover:bg-slate-100 transition-all shadow-lg"
              >
                {t('landing.getStarted')}
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                  {t('landing.planEnterprise')}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {t('landing.planEnterpriseDesc')}
                </p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    {isYearly ? t('landing.planEnterprisePriceYearly') : t('landing.planEnterprisePrice')}
                  </span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">₫</span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                    {isYearly ? t('landing.perYear') : t('landing.perMonth')}
                  </span>
                </div>
                {isYearly && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    ≈ {t('landing.planEnterprisePrice')}₫{t('landing.perMonth')}
                  </p>
                )}
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planEnterpriseFeature1')}
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planEnterpriseFeature2')}
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planEnterpriseFeature3')}
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planEnterpriseFeature4')}
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planEnterpriseFeature5')}
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planEnterpriseFeature6')}
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planEnterpriseFeature7')}
                </li>
                <li className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planEnterpriseFeature8')}
                </li>
              </ul>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-all"
              >
                {t('landing.contactSales')}
              </button>
            </div>
          </div>

          {/* VAT Note & Guarantee */}
          <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8 text-center">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('landing.vatNote')}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>
                <strong className="text-slate-700 dark:text-slate-300">{t('landing.guaranteeTitle')}</strong>
                {' - '}{t('landing.guaranteeDesc')}
              </span>
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
          <div className="flex items-center gap-4 opacity-80">
            <Logo size="sm" showText={false} />
            <span className="text-slate-600 dark:text-slate-400 font-medium text-sm">
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


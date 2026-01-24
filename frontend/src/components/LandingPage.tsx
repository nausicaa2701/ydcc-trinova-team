import { useNavigate } from 'react-router-dom'
import { Card } from 'primereact/card'
import { Button } from 'primereact/button'
import { Badge } from 'primereact/badge'
import LanguageSwitcher from './LanguageSwitcher'
import Logo from './Logo'
import { useLanguage } from '@/contexts/LanguageContext'
import heroIllustration from '@/assets/images/hero-illustration.svg'
import aiPrediction from '@/assets/images/ai-prediction.svg'
import { Shield, Leaf, ChartLine } from '@phosphor-icons/react'

export default function LandingPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className="w-full min-h-screen bg-gray-50 text-gray-900 transition-colors overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-md border-b border-gray-200 px-4 lg:px-10 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="md" variant="light" />
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button
              label={t('common.login')}
              onClick={() => navigate('/login')}
              className="p-button-primary"
            />
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
            <h1 className="text-gray-900 text-4xl lg:text-6xl font-black leading-tight tracking-tight">
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
            <p className="text-gray-600 text-lg lg:text-xl font-medium leading-relaxed max-w-[540px]">
              {t('landing.heroDescription')}
            </p>
            <div className="flex flex-wrap gap-4 mt-4">
              <Button
                label={t('landing.startJourney')}
                onClick={() => {
                  document.getElementById('step-1')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="p-button-primary p-button-lg"
              />
              <Button
                label={t('landing.loginNow')}
                onClick={() => navigate('/login')}
                className="p-button-outlined p-button-lg"
              />
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
                <Card className="bg-white/90 backdrop-blur-sm border border-white/30">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-lg bg-red-500 flex items-center justify-center text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        {t('landing.emergencyStatus')}
                      </p>
                      <p className="text-gray-900 font-bold">
                        {t('landing.forecastBoundary')}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
            <div className="absolute -top-6 -right-6 size-32 bg-primary/20 rounded-full blur-3xl -z-10"></div>
            <div className="absolute -bottom-6 -left-6 size-48 bg-blue-500/20 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>
      </section>

      {/* Step 1 */}
      <section className="relative px-4 lg:px-10 py-24 bg-white" id="step-1">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center gap-4 mb-16 relative">
            <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg mb-2 shadow-lg shadow-primary/30 relative after:content-[''] after:absolute after:left-1/2 after:top-full after:w-0.5 after:h-10 after:bg-gray-300 after:-translate-x-1/2">
              1
            </div>
            <h2 className="text-primary text-sm font-bold uppercase tracking-[0.2em]">
              {t('landing.step1Title')}
            </h2>
            <h3 className="text-gray-900 text-3xl lg:text-4xl font-black leading-tight">
              {t('landing.step1Heading')}
            </h3>
            <p className="text-gray-600 text-lg max-w-[700px]">
              {t('landing.step1Description')}
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 relative">
              <Card className="shadow-lg">
                <div className="rounded-2xl border-4 border-white shadow-2xl overflow-hidden aspect-video relative group bg-gray-900">
                  <img
                    src={aiPrediction}
                    alt="AI Prediction Chart"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              </Card>
            </div>
            <div className="flex flex-col gap-6">
              <Card className="shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4">{t('landing.forecastBoundaryLegend')}</h4>
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
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <h4 className="font-bold text-primary mb-2">{t('landing.riskScore')}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  {t('landing.riskScoreDescription')}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-xl text-center border border-gray-200">
                    <div className="text-xl font-black text-red-500">7-30</div>
                    <div className="text-[10px] uppercase font-bold text-gray-500">{t('landing.forecastDays')}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl text-center border border-gray-200">
                    <div className="text-xl font-black text-primary">0-100</div>
                    <div className="text-[10px] uppercase font-bold text-gray-500">{t('landing.riskScore')}</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="px-4 lg:px-10 py-24 bg-gray-50" id="step-2">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center gap-4 mb-16 relative">
            <div className="size-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-lg mb-2 shadow-lg shadow-blue-500/30 relative after:content-[''] after:absolute after:left-1/2 after:top-full after:w-0.5 after:h-10 after:bg-gray-300 after:-translate-x-1/2">
              2
            </div>
            <h2 className="text-blue-500 text-sm font-bold uppercase tracking-[0.2em]">
              {t('landing.step2Title')}
            </h2>
            <h3 className="text-gray-900 text-3xl lg:text-4xl font-black leading-tight">
              {t('landing.step2Heading')}
            </h3>
            <p className="text-gray-600 text-lg max-w-[700px]">
              {t('landing.step2Description')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="shadow-sm hover:shadow-lg transition-all">
              <div className="size-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h4 className="text-xl font-black text-gray-900 mb-3">{t('landing.farmManagement')}</h4>
              <p className="text-gray-600 leading-relaxed mb-6">
                {t('landing.farmManagementDescription')}
              </p>
              <ul className="space-y-3">
                <li className="text-sm text-gray-700">
                  <span>{t('landing.farmFeature1')}</span>
                </li>
                <li className="text-sm text-gray-700">
                  <span>{t('landing.farmFeature2')}</span>
                </li>
              </ul>
            </Card>
            <Card className="shadow-sm hover:shadow-lg transition-all border-t-4 border-t-primary">
              <div className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-black text-gray-900 mb-3">{t('landing.coopManagement')}</h4>
              <p className="text-gray-600 leading-relaxed mb-6">
                {t('landing.coopManagementDescription')}
              </p>
              <ul className="space-y-3">
                <li className="text-sm text-gray-700">
                  <span>{t('landing.coopFeature1')}</span>
                </li>
                <li className="text-sm text-gray-700">
                  <span>{t('landing.coopFeature2')}</span>
                </li>
              </ul>
            </Card>
            <Card className="shadow-sm hover:shadow-lg transition-all">
              <div className="size-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h4 className="text-xl font-black text-gray-900 mb-3">{t('landing.frontendVisualization')}</h4>
              <p className="text-gray-600 leading-relaxed mb-6">
                {t('landing.frontendVisualizationDescription')}
              </p>
              <ul className="space-y-3">
                <li className="text-sm text-gray-700">
                  <span>{t('landing.frontendFeature1')}</span>
                </li>
                <li className="text-sm text-gray-700">
                  <span>{t('landing.frontendFeature2')}</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 lg:px-10 py-24 bg-white" id="pricing">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col items-center text-center gap-4 mb-16">
            <Badge value={t('landing.pricingTitle')} severity="info" />
            <h2 className="text-gray-900 text-3xl lg:text-4xl font-black leading-tight">
              {t('landing.pricingSubtitle')}
            </h2>
            <p className="text-gray-600 text-lg max-w-[600px]">
              {t('landing.pricingDescription')}
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* An Tâm Plan */}
            <Card className="shadow-sm flex flex-col h-full">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">
                    {t('landing.planAnTam')}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  {t('landing.planAnTamDesc')}
                </p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-primary">
                    {t('landing.planAnTamPrice')}
                  </span>
                  <span className="text-lg font-bold text-gray-900">₫</span>
                  <span className="text-gray-500 text-sm">
                    {t('landing.perMonth')}
                  </span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planAnTamFeature1')}
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planAnTamFeature2')}
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planAnTamFeature3')}
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planAnTamFeature4')}
                </li>
              </ul>
              <Button
                label={t('landing.getStarted')}
                onClick={() => navigate('/login')}
                className="p-button-outlined w-full"
              />
            </Card>

            {/* Mùa Vàng Plan - Recommended */}
            <Card className="shadow-lg flex flex-col h-full border-2 border-purple-500 relative transform md:scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge value={t('landing.recommended')} severity="warning" />
              </div>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">
                    {t('landing.planMuaVang')}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  {t('landing.planMuaVangDesc')}
                </p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-primary">
                    {t('landing.planMuaVangPrice')}
                  </span>
                  <span className="text-lg font-bold text-gray-900">₫</span>
                  <span className="text-gray-500 text-sm">
                    {t('landing.perMonth')}
                  </span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planMuaVangFeature1')}
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planMuaVangFeature2')}
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planMuaVangFeature3')}
                </li>
              </ul>
              <Button
                label={t('landing.getStarted')}
                onClick={() => navigate('/login')}
                className="p-button-primary w-full"
              />
            </Card>

            {/* Chuyên Gia Plan */}
            <Card className="shadow-sm flex flex-col h-full">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <ChartLine className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900">
                    {t('landing.planChuyenGia')}
                  </h3>
                </div>
                <p className="text-gray-600 text-sm">
                  {t('landing.planChuyenGiaDesc')}
                </p>
              </div>
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-primary">
                    {t('landing.planChuyenGiaPrice')}
                  </span>
                </div>
              </div>
              <ul className="space-y-4 mb-8 flex-grow">
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planChuyenGiaFeature1')}
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planChuyenGiaFeature2')}
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planChuyenGiaFeature3')}
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('landing.planChuyenGiaFeature4')}
                </li>
              </ul>
              <Button
                label={t('landing.contactSales')}
                onClick={() => navigate('/login')}
                className="p-button-secondary w-full"
              />
            </Card>
          </div>

          {/* VAT Note & Guarantee */}
          <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8 text-center">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('landing.vatNote')}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>
                <strong className="text-gray-700">{t('landing.guaranteeTitle')}</strong>
                {' - '}{t('landing.guaranteeDesc')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Step 3 - CTA Section */}
      <section className="px-4 lg:px-10 py-24">
        <div className="max-w-5xl mx-auto bg-gray-900 rounded-[2.5rem] p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 size-96 bg-primary/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 size-96 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col items-center gap-8 p-12 lg:p-20">
            <div className="size-10 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-lg mb-2">
              3
            </div>
            <h2 className="text-white text-3xl lg:text-5xl font-black leading-tight max-w-[700px]">
              {t('landing.ctaTitle')}
            </h2>
            <p className="text-gray-400 text-lg max-w-[600px]">
              {t('landing.ctaDescription')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              <Button
                label={t('landing.loginNow')}
                onClick={() => navigate('/login')}
                className="p-button-primary p-button-lg"
              />
              <Button
                label={t('landing.contactConsultation')}
                className="p-button-outlined p-button-lg"
                style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 lg:px-10 py-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4 opacity-80">
            <Logo size="sm" showText={false} variant="light" />
            <span className="text-gray-600 font-medium text-sm">
              {t('landing.footerCopyright')}
            </span>
          </div>
          <div className="flex gap-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <a className="hover:text-primary transition-colors cursor-pointer">{t('landing.footerProcess')}</a>
            <a className="hover:text-primary transition-colors cursor-pointer">{t('landing.footerData')}</a>
            <a className="hover:text-primary transition-colors cursor-pointer">{t('landing.footerSecurity')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}


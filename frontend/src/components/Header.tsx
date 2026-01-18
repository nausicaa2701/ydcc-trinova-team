import { Map, Users, BarChart3 } from 'lucide-react'
import { useAppStore, ActiveTab } from '@/store/useAppStore'

export default function Header() {
  const { activeTab, setActiveTab } = useAppStore()

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'salinity-map', label: 'Salinity Map', icon: <Map className="w-5 h-5" /> },
    { id: 'producers-coops', label: 'Producers & Co-ops', icon: <Users className="w-5 h-5" /> },
    { id: 'decision-support', label: 'Decision Support', icon: <BarChart3 className="w-5 h-5" /> },
  ]

  return (
    <header className="h-16 flex-shrink-0 bg-slate-900/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 z-30">
      <div className="flex items-center h-full gap-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 text-primary">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white text-lg font-bold leading-none tracking-tight">Mekong Salinity AI</h1>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Salinity Monitoring</span>
          </div>
        </div>
        <nav className="flex items-center h-full gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 h-full flex items-center gap-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-white border-primary bg-primary/5'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden lg:flex items-center bg-slate-800 rounded-lg px-3 h-10 w-64 border border-slate-700">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="bg-transparent border-none text-white focus:ring-0 text-sm w-full placeholder:text-slate-500 ml-2"
            placeholder="Search regions..."
            type="text"
          />
        </div>
        <div className="flex gap-2">
          <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        <div className="h-8 w-px bg-slate-700 mx-1"></div>
        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">Admin Portal</p>
            <p className="text-[10px] text-slate-400">Monitoring Unit</p>
          </div>
          <div className="w-9 h-9 rounded-full border-2 border-primary/50 overflow-hidden bg-slate-800">
            <div className="w-full h-full bg-gradient-to-br from-primary to-blue-600"></div>
          </div>
        </div>
      </div>
    </header>
  )
}

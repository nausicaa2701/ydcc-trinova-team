import RoleBasedHeader from '@/components/RoleBasedHeader'
import DecisionSupportView from '@/components/DecisionSupportView'

/** Farmer Dashboard - Reuses DecisionSupportView, read-only, filtered to their coop */
export default function FarmerDashboard() {
  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Reuse existing DecisionSupportView - read-only, filtered to farmer's coop */}
        <DecisionSupportView />
      </div>
    </div>
  )
}


import RoleBasedHeader from '@/components/RoleBasedHeader'
import DecisionSupportView from '@/components/DecisionSupportView'

/** System Admin Dashboard - Reuses existing DecisionSupportView and SalinityMapView */
export default function AdminDashboard() {
  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Reuse existing DecisionSupportView - shows global analytics */}
        <DecisionSupportView />
      </div>
    </div>
  )
}


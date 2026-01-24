import RoleBasedHeader from '@/components/RoleBasedHeader'
import DecisionSupportView from '@/components/DecisionSupportView'

/** HTX Admin Dashboard - Reuses DecisionSupportView, filtered to their cooperative */
export default function CoopDashboard() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Reuse existing DecisionSupportView - data filtered to this HTX's area */}
        <DecisionSupportView />
      </div>
    </div>
  )
}


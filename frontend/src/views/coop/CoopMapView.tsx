import RoleBasedHeader from '@/components/RoleBasedHeader'
import SalinityMapView from '@/components/SalinityMapView'

/** HTX Admin Map View - Reuses SalinityMapView, highlights their cooperative */
export default function CoopMapView() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Reuse existing SalinityMapView - highlights their coop, others faded */}
        <SalinityMapView />
      </div>
    </div>
  )
}


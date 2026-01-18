import RoleBasedHeader from '@/components/RoleBasedHeader'
import SalinityMapView from '@/components/SalinityMapView'

/** Farmer Map View - Reuses SalinityMapView, centered on their coop/field */
export default function FarmerMapView() {
  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Reuse existing SalinityMapView - centered on farmer's area */}
        <SalinityMapView />
      </div>
    </div>
  )
}


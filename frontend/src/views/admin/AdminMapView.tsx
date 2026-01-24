import RoleBasedHeader from '@/components/RoleBasedHeader'
import SalinityMapView from '@/components/SalinityMapView'

/** System Admin Map View - Reuses existing SalinityMapView, shows all HTX */
export default function AdminMapView() {
  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Reuse existing SalinityMapView - System Admin sees all HTX at normal color */}
        <SalinityMapView />
      </div>
    </div>
  )
}


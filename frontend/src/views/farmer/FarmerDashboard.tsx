import RoleBasedHeader from '@/components/RoleBasedHeader'
import RealtimeSalinityView from '@/components/RealtimeSalinityView'

/** Farmer Dashboard - Shows real-time salinity data with simple UI for farmers */
export default function FarmerDashboard() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex flex-1 overflow-y-auto">
        <RealtimeSalinityView />
      </div>
    </div>
  )
}


import { useState, useEffect } from 'react'
import RoleBasedHeader from '@/components/RoleBasedHeader'
import FarmerLocationModal from '@/components/FarmerLocationModal'
import { useAuth } from '@/contexts/AuthContext'
import { apiRequest } from '@/utils/apiClient'
import { Plus, PencilSimple, Trash, Phone, User, MapPin } from '@phosphor-icons/react'
import { useLanguage } from '@/contexts/LanguageContext'

interface Farmer {
  id: string
  name: string
  phone: string
  coop_id: string
  lat?: number
  lon?: number
  station_id?: string
  crop_type?: string
  crop_stage?: string
  threshold_salinity?: number
  storage_capacity_m3?: number
  metadata?: Record<string, any>
}

export default function CoopFarmersManagement() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [farmers, setFarmers] = useState<Farmer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingFarmer, setEditingFarmer] = useState<Farmer | null>(null)
  const [formData, setFormData] = useState({ name: '', phone: '', metadata: {} })
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [selectedFarmerForLocation, setSelectedFarmerForLocation] = useState<Farmer | null>(null)

  useEffect(() => {
    if (user?.coop_id) {
      loadFarmers()
    }
  }, [user])

  const loadFarmers = async () => {
    if (!user?.coop_id) return
    
    try {
      const response = await apiRequest(`/coops/${user.coop_id}/farmers`)
      if (response.ok) {
        const data = await response.json()
        setFarmers(data)
      }
    } catch (error) {
      console.error('Error loading farmers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.coop_id) return

    try {
      const endpoint = editingFarmer
        ? `/coops/${user.coop_id}/farmers/${editingFarmer.id}`
        : `/coops/${user.coop_id}/farmers`
      
      const method = editingFarmer ? 'PUT' : 'POST'
      
      const response = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowModal(false)
        setFormData({ name: '', phone: '', metadata: {} })
        setEditingFarmer(null)
        loadFarmers()
      }
    } catch (error) {
      console.error('Error saving farmer:', error)
    }
  }

  const handleDelete = async (farmerId: string) => {
    if (!confirm(t('coop.confirmDeleteFarmer'))) return
    if (!user?.coop_id) return

    try {
      const response = await apiRequest(`/coops/${user.coop_id}/farmers/${farmerId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        loadFarmers()
      }
    } catch (error) {
      console.error('Error deleting farmer:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('coop.farmerManagement')}</h2>
              <p className="text-gray-600">{t('coop.manageFarmersInCoop')}</p>
            </div>
            <button
              onClick={() => {
                setEditingFarmer(null)
                setFormData({ name: '', phone: '', metadata: {} })
                setShowModal(true)
              }}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold hover:brightness-110 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('coop.addFarmer')}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('admin.name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">{t('coop.phone')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Vị trí</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Trạm</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {farmers.map((farmer) => (
                    <tr key={farmer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <div>
                            <span className="text-sm font-medium text-gray-900 block">{farmer.name}</span>
                            {farmer.crop_type && (
                              <span className="text-xs text-gray-500">
                                {farmer.crop_type}
                                {farmer.crop_stage && ` • ${farmer.crop_stage}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4" />
                          <span className="text-sm">{farmer.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {farmer.lat && farmer.lon ? (
                          <div className="text-xs text-gray-700">
                            <div className="font-mono">{farmer.lat.toFixed(4)}, {farmer.lon.toFixed(4)}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa có</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {farmer.station_id ? (
                          <span className="text-xs font-medium text-primary">{farmer.station_id}</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa gán</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedFarmerForLocation(farmer)
                              setShowLocationModal(true)
                            }}
                            className="p-2 text-gray-500 hover:text-green-600 transition-colors"
                            title="Cập nhật vị trí"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingFarmer(farmer)
                              setFormData({ name: farmer.name, phone: farmer.phone, metadata: farmer.metadata || {} })
                              setShowModal(true)
                            }}
                            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <PencilSimple className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(farmer.id)}
                            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md p-6 shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingFarmer ? t('coop.editFarmer') : t('coop.addFarmerTitle')}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border-gray-300 bg-white px-4 py-2 text-gray-900 border focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('coop.phone')}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border-gray-300 bg-white px-4 py-2 text-gray-900 border focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg font-bold hover:brightness-110 transition-all"
                >
                  {editingFarmer ? t('admin.update') : t('admin.create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingFarmer(null)
                    setFormData({ name: '', phone: '', metadata: {} })
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Location Update Modal */}
      {showLocationModal && selectedFarmerForLocation && user?.coop_id && (
        <FarmerLocationModal
          farmerId={selectedFarmerForLocation.id}
          coopId={user.coop_id}
          currentLat={selectedFarmerForLocation.lat}
          currentLon={selectedFarmerForLocation.lon}
          currentStationId={selectedFarmerForLocation.station_id}
          isOpen={showLocationModal}
          onClose={() => {
            setShowLocationModal(false)
            setSelectedFarmerForLocation(null)
          }}
          onSaved={() => {
            loadFarmers()
          }}
        />
      )}
    </div>
  )
}


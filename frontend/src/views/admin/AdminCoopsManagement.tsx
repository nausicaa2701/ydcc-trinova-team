import { useState, useEffect } from 'react'
import RoleBasedHeader from '@/components/RoleBasedHeader'
import { apiRequest } from '@/utils/apiClient'
import { Plus, PencilSimple, Trash, MapPin, Gear, MagnifyingGlass, CircleNotch } from '@phosphor-icons/react'
import { useLanguage } from '@/contexts/LanguageContext'

interface Cooperative {
  id: string
  name: string
  province: string
  address?: string
  center_lat: number
  center_lon: number
  status: string
  config: Record<string, any>
}

export default function AdminCoopsManagement() {
  const { t } = useLanguage()
  const [coops, setCoops] = useState<Cooperative[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCoop, setEditingCoop] = useState<Cooperative | null>(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [configCoop, setConfigCoop] = useState<Cooperative | null>(null)
  const [configJson, setConfigJson] = useState('')
  const [formData, setFormData] = useState({ name: '', province: 'TP. Hồ Chí Minh', address: '', center_lat: 10.8, center_lon: 106.7, status: 'active', config: {} })
  const [geocoding, setGeocoding] = useState({ loading: false, error: '' })

  useEffect(() => {
    loadCoops()
  }, [])

  // Auto reverse geocode when editing a coop with coordinates but no address
  useEffect(() => {
    if (editingCoop && !formData.address && formData.center_lat && formData.center_lon) {
      // Only reverse geocode if we have valid coordinates but no address
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
      if (mapboxToken && mapboxToken !== 'your_mapbox_token_here') {
        reverseGeocode(formData.center_lat, formData.center_lon)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCoop])

  const loadCoops = async () => {
    try {
      const response = await apiRequest('/coops')
      if (response.ok) {
        const data = await response.json()
        setCoops(data)
      }
    } catch (error) {
      console.error('Error loading cooperatives:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const endpoint = editingCoop ? `/coops/${editingCoop.id}` : '/coops'
      const method = editingCoop ? 'PUT' : 'POST'
      
      // Include address in submit data (backend now supports it)
      const response = await apiRequest(endpoint, {
        method,
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowModal(false)
        setEditingCoop(null)
        setFormData({ name: '', province: 'TP. Hồ Chí Minh', address: '', center_lat: 10.8, center_lon: 106.7, status: 'active', config: {} })
        setGeocoding({ loading: false, error: '' })
        loadCoops()
      }
    } catch (error) {
      console.error('Error saving cooperative:', error)
    }
  }

  const handleDelete = async (coopId: string) => {
    if (!confirm(t('admin.confirmDeactivate'))) return
    
    try {
      const response = await apiRequest(`/coops/${coopId}`, { method: 'DELETE' })
      if (response.ok) {
        loadCoops()
      }
    } catch (error) {
      console.error('Error deleting cooperative:', error)
    }
  }

  const geocodeAddress = async (address: string) => {
    if (!address.trim()) {
      setGeocoding({ loading: false, error: '' })
      return
    }

    setGeocoding({ loading: true, error: '' })
    
    try {
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
      if (!mapboxToken || mapboxToken === 'your_mapbox_token_here') {
        setGeocoding({ loading: false, error: 'Mapbox token not configured' })
        return
      }

      // Use Mapbox Geocoding API
      const query = encodeURIComponent(`${address}, ${formData.province}, Vietnam`)
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&country=VN&limit=1`
      
      const response = await fetch(url)
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const [lon, lat] = data.features[0].center
        setFormData({ ...formData, address: address, center_lat: lat, center_lon: lon })
        setGeocoding({ loading: false, error: '' })
      } else {
        setGeocoding({ loading: false, error: 'Không tìm thấy địa chỉ. Vui lòng nhập tọa độ thủ công.' })
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      setGeocoding({ loading: false, error: 'Lỗi khi tìm kiếm địa chỉ. Vui lòng nhập tọa độ thủ công.' })
    }
  }

  const reverseGeocode = async (lat: number, lon: number) => {
    if (!lat || !lon) return

    setGeocoding({ loading: true, error: '' })
    
    try {
      const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
      if (!mapboxToken || mapboxToken === 'your_mapbox_token_here') {
        setGeocoding({ loading: false, error: '' })
        return
      }

      // Use Mapbox Reverse Geocoding API
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${mapboxToken}&country=VN&limit=1`
      
      const response = await fetch(url)
      const data = await response.json()

      if (data.features && data.features.length > 0) {
        const address = data.features[0].place_name
        // Remove "Vietnam" from the end if present
        const cleanAddress = address.replace(/, Vietnam$/, '')
        setFormData({ ...formData, address: cleanAddress })
        setGeocoding({ loading: false, error: '' })
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      setGeocoding({ loading: false, error: '' })
    }
  }

  const handleEditConfig = (coop: Cooperative) => {
    setConfigCoop(coop)
    setConfigJson(JSON.stringify(coop.config, null, 2))
    setShowConfigModal(true)
  }

  const saveConfig = async () => {
    if (!configCoop) return
    
    try {
      const config = JSON.parse(configJson)
      const response = await apiRequest(`/coops/${configCoop.id}/config`, {
        method: 'PUT',
        body: JSON.stringify(config),
      })
      if (response.ok) {
        setShowConfigModal(false)
        loadCoops()
      }
    } catch (error) {
      alert('Invalid JSON format')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-900 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">{t('admin.htxManagement')}</h2>
              <p className="text-slate-400">{t('admin.manageCooperatives')}</p>
            </div>
            <button
              onClick={() => {
                setEditingCoop(null)
                setFormData({ name: '', province: 'TP. Hồ Chí Minh', address: '', center_lat: 10.8, center_lon: 106.7, status: 'active', config: {} })
        setGeocoding({ loading: false, error: '' })
                setShowModal(true)
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:brightness-110 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {t('admin.addHTX')}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400">{t('admin.loading')}</div>
          ) : (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.id')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.province')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.location')}</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.status')}</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">{t('admin.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {coops.map((coop) => (
                    <tr key={coop.id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-sm font-mono text-slate-300">{coop.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-white">{coop.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{coop.province}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {coop.center_lat.toFixed(4)}, {coop.center_lon.toFixed(4)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          coop.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {coop.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditConfig(coop)}
                            className="p-2 text-slate-400 hover:text-primary transition-colors"
                            title="Edit Config"
                          >
                            <Gear className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCoop(coop)
                              setFormData({
                                name: coop.name,
                                province: coop.province,
                                address: coop.address || '', // Load address from backend
                                center_lat: coop.center_lat,
                                center_lon: coop.center_lon,
                                status: coop.status,
                                config: coop.config,
                              })
                              setGeocoding({ loading: false, error: '' })
                              setShowModal(true)
                            }}
                            className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                            title="Edit"
                          >
                            <PencilSimple className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(coop.id)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
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
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingCoop ? t('admin.editCooperative') : t('admin.addCooperative')}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('admin.name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border-slate-700 bg-slate-900 px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('admin.province')}</label>
                <input
                  type="text"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                  className="w-full rounded-lg border-slate-700 bg-slate-900 px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Địa chỉ <span className="text-slate-500 text-xs">(tùy chọn - sẽ tự động tìm tọa độ)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    onBlur={() => {
                      if (formData.address.trim()) {
                        geocodeAddress(formData.address)
                      }
                    }}
                    placeholder="Ví dụ: Số 7 Đỗ Xuân Hợp, phường Phước Long B, Quận 9"
                    className="flex-1 rounded-lg border-slate-700 bg-slate-900 px-4 py-2 text-white"
                  />
                  <button
                    type="button"
                    onClick={() => geocodeAddress(formData.address)}
                    disabled={geocoding.loading || !formData.address.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {geocoding.loading ? (
                      <>
                        <CircleNotch className="w-4 h-4 animate-spin" />
                        Đang tìm...
                      </>
                    ) : (
                      <>
                        <MagnifyingGlass className="w-4 h-4" />
                        Tìm
                      </>
                    )}
                  </button>
                </div>
                {geocoding.error && (
                  <p className="mt-1 text-xs text-red-400">{geocoding.error}</p>
                )}
                {!geocoding.error && formData.address && !geocoding.loading && (
                  <p className="mt-1 text-xs text-green-400">✓ Đã tìm thấy tọa độ</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('admin.latitude')} <span className="text-slate-500 text-xs">(tự động điền)</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.center_lat}
                    onChange={(e) => {
                      const lat = parseFloat(e.target.value) || 0
                      setFormData({ ...formData, center_lat: lat })
                      // Auto reverse geocode if address is empty
                      if (!formData.address && lat && formData.center_lon) {
                        reverseGeocode(lat, formData.center_lon)
                      }
                    }}
                    onBlur={() => {
                      // Reverse geocode when blur if address is empty
                      if (!formData.address && formData.center_lat && formData.center_lon) {
                        reverseGeocode(formData.center_lat, formData.center_lon)
                      }
                    }}
                    className="w-full rounded-lg border-slate-700 bg-slate-900 px-4 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('admin.longitude')} <span className="text-slate-500 text-xs">(tự động điền)</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.center_lon}
                    onChange={(e) => {
                      const lon = parseFloat(e.target.value) || 0
                      setFormData({ ...formData, center_lon: lon })
                      // Auto reverse geocode if address is empty
                      if (!formData.address && formData.center_lat && lon) {
                        reverseGeocode(formData.center_lat, lon)
                      }
                    }}
                    onBlur={() => {
                      // Reverse geocode when blur if address is empty
                      if (!formData.address && formData.center_lat && formData.center_lon) {
                        reverseGeocode(formData.center_lat, formData.center_lon)
                      }
                    }}
                    className="w-full rounded-lg border-slate-700 bg-slate-900 px-4 py-2 text-white"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold hover:brightness-110 transition-all"
                >
                  {editingCoop ? t('admin.update') : t('admin.create')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingCoop(null)
                    setFormData({ name: '', province: 'TP. Hồ Chí Minh', address: '', center_lat: 10.8, center_lon: 106.7, status: 'active', config: {} })
        setGeocoding({ loading: false, error: '' })
                  }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-600 transition-all"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && configCoop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">{t('admin.editConfigTitle')} {configCoop.name}</h3>
            <textarea
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              className="w-full h-64 bg-slate-900 text-white font-mono text-sm p-4 rounded-lg border border-slate-700"
              placeholder='{"threshold_salinity": 4.0, "crops": ["rice", "shrimp"]}'
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={saveConfig}
                className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:brightness-110 transition-all"
              >
                {t('admin.saveConfig')}
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-600 transition-all"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


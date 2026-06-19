import { useState } from 'react'
import { MapPin, CheckCircle, Info, X, MagnifyingGlass } from '@phosphor-icons/react'
import { apiRequest } from '@/utils/apiClient'
import { useLanguage } from '@/contexts/LanguageContext'

interface Station {
  station_id: string
  station_name?: string
  distance_km: number
  lat: number
  lon: number
}

interface SuggestedStationsResponse {
  farmer_id: string
  target_location: {
    lat: number
    lon: number
  }
  suggested_stations: Station[]
  current_station: string | null
}

interface FarmerLocationModalProps {
  farmerId: string
  coopId: string
  currentLat?: number | null
  currentLon?: number | null
  currentStationId?: string | null
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

export default function FarmerLocationModal({
  farmerId,
  coopId,
  currentLat,
  currentLon,
  currentStationId,
  isOpen,
  onClose,
  onSaved
}: FarmerLocationModalProps) {
  const { t } = useLanguage()
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState(currentLat?.toString() || '')
  const [lon, setLon] = useState(currentLon?.toString() || '')
  const [suggestedStations, setSuggestedStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<string>(currentStationId || '')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  if (!isOpen) return null

  const handleSuggestStations = async () => {
    if (!lat || !lon) {
      setMessage(t('location.locationEnterCoords'))
      return
    }

    const latNum = parseFloat(lat)
    const lonNum = parseFloat(lon)

    if (isNaN(latNum) || isNaN(lonNum)) {
      setMessage(t('location.locationInvalidCoords'))
      return
    }

    if (latNum < 8 || latNum > 12 || lonNum < 104 || lonNum > 108) {
      setMessage(t('location.locationOutOfBounds'))
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await apiRequest(
        `/coops/${coopId}/farmers/${farmerId}/suggest-stations?top_n=5`,
        { method: 'GET' }
      )

      if (response.ok) {
        const data: SuggestedStationsResponse = await response.json()
        setSuggestedStations(data.suggested_stations)
        setShowSuggestions(true)
        setMessage('')
      } else {
        const error = await response.json()
        setMessage(error.detail || t('location.locationCannotFindStation'))
      }
    } catch (error) {
      console.error('Error suggesting stations:', error)
      setMessage(t('location.locationServerError'))
    } finally {
      setLoading(false)
    }
  }

  const handleGeocodeAddress = async () => {
    if (!address.trim()) {
      setMessage(t('location.locationEnterAddress'))
      return
    }

    if (!mapboxToken) {
      setMessage(t('location.locationMissingMapboxToken'))
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const resp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=***&limit=1&country=VN&language=vi&proximity=106.7,10.7`
      )
      const data = await resp.json()

      if (!data.features || data.features.length === 0) {
        setMessage(t('location.locationAddressNotFound'))
        return
      }

      const [lonValue, latValue] = data.features[0].center
      setLat(latValue.toFixed(6))
      setLon(lonValue.toFixed(6))
      setShowSuggestions(false)
      setSuggestedStations([])
      setMessage(t('location.locationFoundCoords'))
    } catch (error) {
      console.error('Geocode error:', error)
      setMessage(t('location.locationGeocodeError'))
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!lat || !lon || !selectedStation) {
      setMessage(t('location.locationEnterLocationAndStation'))
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const response = await apiRequest(`/coops/${coopId}/farmers/${farmerId}`, {
        method: 'PUT',
        body: JSON.stringify({
          lat: parseFloat(lat),
          lon: parseFloat(lon),
          station_id: selectedStation
        }),
      })

      if (response.ok) {
        setMessage(t('location.locationSavedSuccess'))
        setTimeout(() => {
          if (onSaved) onSaved()
          onClose()
        }, 1500)
      } else {
        const error = await response.json()
        setMessage(error.detail || t('location.locationCannotSave'))
      }
    } catch (error) {
      console.error('Error saving location:', error)
      setMessage(t('location.locationServerError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            {t('location.locationUpdateTitle')}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">{t('location.locationGuide')}</p>
              <ul className="list-disc list-inside space-y-1 text-blue-300/80">
                <li>{t('location.locationGuide1')}</li>
                <li>{t('location.locationGuide2')}</li>
                <li>{t('location.locationGuide3')}</li>
              </ul>
            </div>
          </div>

          {/* Address & Location Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('location.locationFarmAddress')}
              </label>
              <div className="flex flex-col md:flex-row gap-2">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={t('location.locationAddressPlaceholder')}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-primary focus:outline-none"
                />
                <button
                  onClick={handleGeocodeAddress}
                  disabled={loading || !address.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <MagnifyingGlass className="w-4 h-4" />
                  {loading ? t('location.locationFindingCoords') : t('location.locationFindCoords')}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">{t('location.locationAutoCoordNote')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('location.locationLatitude')}
                </label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="10.7569"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t('location.locationLongitude')}
                </label>
                <input
                  type="text"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  placeholder="106.6529"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-white focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSuggestStations}
                disabled={loading || !lat || !lon}
                className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <MapPin className="w-4 h-4" />
                {loading ? t('location.locationFinding') : t('location.locationFindStation')}
              </button>
            </div>
          </div>

          {/* Message */}
          {message && (
            <div className={`p-3 rounded-lg ${
              message.includes('success') || message.includes('Found') || message.includes('saved')
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}>
              {message}
            </div>
          )}

          {/* Suggested Stations */}
          {showSuggestions && suggestedStations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">
                {t('location.locationNearestStations')}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {suggestedStations.map((station) => (
                  <label
                    key={station.station_id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedStation === station.station_id
                        ? 'bg-primary/20 border-primary text-white'
                        : 'bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="station"
                        value={station.station_id}
                        checked={selectedStation === station.station_id}
                        onChange={(e) => setSelectedStation(e.target.value)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium">
                          {station.station_name || station.station_id}
                        </div>
                        <div className="text-xs text-slate-400">
                          {t('location.locationCoordinates', { id: station.station_id, lat: station.lat.toFixed(4), lon: station.lon.toFixed(4) })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {station.distance_km.toFixed(1)} km
                      </span>
                      {selectedStation === station.station_id && (
                        <CheckCircle className="w-5 h-5 text-primary" weight="fill" />
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Current Station Info */}
          {currentStationId && !showSuggestions && (
            <div className="p-3 bg-slate-900 border border-slate-700 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">{t('location.locationCurrentStation')}</div>
              <div className="text-white font-medium">{currentStationId}</div>
              {currentLat && currentLon && (
                <div className="text-xs text-slate-400 mt-1">
                  {t('location.locationPosition', { lat: currentLat.toFixed(4), lon: currentLon.toFixed(4) })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 p-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-all"
          >
            {t('location.locationCancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedStation}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle className="w-5 h-5" weight="fill" />
            {saving ? t('location.locationSaving') : t('location.locationSave')}
          </button>
        </div>
      </div>
    </div>
  )
}
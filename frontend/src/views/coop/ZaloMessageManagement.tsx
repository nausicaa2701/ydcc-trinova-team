import { useState } from 'react'
import { DataTable } from 'primereact/datatable'
import { Column } from 'primereact/column'
import { Card } from 'primereact/card'
import { Badge } from 'primereact/badge'
import { Button } from 'primereact/button'
import { Dialog } from 'primereact/dialog'
import { Tag } from 'primereact/tag'
import { Calendar } from 'primereact/calendar'
import { mockZaloMessages, type ZaloMessage } from '@/data/mockZaloMessages'
import { ChatCircle, MapPin, Building, Warning, CheckCircle, Clock, XCircle, Calendar as CalendarIcon } from '@phosphor-icons/react'
import RoleBasedHeader from '@/components/RoleBasedHeader'

const PRIORITY_COLORS = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'success'
} as const

const DANGER_LEVEL_COLORS = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'success'
} as const

const DANGER_LEVEL_LABELS = {
  critical: 'Nguy cấp',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp'
} as const

export default function ZaloMessageManagement() {
  const [messages] = useState<ZaloMessage[]>(mockZaloMessages)
  const [selectedMessage, setSelectedMessage] = useState<ZaloMessage | null>(null)
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dateFilter, setDateFilter] = useState<Date | null>(null)

  const filteredMessages = dateFilter
    ? messages.filter(msg => {
        const msgDate = new Date(msg.sentDate)
        const filterDate = new Date(dateFilter)
        return msgDate.toDateString() === filterDate.toDateString()
      })
    : messages

  const formatMessageContent = (message: ZaloMessage): string => {
    const predictionsText = message.predictions
      .map((p, i) => `Ngày ${i + 1}: ${p.toFixed(2)} g/L`)
      .join('\n')

    const newsText = message.newsHighlights
      .map(news => `- ${news}`)
      .join('\n')

    return `Nông dân: ${message.farmerName} (${message.farmerPhone})
Vị trí: ${message.lat}, ${message.lon}
Trạm quan trắc: ${message.stationId}
Kinh doanh: ${message.businessType.join(', ')}

Dự báo 7 ngày tới (độ mặn g/L):
${predictionsText}

Tin tức nổi bật:
${newsText}

Số ngày vượt ngưỡng: ${message.daysAboveThreshold}
Ngày mặn cao nhất: Ngày ${message.maxSalinityDay} (${message.maxSalinityValue.toFixed(2)} g/L)
Mức độ nguy hiểm: ${DANGER_LEVEL_LABELS[message.dangerLevel]}

Hành động đề xuất:
${message.actionPlan.map((action, idx) => 
  `${idx + 1}. ${action.action} (${action.priority})
   ${action.description}
   Ngày nên thực hiện: ${action.recommendedDays.join(', ')}
   Ngày nên tránh: ${action.avoidDays.length > 0 ? action.avoidDays.join(', ') : 'Không có'}`
).join('\n\n')}`
  }

  const dangerLevelBodyTemplate = (rowData: ZaloMessage) => {
    return (
      <Tag
        value={DANGER_LEVEL_LABELS[rowData.dangerLevel]}
        severity={DANGER_LEVEL_COLORS[rowData.dangerLevel]}
      />
    )
  }

  const actionPlanBodyTemplate = (rowData: ZaloMessage) => {
    const criticalCount = rowData.actionPlan.filter(a => a.priority === 'CRITICAL').length
    const highCount = rowData.actionPlan.filter(a => a.priority === 'HIGH').length
    
    return (
      <div className="flex gap-2">
        {criticalCount > 0 && (
          <Badge value={criticalCount} severity="danger" />
        )}
        {highCount > 0 && (
          <Badge value={highCount} severity="warning" />
        )}
        <span className="text-sm text-gray-600">
          {rowData.actionPlan.length} hành động
        </span>
      </div>
    )
  }

  const actionsBodyTemplate = (rowData: ZaloMessage) => {
    return (
      <Button
        icon="pi pi-eye"
        label="Xem chi tiết"
        className="p-button-text p-button-sm"
        onClick={() => {
          setSelectedMessage(rowData)
          setDialogVisible(true)
        }}
      />
    )
  }

  const dateBodyTemplate = (rowData: ZaloMessage) => {
    return new Date(rowData.sentDate).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const farmerBodyTemplate = (rowData: ZaloMessage) => {
    return (
      <div>
        <div className="font-semibold">{rowData.farmerName}</div>
        <div className="text-sm text-gray-500">{rowData.farmerPhone}</div>
      </div>
    )
  }

  const locationBodyTemplate = (rowData: ZaloMessage) => {
    return (
      <div className="text-sm">
        <div>{rowData.lat.toFixed(4)}, {rowData.lon.toFixed(4)}</div>
        <div className="text-gray-500">{rowData.stationId}</div>
      </div>
    )
  }

  const predictionsBodyTemplate = (rowData: ZaloMessage) => {
    const maxDay = rowData.maxSalinityDay
    const maxValue = rowData.maxSalinityValue
    return (
      <div className="text-sm">
        <div className="font-semibold">Cao nhất: {maxValue.toFixed(2)} g/L</div>
        <div className="text-gray-500">Ngày {maxDay}</div>
        <div className="text-gray-500">{rowData.daysAboveThreshold} ngày vượt ngưỡng</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      <RoleBasedHeader />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
        <Card className="mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Quản lý tin nhắn Zalo
              </h1>
              <p className="text-gray-600">
                Danh sách tin nhắn đã gửi đến hộ dân mỗi ngày
              </p>
            </div>
            <div className="flex gap-3">
              <Calendar
                value={dateFilter}
                onChange={(e) => setDateFilter(e.value as Date)}
                placeholder="Lọc theo ngày"
                showIcon
                dateFormat="dd/mm/yy"
                className="w-48"
              />
              {dateFilter && (
                <Button
                  label="Xóa bộ lọc"
                  icon="pi pi-times"
                  className="p-button-text"
                  onClick={() => setDateFilter(null)}
                />
              )}
            </div>
          </div>

          <DataTable
            value={filteredMessages}
            paginator
            rows={10}
            rowsPerPageOptions={[10, 20, 50]}
            emptyMessage="Không có tin nhắn nào"
            className="p-datatable-sm"
            stripedRows
          >
            <Column
              field="sentDate"
              header="Ngày gửi"
              body={dateBodyTemplate}
              sortable
              style={{ width: '120px' }}
            />
            <Column
              field="farmerName"
              header="Nông dân"
              body={farmerBodyTemplate}
              sortable
              style={{ width: '180px' }}
            />
            <Column
              field="location"
              header="Vị trí / Trạm"
              body={locationBodyTemplate}
              style={{ width: '200px' }}
            />
            <Column
              field="businessType"
              header="Kinh doanh"
              body={(row) => (
                <div className="flex gap-1 flex-wrap">
                  {row.businessType.map((type: string, idx: number) => (
                    <Tag key={idx} value={type} severity="info" className="text-xs" />
                  ))}
                </div>
              )}
              style={{ width: '150px' }}
            />
            <Column
              field="dangerLevel"
              header="Mức độ nguy hiểm"
              body={dangerLevelBodyTemplate}
              sortable
              style={{ width: '150px' }}
            />
            <Column
              field="predictions"
              header="Dự báo"
              body={predictionsBodyTemplate}
              style={{ width: '180px' }}
            />
            <Column
              field="actionPlan"
              header="Hành động"
              body={actionPlanBodyTemplate}
              style={{ width: '150px' }}
            />
            <Column
              body={actionsBodyTemplate}
              header="Thao tác"
              style={{ width: '120px' }}
            />
          </DataTable>
        </Card>

        <Dialog
          header="Chi tiết tin nhắn"
          visible={dialogVisible}
          style={{ width: '80vw', maxWidth: '900px' }}
          onHide={() => setDialogVisible(false)}
          footer={
            <div>
              <Button
                label="Đóng"
                icon="pi pi-times"
                onClick={() => setDialogVisible(false)}
                className="p-button-text"
              />
              <Button
                label="Sao chép nội dung"
                icon="pi pi-copy"
                onClick={() => {
                  if (selectedMessage) {
                    navigator.clipboard.writeText(formatMessageContent(selectedMessage))
                  }
                }}
              />
            </div>
          }
        >
          {selectedMessage && (
            <div className="space-y-6">
              {/* Thông tin nông dân */}
              <Card title="Thông tin nông dân" className="mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <ChatCircle className="w-5 h-5 text-primary" />
                    <div>
                      <div className="font-semibold">{selectedMessage.farmerName}</div>
                      <div className="text-sm text-gray-500">{selectedMessage.farmerPhone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-sm">{selectedMessage.lat}, {selectedMessage.lon}</div>
                      <div className="text-sm text-gray-500">Trạm: {selectedMessage.stationId}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-sm">{selectedMessage.businessType.join(', ')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-sm">
                        {new Date(selectedMessage.sentDate).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Dự báo 7 ngày */}
              <Card title="Dự báo 7 ngày tới (độ mặn g/L)">
                <div className="space-y-2">
                  {selectedMessage.predictions.map((pred, idx) => {
                    const isMax = idx + 1 === selectedMessage.maxSalinityDay
                    const isAbove4 = pred >= 4.0
                    const isAbove1 = pred >= 1.0
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          isMax
                            ? 'bg-red-50 border-red-200'
                            : isAbove4
                            ? 'bg-orange-50 border-orange-200'
                            : isAbove1
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Ngày {idx + 1}: {pred.toFixed(2)} g/L</span>
                          {isMax && <Badge value="Cao nhất" severity="danger" />}
                          {isAbove4 && !isMax && <Badge value="Nguy hiểm" severity="warning" />}
                          {isAbove1 && !isAbove4 && <Badge value="Cảnh báo" severity="info" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm">
                    <div><strong>Số ngày vượt ngưỡng:</strong> {selectedMessage.daysAboveThreshold}</div>
                    <div><strong>Ngày mặn cao nhất:</strong> Ngày {selectedMessage.maxSalinityDay} ({selectedMessage.maxSalinityValue.toFixed(2)} g/L)</div>
                    <div><strong>Mức độ nguy hiểm:</strong> 
                      <Tag
                        value={DANGER_LEVEL_LABELS[selectedMessage.dangerLevel]}
                        severity={DANGER_LEVEL_COLORS[selectedMessage.dangerLevel]}
                        className="ml-2"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tin tức nổi bật */}
              {selectedMessage.newsHighlights.length > 0 && (
                <Card title="Tin tức nổi bật">
                  <ul className="list-disc list-inside space-y-1">
                    {selectedMessage.newsHighlights.map((news, idx) => (
                      <li key={idx} className="text-sm">{news}</li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Hành động đề xuất */}
              <Card title="Hành động đề xuất">
                <div className="space-y-4">
                  {selectedMessage.actionPlan.map((action, idx) => {
                    const PriorityIcon = 
                      action.priority === 'CRITICAL' ? XCircle :
                      action.priority === 'HIGH' ? Warning :
                      action.priority === 'MEDIUM' ? Clock :
                      CheckCircle
                    
                    return (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border-l-4 ${
                          action.priority === 'CRITICAL'
                            ? 'bg-red-50 border-red-500'
                            : action.priority === 'HIGH'
                            ? 'bg-orange-50 border-orange-500'
                            : action.priority === 'MEDIUM'
                            ? 'bg-yellow-50 border-yellow-500'
                            : 'bg-green-50 border-green-500'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <PriorityIcon
                            className={`w-6 h-6 mt-1 ${
                              action.priority === 'CRITICAL'
                                ? 'text-red-600'
                                : action.priority === 'HIGH'
                                ? 'text-orange-600'
                                : action.priority === 'MEDIUM'
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-lg">{action.action}</h4>
                              <Tag
                                value={action.priority}
                                severity={PRIORITY_COLORS[action.priority]}
                              />
                            </div>
                            <p className="text-sm text-gray-700 mb-3">{action.description}</p>
                            <div className="flex gap-4 text-sm">
                              {action.recommendedDays.length > 0 && (
                                <div>
                                  <span className="font-semibold text-green-700">Ngày nên thực hiện:</span>{' '}
                                  <span className="text-gray-600">
                                    {action.recommendedDays.map(d => `Ngày ${d}`).join(', ')}
                                  </span>
                                </div>
                              )}
                              {action.avoidDays.length > 0 && (
                                <div>
                                  <span className="font-semibold text-red-700">Ngày nên tránh:</span>{' '}
                                  <span className="text-gray-600">
                                    {action.avoidDays.map(d => `Ngày ${d}`).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Nội dung tin nhắn */}
              <Card title="Nội dung tin nhắn đã gửi">
                <pre className="p-4 bg-gray-100 rounded-lg text-sm whitespace-pre-wrap font-mono">
                  {formatMessageContent(selectedMessage)}
                </pre>
              </Card>
            </div>
          )}
        </Dialog>
        </div>
      </div>
    </div>
  )
}

"use client"

import { Label } from "@/components/ui/label"
import { Smartphone } from "lucide-react"

interface CarrierOption {
  id: string
  label: string
  icon: string
}

interface CarrierOptionSelectorProps {
  selectedOption: string
  onOptionChange: (option: string) => void
  disabled?: boolean
}

const carrierOptions: CarrierOption[] = [
  { id: "kt-device", label: "KT 기기변경", icon: "📱" },
  { id: "kt-number", label: "KT 번호이동", icon: "🔄" },
  { id: "skt-device", label: "SKT 기기변경", icon: "📱" },
  { id: "skt-number", label: "SKT 번호이동", icon: "🔄" },
  { id: "no-preference", label: "상관없음", icon: "✨" },
]

export default function CarrierOptionSelector({
  selectedOption,
  onOptionChange,
  disabled = false,
}: CarrierOptionSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium flex items-center gap-2">
        <Smartphone className="w-5 h-5" />
        통신사 옵션 <span className="text-red-500">*</span>
      </Label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {carrierOptions.map((option) => (
          <label
            key={option.id}
            className={`
              relative flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all
              ${
                selectedOption === option.label
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <input
              type="radio"
              name="carrierOption"
              value={option.label}
              checked={selectedOption === option.label}
              onChange={(e) => {
                if (!disabled && e.target.checked) {
                  onOptionChange(option.label)
                }
              }}
              disabled={disabled}
              className="sr-only" // 화면에서 숨김 (접근성 유지)
            />

            {/* 커스텀 라디오 버튼 */}
            <div
              className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
              ${selectedOption === option.label ? "border-blue-500 bg-blue-500" : "border-gray-300"}
            `}
            >
              {selectedOption === option.label && <div className="w-2 h-2 bg-white rounded-full"></div>}
            </div>

            <div className="flex items-center gap-2 flex-1">
              <span className="text-lg">{option.icon}</span>
              <span className="font-medium text-gray-800">{option.label}</span>
            </div>

            {/* 선택된 상태 표시 */}
            {selectedOption === option.label && (
              <div className="absolute top-2 right-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </label>
        ))}
      </div>

      {!selectedOption && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-3 rounded-lg border border-red-200">
          <span className="text-base">⚠️</span>
          <span>원하시는 통신사 옵션을 선택해주세요. (필수)</span>
        </div>
      )}
    </div>
  )
}

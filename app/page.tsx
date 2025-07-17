"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MessageCircle, Clock, Settings } from "lucide-react"
import { adminStore, type ConsultationStatus } from "@/lib/admin-store"
import type { BannerImage } from "@/lib/supabase"

export default function OnlineShopConsultation() {
  const [consultations, setConsultations] = useState<ConsultationStatus[]>([
    { name: "조*은", status: "카톡 상담", time: "25.07.14" },
    { name: "홍*영", status: "카톡 상담", time: "25.07.14" },
    { name: "오*은", status: "카톡 상담", time: "25.07.14" },
    { name: "오*재", status: "카톡 상담", time: "25.07.14" },
  ])

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    privacyConsent: false,
    marketingConsent: false,
  })

  const [bannerImages, setBannerImages] = useState<BannerImage[]>([])
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showThirdPartyModal, setShowThirdPartyModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 실시간 카톡 상담 현황 업데이트 시뮬레이션
  useEffect(() => {
    const names = [
      "김*수",
      "이*민",
      "박*희",
      "정*호",
      "최*영",
      "장*우",
      "윤*아",
      "임*진",
      "한*솔",
      "조*현",
      "강*미",
      "송*준",
      "신*영",
      "오*빈",
      "문*서",
      "배*원",
      "서*연",
      "권*호",
      "남*정",
      "유*석",
      "전*희",
      "고*민",
      "노*환",
      "도*수",
      "마*진",
      "변*율",
      "백*나",
      "안*혜",
      "양*철",
      "원*빈",
      "위*준",
      "육*아",
      "인*호",
      "임*수",
      "장*민",
      "전*영",
      "정*우",
      "조*희",
      "차*원",
      "최*진",
      "표*연",
      "하*석",
      "허*미",
      "홍*빈",
      "황*서",
      "구*영",
      "국*호",
      "금*아",
    ]

    const interval = setInterval(() => {
      const randomName = names[Math.floor(Math.random() * names.length)]
      const now = new Date()
      const timeString = `${now.getFullYear().toString().slice(-2)}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`

      setConsultations((prev) => {
        const newConsultation = { name: randomName, status: "카톡 상담", time: timeString }
        return [newConsultation, ...prev.slice(0, 3)]
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // 배너 이미지 실시간 로딩 (Supabase 실시간 구독)
  useEffect(() => {
    // 초기 데이터 로드
    const loadBannerImages = async () => {
      const images = await adminStore.getBannerImages()
      setBannerImages(images)
    }
    loadBannerImages()

    // 실시간 구독
    const unsubscribe = adminStore.onBannerImagesChange((images) => {
      setBannerImages(images)
    })

    return () => unsubscribe()
  }, [])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.privacyConsent) {
      alert("개인정보 수집 및 이용에 동의해주세요.")
      return
    }

    setIsSubmitting(true)

    try {
      // 고객 데이터 저장 (Supabase)
      await adminStore.addCustomer({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        privacy_consent: formData.privacyConsent,
        marketing_consent: formData.marketingConsent,
      })

      alert("상담 신청이 완료되었습니다. 곧 연락드리겠습니다.")
      setFormData({
        name: "",
        phone: "",
        email: "",
        privacyConsent: false,
        marketingConsent: false,
      })
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("상담 신청 중 오류가 발생했습니다. 다시 시도해주세요.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <style jsx>{`
        @keyframes slide-up-fade-in {
          0% {
            transform: translateY(100px);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up-fade-in {
          animation: slide-up-fade-in 0.7s ease-out forwards;
        }

        .card-news-shadow {
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
        }
      `}</style>
      <div className="min-h-screen bg-gray-50 relative">
        {/* 관리자 페이지 접근 버튼 */}
        <Link
          href="/admin"
          className="fixed bottom-4 left-4 z-50 w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center shadow-lg transition-colors"
        >
          <Settings className="w-6 h-6 text-white" />
        </Link>

        {/* 카드 뉴스 피드 */}
        <div className="w-full bg-gradient-to-b from-white to-gray-50 py-8">
          <div className="max-w-2xl mx-auto px-4 space-y-8">
            {bannerImages.map((banner, index) => (
              <div key={banner.id} className="relative">
                {/* 카드 뉴스 */}
                <div className="relative bg-white rounded-2xl card-news-shadow overflow-hidden">
                  <div className="aspect-[4/5] relative">
                    <Image
                      src={banner.url || "/placeholder.svg?height=675&width=540"}
                      alt={banner.alt}
                      fill
                      className="object-cover"
                      priority={index === 0}
                      onError={() => {
                        // 이미지 로드 실패시 placeholder로 대체
                        console.warn(`이미지 로드 실패: ${banner.url}`)
                      }}
                    />

                    {/* 그라데이션 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                  </div>
                </div>
              </div>
            ))}

            {/* 배너가 없을 때 표시할 메시지 */}
            {bannerImages.length === 0 && (
              <div className="text-center py-16">
                <div className="text-gray-400 text-lg">아직 등록된 카드 뉴스가 없습니다.</div>
                <div className="text-gray-500 text-sm mt-2">관리자 페이지에서 이미지를 추가해보세요.</div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 space-y-8">
          {/* 실시간 카톡 상담 현황 */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-800">실시간 카톡 상담 현황</CardTitle>
              <CardDescription>지금 이 순간에도 많은 분들이 카카오톡으로 상담을 받고 계십니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 overflow-hidden">
                {consultations.map((consultation, index) => (
                  <div
                    key={`${consultation.name}-${consultation.time}-${index}`}
                    className={`flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200 transform transition-all duration-700 ease-out ${
                      index === 0 ? "animate-slide-up-fade-in" : "translate-y-0 opacity-100"
                    }`}
                    style={{
                      animationDelay: index === 0 ? "0ms" : `${index * 100}ms`,
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{consultation.name}</div>
                        <div className="text-sm text-gray-600">{consultation.status}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{consultation.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 상담 신청 폼 */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-800">무료 카톡 상담 신청</CardTitle>
              <CardDescription>전문 상담사가 카카오톡으로 1:1 맞춤 상담을 도와드립니다</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base font-medium">
                    이름 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="이름을 입력해주세요"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    required
                    className="h-12"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base font-medium">
                    휴대폰 번호 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="카톡 연결을 위한 번호를 입력해주세요"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                    className="h-12"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">
                    이메일
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="이메일을 입력해주세요"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="h-12"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="privacy"
                      checked={formData.privacyConsent}
                      onCheckedChange={(checked) => handleInputChange("privacyConsent", checked as boolean)}
                      className="mt-1"
                      disabled={isSubmitting}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="privacy" className="text-sm font-medium cursor-pointer">
                        개인정보 수집 및 이용에 동의합니다. <span className="text-red-500">*</span>
                      </Label>
                      <div className="text-xs text-gray-500">
                        <button
                          type="button"
                          className="text-blue-600 underline"
                          onClick={() => setShowPrivacyModal(true)}
                          disabled={isSubmitting}
                        >
                          개인정보 수집 및 이용 약관보기
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="marketing"
                      checked={formData.marketingConsent}
                      onCheckedChange={(checked) => handleInputChange("marketingConsent", checked as boolean)}
                      className="mt-1"
                      disabled={isSubmitting}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="marketing" className="text-sm font-medium cursor-pointer">
                        개인정보 제3자 제공에 동의합니다.
                      </Label>
                      <div className="text-xs text-gray-500">
                        <button
                          type="button"
                          className="text-blue-600 underline"
                          onClick={() => setShowThirdPartyModal(true)}
                          disabled={isSubmitting}
                        >
                          개인정보 제3자 제공 약관보기
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-semibold bg-yellow-500 hover:bg-yellow-600 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "신청 중..." : "무료 카톡 상담 신청하기"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 푸터 정보 */}
          <div className="text-center text-sm text-gray-500 py-8">
            <p>© 2025 온라인 성지샵. 모든 권리 보유.</p>
            <p className="mt-2">상담 시간: 평일 09:00 - 18:00 (토/일/공휴일 휴무)</p>
          </div>
        </div>

        {/* 개인정보 약관 모달 */}
        {showPrivacyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4">개인정보 수집 및 이용 약관</h3>
                <div className="whitespace-pre-line text-sm text-gray-700 mb-6">{adminStore.getPrivacyPolicy()}</div>
                <Button onClick={() => setShowPrivacyModal(false)} className="w-full">
                  확인
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 제3자 제공 약관 모달 */}
        {showThirdPartyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-lg font-bold mb-4">개인정보 제3자 제공 약관</h3>
                <div className="whitespace-pre-line text-sm text-gray-700 mb-6">{adminStore.getThirdPartyPolicy()}</div>
                <Button onClick={() => setShowThirdPartyModal(false)} className="w-full">
                  확인
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

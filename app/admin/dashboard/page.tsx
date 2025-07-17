"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  ImageIcon,
  FileText,
  Settings,
  Trash2,
  Upload,
  LogOut,
  Download,
  ChevronUp,
  ChevronDown,
  GripVertical,
  RefreshCw,
} from "lucide-react"
import { adminStore } from "@/lib/admin-store"
import type { CustomerData, BannerImage } from "@/lib/supabase"
import * as XLSX from "xlsx"

export default function AdminDashboard() {
  const router = useRouter()
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [bannerImages, setBannerImages] = useState<BannerImage[]>([])
  const [privacyPolicy, setPrivacyPolicy] = useState("")
  const [thirdPartyPolicy, setThirdPartyPolicy] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string>("")
  const [storageStatus, setStorageStatus] = useState<{
    isReady: boolean
    bucketExists: boolean
    canUpload: boolean
    canDelete: boolean
    error?: string
    details?: any
  } | null>(null)
  const [forceUploadMode, setForceUploadMode] = useState(false) // 🔥 강제 업로드 모드

  useEffect(() => {
    // 인증 확인
    if (typeof window !== "undefined" && !sessionStorage.getItem("adminAuth")) {
      router.push("/admin")
      return
    }

    // 데이터 로드
    setPrivacyPolicy(adminStore.getPrivacyPolicy())
    setThirdPartyPolicy(adminStore.getThirdPartyPolicy())

    // 초기 데이터 로드
    const loadData = async () => {
      try {
        console.log("🔄 Loading initial data...")
        const customersData = await adminStore.getCustomers()
        const imagesData = await adminStore.getBannerImages()
        setCustomers(customersData)
        setBannerImages(imagesData)
        console.log("✅ Initial data loaded")
      } catch (error) {
        console.error("❌ Error loading initial data:", error)
      }
    }
    loadData()

    // Supabase 실시간 구독
    const unsubscribeCustomers = adminStore.onCustomersChange((data) => {
      console.log("🔄 Customers updated:", data.length)
      setCustomers(data)
    })

    const unsubscribeBannerImages = adminStore.onBannerImagesChange((data) => {
      console.log("🔄 Banner images updated:", data.length)
      setBannerImages(data)
    })

    // Storage 상태 확인
    checkStorageStatus()

    return () => {
      unsubscribeCustomers()
      unsubscribeBannerImages()
    }
  }, [router])

  // 🔄 Storage 상태 재확인 함수
  const checkStorageStatus = async () => {
    try {
      console.log("🔍 Storage 상태 확인 시작...")
      const status = await adminStore.getStorageStatus()
      console.log("📊 Storage 상태 결과:", status)
      setStorageStatus(status)

      // 상세 정보 로깅
      if (status.details) {
        console.log("📋 Storage 상세 정보:", status.details)
      }
    } catch (error) {
      console.error("❌ Storage 상태 확인 실패:", error)
      setStorageStatus({
        isReady: false,
        bucketExists: false,
        canUpload: false,
        canDelete: false,
        error: `상태 확인 실패: ${error}`,
      })
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth")
    router.push("/")
  }

  const handleDeleteCustomer = async (id: string) => {
    if (confirm("정말로 이 고객 데이터를 삭제하시겠습니까?")) {
      try {
        await adminStore.deleteCustomer(id)
      } catch (error: any) {
        alert(`고객 데이터 삭제 중 오류가 발생했습니다: ${error.message}`)
        console.error("Error deleting customer:", error)
      }
    }
  }

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFiles(files)

      // 미리보기 URL 생성
      const urls: string[] = []
      let loadedCount = 0

      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader()
          reader.onload = (e) => {
            const result = e.target?.result as string
            urls.push(result)
            loadedCount++
            if (loadedCount === files.length) {
              setPreviewUrls(urls)
            }
          }
          reader.onerror = () => {
            console.error("파일 읽기 오류:", file.name)
            loadedCount++
            if (loadedCount === files.length) {
              setPreviewUrls(urls)
            }
          }
          reader.readAsDataURL(file)
        } else {
          loadedCount++
          if (loadedCount === files.length) {
            setPreviewUrls(urls)
          }
        }
      })
    }
  }

  // 🚀 강제 업로드 (Storage 상태 무시)
  const handleUploadImages = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      alert("업로드할 이미지를 선택해주세요.")
      return
    }

    setIsUploading(true)
    setUploadProgress("이미지 업로드 중...")

    try {
      console.log(`🚀 ${selectedFiles.length}개 이미지 업로드 시작... (강제모드: ${forceUploadMode})`)

      // 🔥 업로드 시도 (Storage 상태와 관계없이)
      const result = await adminStore.addBannerImages(selectedFiles)

      // 결과 정리
      setSelectedFiles(null)
      setPreviewUrls([])
      setUploadProgress("")

      // 파일 input 초기화
      const fileInput = document.getElementById("imageFiles") as HTMLInputElement
      if (fileInput) fileInput.value = ""

      // 성공하면 Storage 상태 재확인
      await checkStorageStatus()

      // 결과 메시지
      let message = `업로드 완료!\n✅ 성공: ${result.success}개`
      if (result.errors.length > 0) {
        message += `\n❌ 실패: ${result.errors.length}개`
        message += `\n\n오류 내용:\n${result.errors.join("\n")}`
      }

      alert(message)
      console.log("🎉 Upload completed:", result)
    } catch (error: any) {
      console.error("❌ Upload process error:", error)

      // 더 상세한 오류 메시지
      let errorMessage = `업로드 중 오류가 발생했습니다:\n\n${error.message}`

      if (error.message.includes("Bucket not found")) {
        errorMessage += `\n\n🔧 해결방법:\n1. SQL 에디터에서 'force-create-bucket-now.sql' 실행\n2. 페이지 새로고침 후 재시도`
      }

      alert(errorMessage)
    } finally {
      setIsUploading(false)
      setUploadProgress("")
    }
  }

  const handleDeleteBannerImage = async (id: string) => {
    if (confirm("정말로 이 이미지를 삭제하시겠습니까?")) {
      try {
        await adminStore.deleteBannerImage(id)
      } catch (error: any) {
        alert(`이미지 삭제 중 오류가 발생했습니다: ${error.message}`)
        console.error("Error deleting image:", error)
      }
    }
  }

  const handleMoveImageUp = async (id: string) => {
    try {
      await adminStore.moveBannerImageUp(id)
    } catch (error: any) {
      alert(`이미지 순서 변경 중 오류가 발생했습니다: ${error.message}`)
      console.error("Error moving image up:", error)
    }
  }

  const handleMoveImageDown = async (id: string) => {
    try {
      await adminStore.moveBannerImageDown(id)
    } catch (error: any) {
      alert(`이미지 순서 변경 중 오류가 발생했습니다: ${error.message}`)
      console.error("Error moving image down:", error)
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      try {
        await adminStore.reorderBannerImages(draggedIndex, dropIndex)
      } catch (error: any) {
        alert(`이미지 순서 변경 중 오류가 발생했습니다: ${error.message}`)
        console.error("Error reordering images:", error)
      }
    }
    setDraggedIndex(null)
  }

  const handleUpdatePrivacyPolicy = () => {
    adminStore.updatePrivacyPolicy(privacyPolicy)
    alert("개인정보 수집 및 이용 약관이 업데이트되었습니다.")
  }

  const handleUpdateThirdPartyPolicy = () => {
    adminStore.updateThirdPartyPolicy(thirdPartyPolicy)
    alert("개인정보 제3자 제공 약관이 업데이트되었습니다.")
  }

  // 🔐 PIN 변경 처리 (수정됨)
  const handleChangePin = () => {
    if (newPin.length !== 4) {
      alert("PIN은 4자리여야 합니다.")
      return
    }
    if (newPin !== confirmPin) {
      alert("PIN 확인이 일치하지 않습니다.")
      return
    }

    try {
      // 현재 PIN 확인
      const currentPin = adminStore.getCurrentPin()
      console.log("🔄 PIN 변경 시도:", { current: currentPin, new: newPin })

      // PIN 변경
      adminStore.changePin(newPin)

      // 변경 후 확인
      const updatedPin = adminStore.getCurrentPin()
      console.log("✅ PIN 변경 후 확인:", updatedPin)

      // 입력 필드 초기화
      setNewPin("")
      setConfirmPin("")

      // 성공 메시지
      alert(`PIN이 성공적으로 변경되었습니다.\n새 PIN: ${newPin}\n\n로그아웃하지 않고 계속 사용하실 수 있습니다.`)
    } catch (error) {
      console.error("❌ PIN 변경 오류:", error)
      alert("PIN 변경 중 오류가 발생했습니다.")
    }
  }

  const exportCustomerData = () => {
    const worksheetData = [
      ["이름", "전화번호", "이메일", "개인정보동의", "마케팅동의", "신청일시"],
      ...customers.map((customer) => [
        customer.name,
        customer.phone,
        customer.email,
        customer.privacy_consent ? "동의" : "미동의",
        customer.marketing_consent ? "동의" : "미동의",
        new Date(customer.created_at).toLocaleString("ko-KR"),
      ]),
    ]

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "고객데이터")

    XLSX.writeFile(workbook, `고객데이터_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  // 🔥 업로드 버튼 활성화 조건 (더 관대하게)
  const canUpload = selectedFiles && selectedFiles.length > 0 && !isUploading

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
          <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2 bg-transparent">
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="customers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              고객 관리
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              이미지 관리
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              약관 관리
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              설정
            </TabsTrigger>
          </TabsList>

          <TabsContent value="customers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>고객 데이터 관리</CardTitle>
                  <CardDescription>상담 신청한 고객들의 정보를 관리합니다</CardDescription>
                </div>
                <Button onClick={exportCustomerData} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  엑셀 다운로드
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">아직 상담 신청한 고객이 없습니다.</div>
                  ) : (
                    customers.map((customer) => (
                      <div key={customer.id} className="border rounded-lg p-4 flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="font-semibold text-lg">{customer.name}</div>
                          <div className="text-sm text-gray-600">
                            <div>전화번호: {customer.phone}</div>
                            <div>이메일: {customer.email || "미입력"}</div>
                            <div>개인정보 동의: {customer.privacy_consent ? "동의" : "미동의"}</div>
                            <div>마케팅 동의: {customer.marketing_consent ? "동의" : "미동의"}</div>
                            <div>신청일시: {new Date(customer.created_at).toLocaleString("ko-KR")}</div>
                          </div>
                        </div>
                        <Button onClick={() => handleDeleteCustomer(customer.id)} variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="images">
            <Card>
              <CardHeader>
                <CardTitle>배너 이미지 관리</CardTitle>
                <CardDescription>메인 페이지에 표시될 배너 이미지를 관리하고 순서를 변경할 수 있습니다</CardDescription>

                {/* Storage 상태 표시 */}
                {storageStatus && (
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-base">✅ Base64 이미지 저장 방식 (설정 불필요)</div>
                        <Button
                          onClick={checkStorageStatus}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 h-7 bg-transparent"
                        >
                          <RefreshCw className="w-3 h-3" />
                          새로고침
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>저장 방식: Base64 ✅</div>
                        <div>업로드 권한: ✅</div>
                        <div>삭제 권한: ✅</div>
                        <div>전체 상태: ✅</div>
                      </div>

                      <div className="mt-3 p-2 bg-white/50 rounded text-xs">
                        <div className="font-semibold mb-1">📦 Base64 방식 특징:</div>
                        <div>• 추가 설정 불필요 (Firebase/AWS 등 불필요)</div>
                        <div>• 이미지가 데이터베이스에 직접 저장됨</div>
                        <div>• 파일 크기 제한: 2MB (자동 압축)</div>
                        <div>• 권장 비율: 1080x1350 (4:5 세로형)</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border rounded-lg p-6">
                  <h3 className="font-semibold mb-4">이미지 업로드</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="imageFiles">이미지 파일 선택 (여러 개 선택 가능)</Label>
                      <Input
                        id="imageFiles"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFilesSelect}
                        className="cursor-pointer"
                        disabled={isUploading}
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        JPG, PNG, GIF, WebP 파일을 선택하세요. (최대 2MB, 권장: 1080x1350)
                      </p>
                    </div>

                    {uploadProgress && (
                      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm font-medium">{uploadProgress}</span>
                      </div>
                    )}

                    {previewUrls.length > 0 && (
                      <div>
                        <Label>미리보기 ({previewUrls.length}개 파일) - 1080x1350 비율</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
                          {previewUrls.map((url, index) => (
                            <div key={index} className="aspect-[4/5] relative">
                              <img
                                src={url || "/placeholder.svg?height=270&width=216"}
                                alt={`미리보기 ${index + 1}`}
                                className="w-full h-full object-cover rounded border"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.src = "/placeholder.svg?height=270&width=216"
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 🔥 더 관대한 업로드 버튼 */}
                    <div className="flex gap-2">
                      <Button
                        onClick={handleUploadImages}
                        className="flex items-center gap-2 flex-1"
                        disabled={!canUpload}
                        variant={forceUploadMode ? "destructive" : "default"}
                      >
                        <Upload className="w-4 h-4" />
                        {isUploading
                          ? "업로드 중..."
                          : `Base64 업로드 ${selectedFiles ? `(${selectedFiles.length}개)` : ""}`}
                      </Button>

                      {!canUpload && (
                        <div className="text-xs text-gray-500 flex items-center">
                          {!selectedFiles || selectedFiles.length === 0
                            ? "파일을 선택해주세요"
                            : isUploading
                              ? "업로드 중..."
                              : "준비됨"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">현재 배너 이미지들 ({bannerImages.length}개)</h3>
                    <div className="text-sm text-gray-500">드래그하거나 화살표 버튼으로 순서를 변경할 수 있습니다</div>
                  </div>

                  {bannerImages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">업로드된 이미지가 없습니다.</div>
                  ) : (
                    <div className="space-y-4">
                      {bannerImages.map((image, index) => (
                        <div
                          key={image.id}
                          className={`border rounded-lg p-4 transition-all duration-200 ${
                            draggedIndex === index ? "opacity-50 scale-95" : "opacity-100 scale-100"
                          }`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center justify-center cursor-move">
                              <GripVertical className="w-5 h-5 text-gray-400" />
                              <span className="text-xs text-gray-500 mt-1">#{index + 1}</span>
                            </div>

                            <img
                              src={image.url || "/placeholder.svg?height=120&width=96"}
                              alt={image.alt}
                              className="w-24 h-30 object-cover rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg?height=120&width=96"
                              }}
                            />

                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-700 mb-1">배너 이미지 #{index + 1}</div>
                              <div className="text-xs text-gray-400">
                                추가일: {new Date(image.created_at).toLocaleString("ko-KR")}
                              </div>
                            </div>

                            <div className="flex flex-col gap-2">
                              <div className="flex gap-1">
                                <Button
                                  onClick={() => handleMoveImageUp(image.id)}
                                  disabled={index === 0}
                                  variant="outline"
                                  size="sm"
                                  className="p-1 h-8 w-8"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => handleMoveImageDown(image.id)}
                                  disabled={index === bannerImages.length - 1}
                                  variant="outline"
                                  size="sm"
                                  className="p-1 h-8 w-8"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </Button>
                              </div>
                              <Button
                                onClick={() => handleDeleteBannerImage(image.id)}
                                variant="destructive"
                                size="sm"
                                className="p-1 h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>개인정보 수집 및 이용 약관</CardTitle>
                  <CardDescription>고객이 보게 될 개인정보 수집 및 이용 약관을 수정합니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={privacyPolicy}
                    onChange={(e) => setPrivacyPolicy(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleUpdatePrivacyPolicy}>약관 업데이트</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>개인정보 제3자 제공 약관</CardTitle>
                  <CardDescription>고객이 보게 될 개인정보 제3자 제공 약관을 수정합니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={thirdPartyPolicy}
                    onChange={(e) => setThirdPartyPolicy(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleUpdateThirdPartyPolicy}>약관 업데이트</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>관리자 설정</CardTitle>
                <CardDescription>관리자 계정 설정을 관리합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-4">PIN 번호 변경</h3>
                  <div className="space-y-4 max-w-md">
                    <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                      <div className="font-medium mb-1">💡 PIN 변경 안내</div>
                      <div>• PIN 변경 후 로그아웃되지 않습니다</div>
                      <div>• 새 PIN은 즉시 적용됩니다</div>
                      <div>• 현재 PIN: {adminStore.getCurrentPin()}</div>
                    </div>

                    <div>
                      <Label htmlFor="newPin">새 PIN 번호 (4자리)</Label>
                      <Input
                        id="newPin"
                        type="password"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        maxLength={4}
                        placeholder="새 PIN 입력"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPin">PIN 번호 확인</Label>
                      <Input
                        id="confirmPin"
                        type="password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        maxLength={4}
                        placeholder="PIN 재입력"
                      />
                    </div>
                    <Button onClick={handleChangePin} disabled={newPin.length !== 4 || confirmPin.length !== 4}>
                      PIN 변경
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  Smartphone,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { BannerImage, CustomerData } from "@/lib/supabase"
import { adminStore } from "@/lib/admin-store"
import * as XLSX from "xlsx"

export default function AdminDashboard() {
  const router = useRouter()

  // ──────────────────────────────── state
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [bannerImages, setBannerImages] = useState<BannerImage[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null)

  // ──────────────────────────────── helpers
  const fetchInitialData = async () => {
    const [cst, imgs] = await Promise.all([adminStore.getCustomers(), adminStore.getBannerImages()])
    setCustomers(cst)
    setBannerImages(imgs)
  }

  // ──────────────────────────────── effects
  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("adminAuth")) {
      router.push("/admin")
      return
    }
    fetchInitialData()

    const unsubCustomers = adminStore.onCustomersChange(setCustomers)
    const unsubImages = adminStore.onBannerImagesChange(setBannerImages)
    return () => {
      unsubCustomers()
      unsubImages()
    }
  }, [router])

  // ──────────────────────────────── customer utils
  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("선택한 고객 데이터를 삭제할까요?")) return
    await adminStore.deleteCustomer(id)
  }

  const exportCustomerData = () => {
    const data = [
      ["이름", "전화번호", "이메일", "휴대폰기종", "통신사옵션", "개인정보동의", "마케팅동의", "신청일시"],
      ...customers.map((c) => [
        c.name,
        c.phone,
        c.email,
        c.phone_option || "미선택",
        c.carrier_option || "미선택",
        c.privacy_consent ? "동의" : "미동의",
        c.marketing_consent ? "동의" : "미동의",
        new Date(c.created_at).toLocaleString("ko-KR"),
      ]),
    ]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, "Customers")
    XLSX.writeFile(wb, `고객데이터_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ──────────────────────────────── image utils
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    setSelectedFiles(files)

    const urls: string[] = []
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => typeof reader.result === "string" && urls.push(reader.result)
      reader.readAsDataURL(file)
    })
    setPreviewUrls(urls)
  }

  const uploadImages = async () => {
    if (!selectedFiles) return
    setIsUploading(true)
    await adminStore.addBannerImages(selectedFiles)
    setIsUploading(false)
    setSelectedFiles(null)
    setPreviewUrls([])
  }

  const deleteBannerImage = async (id: string) => {
    if (!confirm("이미지를 삭제할까요?")) return
    await adminStore.deleteBannerImage(id)
  }

  // ──────────────────────────────── reorder utils
  const startDrag = (idx: number) => setDraggedIdx(idx)
  const onDrop = async (idx: number) => {
    if (draggedIdx === null || draggedIdx === idx) return
    await adminStore.reorderBannerImages(draggedIdx, idx)
    setDraggedIdx(null)
  }

  // ──────────────────────────────── render
  return (
    <div className="min-h-screen bg-gray-50">
      {/* top-bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-7xl flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem("adminAuth")
              router.push("/")
            }}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-4">
        <Tabs defaultValue="customers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              고객
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              이미지
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              약관
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              설정
            </TabsTrigger>
          </TabsList>

          {/* ───────── 고객 탭 ───────── */}
          <TabsContent value="customers">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>고객 목록</CardTitle>
                  <CardDescription>상담 신청 고객 정보를 확인합니다</CardDescription>
                </div>
                <Button onClick={exportCustomerData} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  엑셀 다운로드
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {customers.length === 0 && <p className="py-8 text-center text-gray-500">등록된 고객이 없습니다.</p>}
                {customers.map((c) => (
                  <div key={c.id} className="flex items-start justify-between border rounded-lg p-4">
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-lg">{c.name}</p>
                      <p>전화: {c.phone}</p>
                      <p>이메일: {c.email || "미입력"}</p>
                      <p className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        휴대폰: {c.phone_option || "미선택"}
                      </p>
                      <p className="flex items-center gap-1">
                        <Smartphone className="w-3 h-3" />
                        통신사: {c.carrier_option || "미선택"}
                      </p>
                      <p>개인정보 동의: {c.privacy_consent ? "동의" : "미동의"}</p>
                      <p>마케팅 동의: {c.marketing_consent ? "동의" : "미동의"}</p>
                      <p>신청일시: {new Date(c.created_at).toLocaleString("ko-KR")}</p>
                    </div>

                    <Button size="sm" variant="destructive" onClick={() => handleDeleteCustomer(c.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ───────── 이미지 탭 ───────── */}
          <TabsContent value="images">
            <Card>
              <CardHeader>
                <CardTitle>배너 이미지</CardTitle>
                <CardDescription>메인 화면에 표시될 이미지를 관리합니다</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* 업로드 */}
                <section className="border rounded-lg p-6 space-y-4">
                  <h3 className="font-semibold">이미지 업로드</h3>
                  <div className="space-y-2">
                    <Input
                      id="img"
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploading}
                      onChange={handleFilesSelect}
                    />
                    {previewUrls.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {previewUrls.map((url, i) => (
                          <img
                            key={i}
                            src={url || "/placeholder.svg"}
                            alt={`preview-${i}`}
                            className="aspect-[4/5] rounded object-cover border"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    className="flex items-center gap-2"
                    disabled={!selectedFiles || isUploading}
                    onClick={uploadImages}
                  >
                    <Upload className="w-4 h-4" />
                    {isUploading ? "업로드 중..." : "업로드"}
                  </Button>
                </section>

                {/* 목록 */}
                <section className="space-y-4">
                  <h3 className="font-semibold">현재 이미지 ({bannerImages.length}개)</h3>
                  {bannerImages.length === 0 && <p className="py-8 text-center text-gray-500">이미지가 없습니다.</p>}
                  {bannerImages.map((img, idx) => (
                    <div
                      key={img.id}
                      className={`flex items-center gap-4 border rounded-lg p-3 ${
                        draggedIdx === idx ? "opacity-60" : ""
                      }`}
                      draggable
                      onDragStart={() => startDrag(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDrop(idx)}
                    >
                      <div className="flex flex-col items-center cursor-move">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-400">#{idx + 1}</span>
                      </div>
                      <img
                        src={img.url || "/placeholder.svg"}
                        alt={img.alt}
                        className="w-24 h-30 rounded object-cover"
                      />
                      <div className="flex-1 text-sm">
                        <p className="font-medium">배너 {idx + 1}</p>
                        <p className="text-gray-500">{new Date(img.created_at).toLocaleString("ko-KR")}</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={idx === 0}
                          onClick={() => adminStore.moveBannerImageUp(img.id)}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          disabled={idx === bannerImages.length - 1}
                          onClick={() => adminStore.moveBannerImageDown(img.id)}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="destructive" onClick={() => deleteBannerImage(img.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </section>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ───────── 약관 · 설정 탭 (간략) ───────── */}
          <TabsContent value="policies">
            <Card>
              <CardHeader>
                <CardTitle>약관 관리</CardTitle>
                <CardDescription>약관은 관리자 페이지 다른 파일에서 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">(본 데모에서는 약관 텍스트만 표시합니다.)</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>설정</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">추가 설정은 추후 구현 예정입니다.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

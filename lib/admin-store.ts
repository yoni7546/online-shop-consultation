"use client"

import { supabase, type CustomerData, type BannerImage } from "./supabase"
import { base64StorageHelpers } from "./base64-storage"
import { formatFileSize, validateImageFile } from "./image-utils"

export interface ConsultationStatus {
  name: string
  status: string
  time: string
}

class AdminStore {
  private static instance: AdminStore
  private defaultPin = "8673"

  private privacyPolicy = `개인정보 수집 및 이용에 관한 동의

1. 개인정보 수집 목적: 상담 서비스 제공
2. 수집하는 개인정보 항목: 이름, 전화번호, 이메일
3. 개인정보 보유 및 이용기간: 상담 완료 후 1년
4. 동의 거부권: 개인정보 수집에 동의하지 않을 권리가 있으며, 동의 거부 시 상담 서비스 이용이 제한될 수 있습니다.`

  private thirdPartyPolicy = `개인정보 제3자 제공에 관한 동의

1. 제공받는 자: 상담 서비스 제공업체
2. 제공 목적: 전문 상담 서비스 제공
3. 제공하는 개인정보 항목: 이름, 전화번호
4. 보유 및 이용기간: 상담 완료 후 6개월`

  static getInstance(): AdminStore {
    if (!AdminStore.instance) {
      AdminStore.instance = new AdminStore()
    }
    return AdminStore.instance
  }

  // 🔐 PIN 관리 (localStorage 사용)
  private getPinFromStorage(): string {
    if (typeof window === "undefined") return this.defaultPin

    const storedPin = localStorage.getItem("admin_pin")
    return storedPin || this.defaultPin
  }

  private savePinToStorage(pin: string): void {
    if (typeof window === "undefined") return

    localStorage.setItem("admin_pin", pin)
    console.log("✅ PIN이 localStorage에 저장되었습니다:", pin)
  }

  verifyPin(inputPin: string): boolean {
    const currentPin = this.getPinFromStorage()
    console.log("🔍 PIN 검증:", { input: inputPin, stored: currentPin })
    return currentPin === inputPin
  }

  changePin(newPin: string): void {
    console.log("🔄 PIN 변경 시작:", { old: this.getPinFromStorage(), new: newPin })

    this.savePinToStorage(newPin)

    // 변경 확인
    const verifyNewPin = this.getPinFromStorage()
    console.log("✅ PIN 변경 완료 및 확인:", verifyNewPin)
  }

  getCurrentPin(): string {
    return this.getPinFromStorage()
  }

  // 테이블 존재 여부 확인
  async ensureTablesExist(): Promise<void> {
    try {
      const { error: customersError } = await supabase.from("customers").select("id").limit(1)
      const { error: bannerError } = await supabase.from("banner_images").select("id").limit(1)

      if (customersError?.code === "42P01") {
        throw new Error("customers 테이블이 존재하지 않습니다. create-tables.sql 스크립트를 실행해주세요.")
      }

      if (bannerError?.code === "42P01") {
        throw new Error("banner_images 테이블이 존재하지 않습니다. create-tables.sql 스크립트를 실행해주세요.")
      }

      console.log("✅ 모든 테이블이 존재합니다.")
    } catch (e) {
      console.error("테이블 확인 중 오류:", e)
      throw e
    }
  }

  // 고객 데이터 관리
  async addCustomer(customer: Omit<CustomerData, "id" | "created_at">): Promise<void> {
    try {
      await this.ensureTablesExist()

      const { data, error } = await supabase.from("customers").insert([customer]).select()

      if (error) {
        throw new Error(`고객 데이터 저장 실패: ${error.message}`)
      }

      console.log("✅ Customer added successfully:", data)
    } catch (e: any) {
      console.error("❌ Error adding customer: ", e)
      throw e
    }
  }

  async getCustomers(): Promise<CustomerData[]> {
    try {
      const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false })

      if (error) {
        if (error.code === "42P01") {
          return []
        }
        throw error
      }

      return data || []
    } catch (e: any) {
      console.error("❌ Error fetching customers: ", e)
      return []
    }
  }

  onCustomersChange(callback: (customers: CustomerData[]) => void): () => void {
    const subscription = supabase
      .channel("customers_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, async () => {
        const customers = await this.getCustomers()
        callback(customers)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id)

      if (error) {
        throw new Error(`고객 데이터 삭제 실패: ${error.message}`)
      }

      console.log("✅ Customer deleted successfully")
    } catch (e) {
      console.error("❌ Error deleting customer: ", e)
      throw e
    }
  }

  // 📦 Base64 방식 이미지 업로드 (추가 설정 불필요!)
  async addBannerImages(files: FileList): Promise<{ success: number; errors: string[] }> {
    try {
      await this.ensureTablesExist()

      const results = {
        success: 0,
        errors: [] as string[],
      }

      // 현재 최대 order_index 찾기
      const { data: maxOrderData } = await supabase
        .from("banner_images")
        .select("order_index")
        .order("order_index", { ascending: false })
        .limit(1)

      const currentMaxOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order_index : 0

      console.log(`📦 Base64 방식으로 ${files.length}개 이미지 업로드 시작...`)

      // 병렬 업로드 처리
      const uploadPromises = Array.from(files).map(async (file, index) => {
        try {
          console.log(`🖼️ Processing ${file.name} (${formatFileSize(file.size)})`)

          // 1. 파일 검증 및 크기 제한 (Base64는 2MB로 제한)
          const validation = validateImageFile(file)
          if (!validation.isValid) {
            throw new Error(validation.error || "파일 검증 실패")
          }

          // 2. 큰 파일은 압축
          let processedFile = file
          if (file.size > 1024 * 1024) {
            // 1MB 이상이면 압축
            console.log(`🔄 이미지 압축 중: ${file.name}`)
            processedFile = await base64StorageHelpers.compressImage(file, 800, 0.7)
            console.log(`✅ 압축 완료: ${formatFileSize(file.size)} → ${formatFileSize(processedFile.size)}`)
          }

          // 3. Base64로 변환 (안전한 처리)
          const fileName = base64StorageHelpers.generateFileName(file.name)
          let base64Url: string
          let storagePath: string

          try {
            const uploadResult = await base64StorageHelpers.uploadFile(processedFile, fileName)
            base64Url = uploadResult.url
            storagePath = uploadResult.path

            // Base64 문자열 유효성 재검증
            if (!base64Url || !base64Url.startsWith("data:image/")) {
              throw new Error("Base64 변환 결과가 유효하지 않습니다")
            }
          } catch (conversionError: any) {
            throw new Error(`Base64 변환 실패: ${conversionError.message}`)
          }

          console.log(`📦 Base64 변환 완료: ${file.name}`)

          // 4. Supabase 데이터베이스에 Base64 데이터 저장
          const { data, error } = await supabase
            .from("banner_images")
            .insert([
              {
                url: base64Url, // 검증된 Base64 문자열
                alt: `배너 이미지 ${currentMaxOrder + index + 1}`,
                order_index: currentMaxOrder + index + 1,
                file_name: fileName,
                file_size: processedFile.size,
                storage_path: storagePath,
              },
            ])
            .select()

          if (error) {
            throw new Error(`DB 저장 실패: ${error.message}`)
          }

          console.log(`✅ ${file.name} 업로드 완료 (Base64 → Supabase)`)
          return { success: true, fileName: file.name }
        } catch (error: any) {
          console.error(`❌ Error uploading ${file.name}:`, error)
          return { success: false, fileName: file.name, error: error.message }
        }
      })

      // 모든 업로드 완료 대기
      const uploadResults = await Promise.all(uploadPromises)

      // 결과 집계
      uploadResults.forEach((result) => {
        if (result.success) {
          results.success++
        } else {
          results.errors.push(`${result.fileName}: ${result.error}`)
        }
      })

      console.log(`🎉 Base64 업로드 완료: ${results.success}개 성공, ${results.errors.length}개 실패`)
      return results
    } catch (e: any) {
      console.error("❌ Base64 배치 업로드 오류:", e)
      throw e
    }
  }

  async getBannerImages(): Promise<BannerImage[]> {
    try {
      const { data, error } = await supabase
        .from("banner_images")
        .select("*")
        .order("order_index", { ascending: false })

      if (error) {
        if (error.code === "42P01") {
          return []
        }
        throw error
      }

      return data || []
    } catch (e: any) {
      console.error("❌ Error fetching banner images: ", e)
      return []
    }
  }

  onBannerImagesChange(callback: (images: BannerImage[]) => void): () => void {
    const subscription = supabase
      .channel("banner_images_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "banner_images" }, async () => {
        const images = await this.getBannerImages()
        callback(images)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }

  // Base64 방식 이미지 삭제 (DB에서만 삭제)
  async deleteBannerImage(id: string): Promise<void> {
    try {
      // Base64 방식에서는 DB에서만 삭제하면 됨
      const { error } = await supabase.from("banner_images").delete().eq("id", id)

      if (error) {
        throw new Error(`DB 삭제 실패: ${error.message}`)
      }

      console.log("✅ 이미지 삭제 완료 (Base64 방식)")
    } catch (e) {
      console.error("❌ Error deleting banner image:", e)
      throw e
    }
  }

  // 순서 변경 최적화
  async moveBannerImageUp(id: string): Promise<void> {
    try {
      const images = await this.getBannerImages()
      const index = images.findIndex((image) => image.id === id)

      if (index > 0) {
        const currentImage = images[index]
        const prevImage = images[index - 1]

        await Promise.all([
          supabase.from("banner_images").update({ order_index: prevImage.order_index }).eq("id", currentImage.id),
          supabase.from("banner_images").update({ order_index: currentImage.order_index }).eq("id", prevImage.id),
        ])
      }
    } catch (e) {
      console.error("❌ Error moving image up:", e)
      throw e
    }
  }

  async moveBannerImageDown(id: string): Promise<void> {
    try {
      const images = await this.getBannerImages()
      const index = images.findIndex((image) => image.id === id)

      if (index < images.length - 1) {
        const currentImage = images[index]
        const nextImage = images[index + 1]

        await Promise.all([
          supabase.from("banner_images").update({ order_index: nextImage.order_index }).eq("id", currentImage.id),
          supabase.from("banner_images").update({ order_index: currentImage.order_index }).eq("id", nextImage.id),
        ])
      }
    } catch (e) {
      console.error("❌ Error moving image down:", e)
      throw e
    }
  }

  async reorderBannerImages(startIndex: number, endIndex: number): Promise<void> {
    if (startIndex === endIndex) return

    try {
      const images = await this.getBannerImages()

      if (startIndex < 0 || startIndex >= images.length || endIndex < 0 || endIndex >= images.length) {
        return
      }

      const reordered = [...images]
      const [moved] = reordered.splice(startIndex, 1)
      reordered.splice(endIndex, 0, moved)

      const updatePromises = reordered.map((image, i) =>
        supabase
          .from("banner_images")
          .update({ order_index: reordered.length - i })
          .eq("id", image.id),
      )

      await Promise.all(updatePromises)
      console.log("✅ Images reordered successfully")
    } catch (e) {
      console.error("❌ Error reordering images:", e)
      throw e
    }
  }

  // Base64 Storage 상태 확인 (항상 준비됨)
  async getStorageStatus(): Promise<{
    isReady: boolean
    bucketExists: boolean
    canUpload: boolean
    canDelete: boolean
    error?: string
  }> {
    try {
      const status = await base64StorageHelpers.checkStorageStatus()
      return {
        isReady: status.isReady,
        bucketExists: true, // Base64는 별도 버킷 불필요
        canUpload: status.canUpload,
        canDelete: status.canDelete,
        error: status.error,
      }
    } catch (error: any) {
      return {
        isReady: false,
        bucketExists: false,
        canUpload: false,
        canDelete: false,
        error: error.message,
      }
    }
  }

  // 약관 관리 (localStorage 사용)
  getPrivacyPolicy(): string {
    if (typeof window === "undefined") return this.privacyPolicy

    const stored = localStorage.getItem("privacy_policy")
    return stored || this.privacyPolicy
  }

  updatePrivacyPolicy(policy: string): void {
    if (typeof window === "undefined") return

    localStorage.setItem("privacy_policy", policy)
    console.log("✅ 개인정보 약관이 localStorage에 저장되었습니다")
  }

  getThirdPartyPolicy(): string {
    if (typeof window === "undefined") return this.thirdPartyPolicy

    const stored = localStorage.getItem("third_party_policy")
    return stored || this.thirdPartyPolicy
  }

  updateThirdPartyPolicy(policy: string): void {
    if (typeof window === "undefined") return

    localStorage.setItem("third_party_policy", policy)
    console.log("✅ 제3자 제공 약관이 localStorage에 저장되었습니다")
  }
}

export const adminStore = AdminStore.getInstance()

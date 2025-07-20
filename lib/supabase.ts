import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "❌ Supabase 환경 변수가 설정되지 않았습니다.\n" +
      "NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 추가해 주세요.",
  )
}

// 🔍 환경변수 디버깅 정보
console.log("🔍 Supabase 연결 정보:")
console.log("URL:", supabaseUrl?.substring(0, 30) + "...")
console.log("Key:", supabaseAnonKey?.substring(0, 20) + "...")

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 데이터베이스 타입 정의
export interface CustomerData {
  id: string
  name: string
  phone: string
  email: string
  phone_option: string // 🆕 휴대폰 기종 옵션 추가
  carrier_option: string // 통신사 옵션
  created_at: string
  privacy_consent: boolean
  marketing_consent: boolean
}

export interface BannerImage {
  id: string
  url: string
  alt: string
  created_at: string
  order_index: number
  file_name?: string
  file_size?: number
  storage_path?: string
}

export interface ConsultationStatus {
  name: string
  status: string
  time: string
}

// Storage 버킷 이름
export const STORAGE_BUCKET = "banner-images"

// Storage 헬퍼 함수들
export const storageHelpers = {
  // 🔍 전체 버킷 목록 확인 (디버깅용)
  async listAllBuckets(): Promise<{ buckets: any[]; error?: string }> {
    try {
      console.log("🔍 전체 버킷 목록 조회 중...")
      const { data, error } = await supabase.storage.listBuckets()

      if (error) {
        console.error("❌ listBuckets 오류:", error)
        return { buckets: [], error: error.message }
      }

      console.log("📋 발견된 버킷들:", data?.map((b) => b.id) || [])
      return { buckets: data || [], error: undefined }
    } catch (error: any) {
      console.error("❌ listBuckets 예외:", error)
      return { buckets: [], error: error.message }
    }
  },

  // 🔍 더 정확한 버킷 존재 확인
  async bucketExists(): Promise<boolean> {
    try {
      console.log(`🔍 "${STORAGE_BUCKET}" 버킷 존재 여부 확인 중...`)

      // 1. 전체 버킷 목록으로 확인 (더 안전함)
      const { buckets, error: listError } = await this.listAllBuckets()

      if (listError) {
        console.error("❌ 버킷 목록 조회 실패:", listError)
        return false
      }

      const bucketExists = buckets.some((bucket) => bucket.id === STORAGE_BUCKET)
      console.log(`🔍 "${STORAGE_BUCKET}" 버킷 존재: ${bucketExists ? "✅ 예" : "❌ 아니오"}`)

      if (!bucketExists) {
        console.log("📋 현재 존재하는 버킷들:", buckets.map((b) => `"${b.id}"`).join(", "))
      }

      return bucketExists
    } catch (error: any) {
      console.error("❌ 버킷 확인 중 예외:", error.message)
      return false
    }
  },

  // 버킷 상태 확인 (상세 정보 포함)
  async getBucketInfo(): Promise<{ exists: boolean; info?: any; error?: string }> {
    try {
      const { data, error } = await supabase.storage.getBucket(STORAGE_BUCKET)

      if (error) {
        return { exists: false, error: error.message }
      }

      return { exists: !!data, info: data }
    } catch (error: any) {
      return { exists: false, error: error.message }
    }
  },

  // 🚀 더 안전한 파일 업로드
  async uploadFile(file: File, fileName: string): Promise<{ url: string; path: string }> {
    try {
      console.log(`🚀 파일 업로드 시작: ${fileName}`)

      // 1. 버킷 존재 확인 (더 정확한 방법)
      const bucketExists = await this.bucketExists()

      if (!bucketExists) {
        // 현재 존재하는 버킷들 표시
        const { buckets } = await this.listAllBuckets()
        const existingBuckets = buckets.map((b) => `"${b.id}"`).join(", ")

        throw new Error(
          `❌ Storage 버킷 "${STORAGE_BUCKET}"가 존재하지 않습니다.\n\n` +
            `🔍 현재 존재하는 버킷들: ${existingBuckets || "없음"}\n\n` +
            `🔧 해결방법:\n` +
            `1. Supabase 프로젝트 URL 확인 (올바른 프로젝트인지)\n` +
            `2. 대시보드에서 정확히 "banner-images" 이름으로 버킷 생성\n` +
            `3. Public bucket으로 설정\n` +
            `4. 브라우저 캐시 삭제 후 새로고침`,
        )
      }

      // 2. 파일 업로드 시도
      console.log(`☁️ Storage 업로드 시도: ${fileName}`)
      let data, error
      try {
        ;({ data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(fileName, file, { cacheControl: "3600", upsert: false }))
      } catch (uploadEx: any) {
        // Network-level "Bucket not found" often bubbles as an exception
        if (uploadEx.message?.includes("bucket") && uploadEx.message?.includes("not found")) {
          throw new Error(
            `Storage 버킷 "${STORAGE_BUCKET}" 을(를) 찾을 수 없습니다.\n\n` +
              `Supabase 대시보드 → Storage → Create bucket\n` +
              `버킷 이름: banner-images, Public 체크 후 다시 시도하세요.`,
          )
        }
        throw uploadEx
      }

      // 3. 공개 URL 생성
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path)

      console.log(`✅ 업로드 성공: ${fileName} → ${urlData.publicUrl}`)
      return {
        url: urlData.publicUrl,
        path: data.path,
      }
    } catch (error: any) {
      console.error("❌ Storage upload error:", error)
      throw error
    }
  },

  // 파일 삭제
  async deleteFile(storagePath: string): Promise<void> {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])

    if (error) {
      console.error("Storage 파일 삭제 오류:", error)
      // 파일이 이미 없는 경우는 성공으로 처리
      if (!error.message.includes("not found")) {
        throw error
      }
    }
  },

  // 고유 파일명 생성
  generateFileName(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = originalName.split(".").pop()?.toLowerCase() || "jpg"
    return `banner_${timestamp}_${random}.${extension}`
  },

  // 🔍 더 정확한 Storage 상태 진단
  async diagnoseStorage(): Promise<{
    bucketExists: boolean
    canUpload: boolean
    canDelete: boolean
    error?: string
    details?: any
  }> {
    try {
      console.log("🔍 Storage 진단 시작...")

      // 0. 환경변수 확인
      console.log("🔍 환경변수 확인:")
      console.log("- SUPABASE_URL:", supabaseUrl?.substring(0, 50) + "...")
      console.log("- SUPABASE_KEY:", supabaseAnonKey?.substring(0, 30) + "...")

      // 1. 전체 버킷 목록 확인
      const { buckets, error: listError } = await this.listAllBuckets()

      if (listError) {
        return {
          bucketExists: false,
          canUpload: false,
          canDelete: false,
          error: `버킷 목록 조회 실패: ${listError}`,
          details: { step: "list_buckets", error: listError },
        }
      }

      // 2. 타겟 버킷 존재 확인
      const bucketExists = buckets.some((bucket) => bucket.id === STORAGE_BUCKET)
      console.log(`🗂️ "${STORAGE_BUCKET}" 버킷 존재: ${bucketExists}`)

      if (!bucketExists) {
        return {
          bucketExists: false,
          canUpload: false,
          canDelete: false,
          error: `버킷 "${STORAGE_BUCKET}"이 존재하지 않습니다.`,
          details: {
            step: "bucket_check",
            bucketName: STORAGE_BUCKET,
            existingBuckets: buckets.map((b) => b.id),
            totalBuckets: buckets.length,
          },
        }
      }

      // 3. 버킷 정보 가져오기
      const bucketInfo = await this.getBucketInfo()
      console.log("🗂️ 버킷 정보:", bucketInfo)

      // 4. 테스트 파일로 권한 확인
      const testFileName = `test_${Date.now()}.txt`
      const testFile = new File(["test"], testFileName, { type: "text/plain" })

      try {
        console.log("🧪 업로드 권한 테스트...")

        // 업로드 테스트
        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(testFileName, testFile)

        if (uploadError) {
          console.error("❌ 업로드 테스트 실패:", uploadError)
          return {
            bucketExists: true,
            canUpload: false,
            canDelete: false,
            error: `업로드 권한 없음: ${uploadError.message}`,
            details: { step: "upload_test", error: uploadError },
          }
        }

        console.log("🧪 삭제 권한 테스트...")

        // 삭제 테스트
        const { error: deleteError } = await supabase.storage.from(STORAGE_BUCKET).remove([testFileName])

        const result = {
          bucketExists: true,
          canUpload: true,
          canDelete: !deleteError,
          error: deleteError ? `삭제 권한 없음: ${deleteError.message}` : undefined,
          details: {
            step: "complete",
            bucketInfo: bucketInfo.info,
            deleteError: deleteError,
            allBuckets: buckets.map((b) => ({ id: b.id, public: b.public })),
          },
        }

        console.log("✅ Storage 진단 완료:", result)
        return result
      } catch (testError: any) {
        console.error("❌ 권한 테스트 중 예외:", testError)
        return {
          bucketExists: true,
          canUpload: false,
          canDelete: false,
          error: `권한 테스트 실패: ${testError.message}`,
          details: { step: "permission_test", error: testError },
        }
      }
    } catch (error: any) {
      console.error("❌ Storage 진단 중 예외:", error)
      return {
        bucketExists: false,
        canUpload: false,
        canDelete: false,
        error: `진단 실패: ${error.message}`,
        details: { step: "diagnosis_error", error: error },
      }
    }
  },
}

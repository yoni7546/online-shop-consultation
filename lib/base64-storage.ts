import { validateImageFile, formatFileSize } from "./image-utils"

// Base64 이미지 저장 헬퍼 함수들
export const base64StorageHelpers = {
  // 🖼️ 파일을 Base64로 변환
  async convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result)
        } else {
          reject(new Error("Base64 변환 실패"))
        }
      }
      reader.onerror = () => reject(new Error("파일 읽기 실패"))
      reader.readAsDataURL(file)
    })
  },

  // 🚀 파일 업로드 (Base64로 변환)
  async uploadFile(file: File, fileName: string): Promise<{ url: string; path: string }> {
    try {
      console.log(`📦 Base64 변환 시작: ${fileName}`)

      // 1. 파일 검증
      const validation = validateImageFile(file)
      if (!validation.isValid) {
        throw new Error(validation.error || "파일 검증 실패")
      }

      // 2. 파일 크기 제한 (2MB - Base64는 용량이 더 커짐)
      const maxSize = 2 * 1024 * 1024 // 2MB
      if (file.size > maxSize) {
        throw new Error(`파일 크기가 너무 큽니다. (최대 2MB, 현재: ${formatFileSize(file.size)})
  
권장 사이즈: 1080x1350 (4:5 비율)`)
      }

      // 3. Base64로 변환
      console.log(`🔄 Base64 변환 중: ${file.name} (${formatFileSize(file.size)})`)
      const base64String = await this.convertToBase64(file)

      console.log(`✅ Base64 변환 완료: ${fileName}`)
      return {
        url: base64String, // Base64 문자열이 곧 URL
        path: fileName, // 파일명을 경로로 사용
      }
    } catch (error: any) {
      console.error("❌ Base64 변환 오류:", error)
      throw new Error(`변환 실패: ${error.message}`)
    }
  },

  // 🗑️ 파일 삭제 (Base64는 DB에서만 삭제하면 됨)
  async deleteFile(storagePath: string): Promise<void> {
    // Base64 방식에서는 별도 파일 삭제가 필요 없음
    console.log(`ℹ️ Base64 방식: 파일 삭제 불필요 (${storagePath})`)
  },

  // 📝 고유 파일명 생성
  generateFileName(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = originalName.split(".").pop()?.toLowerCase() || "jpg"
    return `banner_${timestamp}_${random}.${extension}`
  },

  // 🔍 Base64 Storage 상태 확인 (항상 준비됨)
  async checkStorageStatus(): Promise<{
    isReady: boolean
    canUpload: boolean
    canDelete: boolean
    error?: string
  }> {
    console.log("✅ Base64 Storage 상태: 항상 준비됨")
    return {
      isReady: true,
      canUpload: true,
      canDelete: true,
    }
  },

  // 📊 Base64 문자열 크기 계산
  getBase64Size(base64String: string): number {
    // Base64는 원본 크기의 약 1.37배
    const base64Data = base64String.split(",")[1] || base64String
    return Math.ceil((base64Data.length * 3) / 4)
  },

  // 🖼️ 이미지 압축 (1080x1350 비율 최적화)
  async compressImage(file: File, maxWidth = 1080, quality = 0.7): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()

      img.onload = () => {
        try {
          // 1080x1350 비율 (4:5) 계산
          const targetRatio = 4 / 5 // 1080:1350
          const imageRatio = img.width / img.height

          let newWidth, newHeight

          if (imageRatio > targetRatio) {
            // 이미지가 더 넓은 경우 - 높이 기준으로 맞춤
            newHeight = Math.min(1350, img.height)
            newWidth = newHeight * targetRatio
          } else {
            // 이미지가 더 높은 경우 - 너비 기준으로 맞춤
            newWidth = Math.min(1080, img.width)
            newHeight = newWidth / targetRatio
          }

          canvas.width = newWidth
          canvas.height = newHeight

          // 고품질 렌더링
          if (ctx) {
            ctx.imageSmoothingEnabled = true
            ctx.imageSmoothingQuality = "high"

            // 이미지를 캔버스 중앙에 맞춤 (크롭 효과)
            const scale = Math.max(newWidth / img.width, newHeight / img.height)
            const scaledWidth = img.width * scale
            const scaledHeight = img.height * scale
            const offsetX = (newWidth - scaledWidth) / 2
            const offsetY = (newHeight - scaledHeight) / 2

            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)
          }

          // Blob으로 변환
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                reject(new Error("이미지 압축 실패"))
              }
            },
            "image/jpeg",
            quality,
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error("이미지 로드 실패"))
      img.crossOrigin = "anonymous"
      img.src = URL.createObjectURL(file)
    })
  },
}

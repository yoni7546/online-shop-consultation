// 최적화된 이미지 압축 및 리사이즈 유틸리티
export const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      try {
        // 비율 유지하면서 리사이즈
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        canvas.width = img.width * ratio
        canvas.height = img.height * ratio

        // 고품질 렌더링 설정
        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        }

        // Blob으로 변환 (더 효율적)
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
}

// Base64 변환 (Storage 폴백용)
export const convertToBase64 = (file: File): Promise<string> => {
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
}

// WebP 변환 (더 작은 파일 크기)
export const convertToWebP = (file: File, quality = 0.8): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height

      ctx?.drawImage(img, 0, 0)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
              type: "image/webp",
              lastModified: Date.now(),
            })
            resolve(webpFile)
          } else {
            reject(new Error("WebP 변환 실패"))
          }
        },
        "image/webp",
        quality,
      )
    }

    img.onerror = () => reject(new Error("이미지 로드 실패"))
    img.src = URL.createObjectURL(file)
  })
}

// 파일 타입 검증
export const isValidImageFile = (file: File): boolean => {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
  return validTypes.includes(file.type.toLowerCase())
}

// 파일 크기 검증 (5MB 제한)
export const isValidFileSize = (file: File, maxSizeMB = 5): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

// 파일 검증 (타입 + 크기)
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  if (!isValidImageFile(file)) {
    return {
      isValid: false,
      error: "지원하지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP만 가능)",
    }
  }

  if (!isValidFileSize(file, 5)) {
    return {
      isValid: false,
      error: `파일 크기가 너무 큽니다. (최대 5MB, 현재: ${formatFileSize(file.size)})`,
    }
  }

  return { isValid: true }
}

export const getImageSize = (file: File): number => {
  return file.size
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// 이미지 최적화 파이프라인
export const optimizeImage = async (file: File): Promise<File> => {
  try {
    // 파일 검증
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      throw new Error(validation.error)
    }

    // 1. 크기가 큰 경우 압축
    if (file.size > 500 * 1024) {
      // 500KB 이상
      const compressed = await compressImage(file, 1200, 0.7)

      // 2. WebP 변환 시도 (브라우저 지원 확인)
      if (supportsWebP()) {
        return await convertToWebP(compressed, 0.8)
      }

      return compressed
    }

    return file
  } catch (error) {
    console.warn("이미지 최적화 실패, 원본 사용:", error)
    return file
  }
}

// WebP 지원 확인
const supportsWebP = (): boolean => {
  const canvas = document.createElement("canvas")
  canvas.width = 1
  canvas.height = 1
  return canvas.toDataURL("image/webp").indexOf("data:image/webp") === 0
}

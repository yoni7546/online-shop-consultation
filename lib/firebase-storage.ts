import { storage } from "./firebase"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { validateImageFile, formatFileSize } from "./image-utils"

// Firebase Storage 헬퍼 함수들
export const firebaseStorageHelpers = {
  // 🚀 파일 업로드 (Firebase Storage)
  async uploadFile(file: File, fileName: string): Promise<{ url: string; path: string }> {
    try {
      console.log(`🔥 Firebase Storage 업로드 시작: ${fileName}`)

      // 1. 파일 검증
      const validation = validateImageFile(file)
      if (!validation.isValid) {
        throw new Error(validation.error || "파일 검증 실패")
      }

      // 2. Storage 참조 생성
      const storageRef = ref(storage, `banner-images/${fileName}`)

      // 3. 파일 업로드
      console.log(`☁️ 업로드 중: ${file.name} (${formatFileSize(file.size)})`)
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
      })

      // 4. 다운로드 URL 가져오기
      const downloadURL = await getDownloadURL(snapshot.ref)

      console.log(`✅ Firebase 업로드 성공: ${fileName}`)
      return {
        url: downloadURL,
        path: snapshot.ref.fullPath,
      }
    } catch (error: any) {
      console.error("❌ Firebase Storage 업로드 오류:", error)

      // 더 친화적인 오류 메시지
      if (error.code === "storage/unauthorized") {
        throw new Error("Firebase Storage 권한이 없습니다. Firebase 콘솔에서 Storage 규칙을 확인해주세요.")
      } else if (error.code === "storage/quota-exceeded") {
        throw new Error("Firebase Storage 용량이 초과되었습니다.")
      } else if (error.code === "storage/invalid-format") {
        throw new Error("지원하지 않는 파일 형식입니다.")
      }

      throw new Error(`업로드 실패: ${error.message}`)
    }
  },

  // 🗑️ 파일 삭제
  async deleteFile(storagePath: string): Promise<void> {
    try {
      console.log(`🗑️ Firebase Storage 파일 삭제: ${storagePath}`)

      const storageRef = ref(storage, storagePath)
      await deleteObject(storageRef)

      console.log(`✅ 파일 삭제 완료: ${storagePath}`)
    } catch (error: any) {
      console.error("❌ Firebase Storage 삭제 오류:", error)

      // 파일이 이미 없는 경우는 성공으로 처리
      if (error.code === "storage/object-not-found") {
        console.log(`ℹ️ 파일이 이미 삭제됨: ${storagePath}`)
        return
      }

      throw new Error(`파일 삭제 실패: ${error.message}`)
    }
  },

  // 📝 고유 파일명 생성
  generateFileName(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = originalName.split(".").pop()?.toLowerCase() || "jpg"
    return `banner_${timestamp}_${random}.${extension}`
  },

  // 🔍 Firebase Storage 상태 확인
  async checkStorageStatus(): Promise<{
    isReady: boolean
    canUpload: boolean
    canDelete: boolean
    error?: string
  }> {
    try {
      console.log("🔍 Firebase Storage 상태 확인...")

      // 테스트 파일로 권한 확인
      const testFileName = `test_${Date.now()}.txt`
      const testFile = new File(["test"], testFileName, { type: "text/plain" })

      try {
        // 업로드 테스트
        const testRef = ref(storage, `test/${testFileName}`)
        await uploadBytes(testRef, testFile)

        // 삭제 테스트
        await deleteObject(testRef)

        console.log("✅ Firebase Storage 상태 정상")
        return {
          isReady: true,
          canUpload: true,
          canDelete: true,
        }
      } catch (testError: any) {
        console.error("❌ Firebase Storage 테스트 실패:", testError)
        return {
          isReady: false,
          canUpload: false,
          canDelete: false,
          error: `권한 테스트 실패: ${testError.message}`,
        }
      }
    } catch (error: any) {
      console.error("❌ Firebase Storage 상태 확인 실패:", error)
      return {
        isReady: false,
        canUpload: false,
        canDelete: false,
        error: `상태 확인 실패: ${error.message}`,
      }
    }
  },
}

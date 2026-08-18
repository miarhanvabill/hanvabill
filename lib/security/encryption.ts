import CryptoJS from "crypto-js"

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-change-in-production"

export class DataEncryption {
  static encryptSensitiveData(data: string): string {
    try {
      return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString()
    } catch (error) {
      console.error("Encryption failed:", error)
      return data // Return original data if encryption fails
    }
  }

  static decryptSensitiveData(encryptedData: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY)
      const decrypted = bytes.toString(CryptoJS.enc.Utf8)
      return decrypted || encryptedData // Return original if decryption fails
    } catch (error) {
      console.error("Decryption failed:", error)
      return encryptedData
    }
  }

  static hashData(data: string): string {
    return CryptoJS.SHA256(data).toString()
  }

  static generateSecureToken(): string {
    return CryptoJS.lib.WordArray.random(32).toString()
  }
}

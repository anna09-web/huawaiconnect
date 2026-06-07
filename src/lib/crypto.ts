import CryptoJS from "crypto-js";

const SECRET = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || "fallback-secret-32-chars-minimum!!";

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET).toString();
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
}

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// Mode local : stockage dans le dossier uploads
const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true })
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  _contentType: string
): Promise<{ s3Key: string; fileHash: string }> {
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')
  const s3Key = `${Date.now()}-${fileHash.substring(0, 8)}-${fileName}`
  const filePath = path.join(UPLOADS_DIR, s3Key)

  fs.writeFileSync(filePath, buffer)

  return { s3Key, fileHash }
}

export async function getFileBuffer(s3Key: string): Promise<Buffer> {
  const filePath = path.join(UPLOADS_DIR, s3Key)
  return fs.readFileSync(filePath)
}

export async function deleteFile(s3Key: string): Promise<void> {
  const filePath = path.join(UPLOADS_DIR, s3Key)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

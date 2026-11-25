export class NoteImageFiles {
  private static readonly ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  private static readonly EXTENSION = /\.(png|jpe?g|gif|webp|avif|bmp|svg|heic|heif|tiff?|ico)$/i
  private static readonly CLIPBOARD_NAME = 'image.png'

  static validId(value: unknown): value is string {
    return typeof value === 'string' && this.ID.test(value)
  }

  static images(files: File[]): File[] {
    return files.filter((file) => this.isImage(file))
  }

  static isImage(file: File): boolean {
    if (file.type) return file.type.startsWith('image/')
    return this.EXTENSION.test(file.name)
  }

  // Every bitmap pasted from the clipboard arrives as "image.png"; a dated name keeps them apart in the file list
  static named(file: File): File {
    if (file.name !== this.CLIPBOARD_NAME) return file
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    const stamp = local.toISOString().slice(0, 19).replace('T', '-').replace(/:/g, '')
    return new File([file], `image-${stamp}.png`, { type: file.type, lastModified: file.lastModified })
  }
}

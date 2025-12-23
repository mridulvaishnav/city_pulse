export function isVideo(mimeType) {
  return mimeType.startsWith("video/");
}

export function isImage(mimeType) {
  return mimeType.startsWith("image/");
}

export function isVideo(mimeType) {
  if (!mimeType) return false;
  return mimeType.startsWith("video/");
}

export function isImage(mimeType) {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
}

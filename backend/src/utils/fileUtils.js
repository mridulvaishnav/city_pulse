import fs from "fs";

export function deleteLocalFile(path) {
  fs.unlink(path, (err) => {
    if (err) console.error("Failed to delete temp file:", err);
  });
}

import { closeSync, constants, fstatSync, openSync, readSync, renameSync, writeFileSync } from "node:fs";

export function readRegularFile(path, limit) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.nlink !== 1 || stat.size > limit) {
      throw new Error(`Expected a regular file no larger than ${limit} bytes.`);
    }
    const bytes = Buffer.alloc(stat.size + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const size = readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (size === 0) break;
      offset += size;
    }
    if (offset !== stat.size) throw new Error("The file changed during the read.");
    return bytes.subarray(0, offset);
  } finally {
    closeSync(fd);
  }
}

export function writeJSON(path, value) {
  const temp = path + ".tmp";
  writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
  renameSync(temp, path);
}

/** A file name from a chart title: lowercase words joined by dashes. */
export function fileName(title: string, extension: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'chart'}.${extension}`;
}

/** Hands a file to the browser's download. */
export function downloadFile(name: string, content: Blob): void {
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

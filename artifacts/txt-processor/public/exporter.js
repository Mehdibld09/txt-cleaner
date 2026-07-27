// Placed on globalThis.Exporter
const Exporter = {
  /**
   * Takes an array of Uint8Array chunks and a filename,
   * creates a Blob, generates a download URL, triggers download.
   */
  download(chunks, filename) {
    const blob = new Blob(chunks, { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'output.txt';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    return blob.size;
  }
};

window.Exporter = Exporter;
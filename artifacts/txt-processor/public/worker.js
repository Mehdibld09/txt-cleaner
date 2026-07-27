importScripts('./processor.js');

let isPaused = false;
let isCancelled = false;
let pauseResolve = null;

// Stats tracking
let stats = { 
  originalLines: 0,
  processedLines: 0,
  duplicatesRemoved: 0,
  emptyRemoved: 0,
  filteredOut: 0,
  exportedLines: 0,
  startTime: 0,
  bytesRead: 0,
  totalBytes: 0,
};

// Output buffering (collect encoded lines, transfer to main thread in chunks)
const OUTPUT_CHUNK_SIZE = 1024 * 1024; // 1MB chunks transferred to main thread
let outputBuffer = [];     // array of strings for current chunk
let outputBufferBytes = 0;
let allOutputLines = [];   // only used when sorting is enabled (must collect all)
const encoder = new TextEncoder();

self.onmessage = async (e) => {
  const { type, file, options } = e.data;

  if (type === 'start') {
    isPaused = false;
    isCancelled = false;
    await processFile(file, options);
  } else if (type === 'pause') {
    isPaused = true;
  } else if (type === 'resume') {
    isPaused = false;
    if (pauseResolve) { pauseResolve(); pauseResolve = null; }
  } else if (type === 'cancel') {
    isCancelled = true;
    isPaused = false;
    if (pauseResolve) { pauseResolve(); pauseResolve = null; }
  }
};

async function waitIfPaused() {
  if (isPaused) {
    await new Promise(resolve => { pauseResolve = resolve; });
  }
}

async function processFile(file, options) {
  const startTime = Date.now();
  let lastProgressTime = startTime;
  const seenKeys = new Set();

  stats = {
    originalLines: 0,
    processedLines: 0,
    duplicatesRemoved: 0,
    emptyRemoved: 0,
    filteredOut: 0,
    exportedLines: 0,
    startTime,
    bytesRead: 0,
    totalBytes: file.size,
  };

  const filter = self.Processor.buildFilter(options);
  let remainder = '';

  const needsSort = options.sortOutput || options.reverseOutput;
  if (needsSort) allOutputLines = [];
  outputBuffer = [];
  outputBufferBytes = 0;

  try {
    const stream = file.stream();
    const decoded = stream.pipeThrough(new TextDecoderStream('utf-8', { fatal: false }));
    const reader = decoded.getReader();

    while (true) {
      if (isCancelled) break;
      await waitIfPaused();

      const { done, value } = await reader.read();

      if (done) {
        // Process the final remainder (last line without newline)
        if (remainder.length > 0) {
          stats.originalLines++;
          await processRawLine(remainder, options, filter, seenKeys, needsSort);
          remainder = '';
        }
        break;
      }

      // Track progress
      stats.bytesRead += encoder.encode(value).length;

      // Split on newlines, handling \r\n and \n
      const chunk = remainder + value;
      const lines = chunk.split('\n');
      remainder = lines.pop(); // last element may be incomplete line

      // Report progress every ~100ms
      const now = Date.now();
      if (now - lastProgressTime > 100) {
        const elapsed = (now - startTime) / 1000;
        const speed = elapsed > 0 ? Math.round(stats.originalLines / elapsed) : 0;
        const progress = stats.totalBytes > 0 ? Math.min(99, Math.round(stats.bytesRead / stats.totalBytes * 100)) : 0;
        const eta = speed > 0 && stats.totalBytes > stats.bytesRead
          ? Math.round((stats.totalBytes - stats.bytesRead) / (stats.bytesRead / elapsed) )
          : 0;

        self.postMessage({
          type: 'progress',
          stats: { ...stats, elapsed, speed, progress, eta }
        });
        lastProgressTime = now;
      }

      for (const rawLine of lines) {
        if (isCancelled) break;
        stats.originalLines++;
        await processRawLine(rawLine, options, filter, seenKeys, needsSort);
      }
    }

    reader.releaseLock();

    if (isCancelled) {
      self.postMessage({ type: 'cancelled', stats });
      return;
    }

    // Handle sort/reverse
    if (needsSort) {
      self.postMessage({ type: 'progress', stats: { ...stats, phase: 'sorting' } });
      if (options.sortOutput) allOutputLines.sort((a, b) => a.localeCompare(b));
      if (options.reverseOutput) allOutputLines.reverse();

      // Now stream the sorted lines to main thread
      for (let i = 0; i < allOutputLines.length; i++) {
        const encoded = encoder.encode(allOutputLines[i] + '\n');
        outputBuffer.push(encoded);
        outputBufferBytes += encoded.byteLength;
        if (outputBufferBytes >= OUTPUT_CHUNK_SIZE) {
          flushOutputBuffer();
        }
      }
      allOutputLines = []; // free memory
    }

    // Flush any remaining output
    flushOutputBuffer(true);

    const elapsed = (Date.now() - startTime) / 1000;
    self.postMessage({
      type: 'done',
      stats: {
        ...stats,
        elapsed,
        speed: elapsed > 0 ? Math.round(stats.originalLines / elapsed) : 0,
        progress: 100,
        eta: 0
      }
    });

  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || 'Processing failed' });
  }
}

async function processRawLine(rawLine, options, filter, seenKeys, needsSort) {
  const normalized = self.Processor.normalizeLine(rawLine, options);

  if (normalized === null) {
    stats.emptyRemoved++;
    return;
  }

  // Deduplication
  if (options.removeDuplicates) {
    const key = self.Processor.dedupKey(normalized, options);
    if (seenKeys.has(key)) {
      stats.duplicatesRemoved++;
      return;
    }
    seenKeys.add(key);
  }

  // Filtering
  if (!filter(normalized)) {
    stats.filteredOut++;
    return;
  }

  // Keep line
  stats.processedLines++;

  if (needsSort) {
    allOutputLines.push(normalized);
  } else {
    const encoded = encoder.encode(normalized + '\n');
    outputBuffer.push(encoded);
    outputBufferBytes += encoded.byteLength;
    if (outputBufferBytes >= OUTPUT_CHUNK_SIZE) {
      flushOutputBuffer();
    }
  }
}

function flushOutputBuffer(isFinal = false) {
  if (outputBuffer.length === 0 && !isFinal) return;
  
  // Merge all buffered Uint8Arrays into one, then transfer
  const total = outputBufferBytes;
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const arr of outputBuffer) {
    merged.set(arr, offset);
    offset += arr.byteLength;
  }
  
  outputBuffer = [];
  outputBufferBytes = 0;
  stats.exportedLines = stats.processedLines; // approximation for in-progress count

  if (merged.length > 0) {
    self.postMessage({ type: 'chunk', chunk: merged, isFinal }, [merged.buffer]);
  } else if (isFinal) {
    self.postMessage({ type: 'chunk', chunk: new Uint8Array(0), isFinal });
  }
}
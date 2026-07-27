self.Processor = {
  /**
   * Normalize a raw line according to options.
   * Returns null if the line should be dropped (empty after normalization).
   */
  normalizeLine(rawLine, options) {
    let line = rawLine;
    // Handle Windows line endings (\r\n already split by stream, but \r may remain)
    if (line.endsWith('\r')) line = line.slice(0, -1);
    // Trim
    if (options.trimSpaces) line = line.trim();
    // Remove multiple spaces
    if (options.ignoreMultipleSpaces) line = line.replace(/\s+/g, ' ');
    // Remove empty
    if (options.removeEmpty && line.length === 0) return null;
    return line;
  },

  /**
   * Compute the dedup key for a normalized line.
   */
  dedupKey(line, options) {
    let key = line;
    if (options.ignoreCase) key = key.toLowerCase();
    if (options.ignoreTrimSpaces) key = key.trim();
    return key;
  },

  /**
   * Compile all filter functions from options. Returns a function that
   * takes a normalized line and returns true if the line should be KEPT.
   */
  buildFilter(options) {
    const filters = [];

    // Keep-keywords (search)
    if (options.keepKeywords && options.keepKeywords.length > 0) {
      const kw = options.keepKeywords;
      if (options.regexMode) {
        const regs = kw.map(k => { try { return new RegExp(k, options.caseSensitive ? '' : 'i'); } catch { return null; } }).filter(Boolean);
        filters.push(line => regs.some(r => r.test(line)));
      } else {
        const lower = options.caseSensitive ? kw : kw.map(k => k.toLowerCase());
        filters.push(line => {
          const hay = options.caseSensitive ? line : line.toLowerCase();
          return lower.some(k => hay.includes(k));
        });
      }
    }

    // Remove-keywords
    if (options.removeKeywords && options.removeKeywords.length > 0) {
      const kw = options.removeKeywords;
      if (options.regexMode) {
        const regs = kw.map(k => { try { return new RegExp(k, options.caseSensitive ? '' : 'i'); } catch { return null; } }).filter(Boolean);
        filters.push(line => !regs.some(r => r.test(line)));
      } else {
        const lower = options.caseSensitive ? kw : kw.map(k => k.toLowerCase());
        filters.push(line => {
          const hay = options.caseSensitive ? line : line.toLowerCase();
          return !lower.some(k => hay.includes(k));
        });
      }
    }

    // Advanced filters
    if (options.startsWith) {
      const sw = options.caseSensitive ? options.startsWith : options.startsWith.toLowerCase();
      filters.push(line => (options.caseSensitive ? line : line.toLowerCase()).startsWith(sw));
    }
    if (options.endsWith) {
      const ew = options.caseSensitive ? options.endsWith : options.endsWith.toLowerCase();
      filters.push(line => (options.caseSensitive ? line : line.toLowerCase()).endsWith(ew));
    }
    if (options.contains) {
      const c = options.caseSensitive ? options.contains : options.contains.toLowerCase();
      filters.push(line => (options.caseSensitive ? line : line.toLowerCase()).includes(c));
    }
    if (options.notContains) {
      const nc = options.caseSensitive ? options.notContains : options.notContains.toLowerCase();
      filters.push(line => !(options.caseSensitive ? line : line.toLowerCase()).includes(nc));
    }
    if (options.minLength > 0) filters.push(line => line.length >= options.minLength);
    if (options.maxLength > 0) filters.push(line => line.length <= options.maxLength);
    if (options.regexInclude) {
      try { const r = new RegExp(options.regexInclude, options.caseSensitive ? '' : 'i'); filters.push(line => r.test(line)); } catch {}
    }
    if (options.regexExclude) {
      try { const r = new RegExp(options.regexExclude, options.caseSensitive ? '' : 'i'); filters.push(line => !r.test(line)); } catch {}
    }

    return line => filters.every(f => f(line));
  }
};
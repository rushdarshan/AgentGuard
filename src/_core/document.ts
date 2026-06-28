export async function extractText(file: { name: string; buffer: Buffer }): Promise<{ text: string; name: string }> {
  const name = file.name;
  const ext = name.toLowerCase().split('.').pop();

  if (ext === 'pdf') {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(file.buffer) });
    try {
      const textResult = await parser.getText();
      const text = textResult.text || '';
      if (!text.trim()) {
        const info = await parser.getInfo();
        if (info.total === 0) throw new Error('No text found in document');
        throw new Error('Could not extract text — document may be scanned images');
      }
      return { text, name };
    } finally {
      await parser.destroy();
    }
  }

  if (ext === 'txt') {
    return { text: file.buffer.toString('utf-8'), name };
  }

  throw new Error('Only PDF and TXT files supported');
}

export function chunkText(text: string, maxWords = 500): string[] {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const wordCount = para.split(/\s+/).filter(w => w.length > 0).length;

    if (currentWordCount + wordCount > maxWords && currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [];
      currentWordCount = 0;
    }

    currentChunk.push(para);
    currentWordCount += wordCount;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }

  return chunks.slice(0, 100);
}

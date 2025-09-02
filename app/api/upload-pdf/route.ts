import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as File;
    const siteName = formData.get('siteName') as string || 'upload';
    const dpi = formData.get('dpi') as string || '150';

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Invalid PDF file' },
        { status: 400 }
      );
    }

    // Create temp directory for upload
    const tempDir = path.join(process.cwd(), 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    // Save uploaded file
    const tempPdfPath = path.join(tempDir, `${siteName}_${Date.now()}.pdf`);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(tempPdfPath, buffer);

    // Output directory for images
    const outputDir = path.join(process.cwd(), 'public', 'plans', siteName.toLowerCase());
    await fs.mkdir(outputDir, { recursive: true });

    // Python script path
    const scriptPath = path.join(process.cwd(), 'extraction', 'convert_pdf_to_images.py');

    // Run Python conversion script
    const command = `cd extraction && python3 -c "
import sys
sys.path.insert(0, '.')
from convert_pdf_to_images import convert_pdf_to_images
metadata = convert_pdf_to_images('${tempPdfPath}', '${outputDir}', dpi=${dpi})
print(metadata['total_pages'])
"`;

    try {
      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('✓')) {
        console.error('Python stderr:', stderr);
      }

      // Extract page count from output
      const lines = stdout.trim().split('\n');
      const pageCount = parseInt(lines[lines.length - 1]) || 0;

      // Clean up temp file
      await fs.unlink(tempPdfPath).catch(() => {});

      return NextResponse.json({
        success: true,
        pageCount,
        siteName,
        message: `Successfully converted ${pageCount} pages`
      });

    } catch (execError) {
      console.error('Conversion error:', execError);
      
      // Clean up temp file
      await fs.unlink(tempPdfPath).catch(() => {});

      return NextResponse.json(
        { success: false, error: 'PDF conversion failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload processing failed' },
      { status: 500 }
    );
  }
}

// Configure max file size (50MB)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};
import { NextRequest, NextResponse } from 'next/server';

interface PageSignType {
  pageNumber: number;
  signType: string | null;
  signNumbers: string[];
  pageTitle: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Please provide a valid PDF file' },
        { status: 400 }
      );
    }

    // Dynamic import PDF.js for server-side processing
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    const pageSignTypes: PageSignType[] = [];
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let signType: string | null = null;
      const signNumbers: string[] = [];
      
      // Extract text items
      const textItems = textContent.items as any[];
      
      for (let i = 0; i < textItems.length; i++) {
        const text = textItems[i].str;
        
        // Look for sign type pattern
        if (text && (text.includes('SIGN TYPE') || text.includes('Sign Type'))) {
          // Get the next few text items to find the actual type
          for (let j = i + 1; j < Math.min(i + 5, textItems.length); j++) {
            const nextText = textItems[j].str.trim();
            // Look for patterns like BC-1.0, PAC-2.1, etc.
            if (nextText && /^[A-Z]{2,3}-\d+\.\d+$/.test(nextText)) {
              signType = nextText;
              break;
            }
          }
        }
        
        // Look for sign numbers (4 digits, optionally with decimal)
        if (text && /^\d{4}(?:\.\d+)?$/.test(text.trim())) {
          signNumbers.push(text.trim());
        }
      }
      
      pageSignTypes.push({
        pageNumber: pageNum,
        signType: signType || 'Unclassified',
        signNumbers: signNumbers,
        pageTitle: `Page ${pageNum}`
      });
    }
    
    // Group pages by sign type
    const signTypeGroups = pageSignTypes.reduce((acc, page) => {
      const type = page.signType || 'Unclassified';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(page);
      return acc;
    }, {} as Record<string, PageSignType[]>);
    
    return NextResponse.json({
      success: true,
      totalPages: pdf.numPages,
      pages: pageSignTypes,
      signTypeGroups: signTypeGroups
    });
    
  } catch (error) {
    console.error('PDF processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
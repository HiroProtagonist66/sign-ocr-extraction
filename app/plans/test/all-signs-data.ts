// Complete COLO 2 extraction - all 112 signs including field locate (2027-2114)
import colo2Data from '../../../test_data/extraction_results/colo2_extraction_results.json';

export const ALL_COLO2_SIGNS = colo2Data.extractedSigns.map((sign: any) => ({
  text: sign.text,
  x: parseFloat(sign.boundingBox.x_percentage.toFixed(1)),
  y: parseFloat(sign.boundingBox.y_percentage.toFixed(1)),
  width: parseFloat(sign.boundingBox.width_percentage.toFixed(1)),
  height: parseFloat(sign.boundingBox.height_percentage.toFixed(1)),
  confidence: sign.confidence,
  isFieldLocate: parseInt(sign.text) >= 2027 && parseInt(sign.text) <= 2114
}));

export const COMPLETE_EXTRACTION_DATA = {
  '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf': [{
    pdfFile: '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf',
    pageNumber: 1,
    imageSize: { width: 6048, height: 4320 },
    planImageUrl: '/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13_page_1.png',
    extractedSigns: ALL_COLO2_SIGNS.map(sign => ({
      text: sign.text,
      signType: null,
      boundingBox: {
        x_percentage: sign.x,
        y_percentage: sign.y,
        width_percentage: sign.width || 1.2,
        height_percentage: sign.height || 0.5
      },
      confidence: sign.confidence || 0.95,
      isFieldLocate: sign.isFieldLocate
    })),
    timestamp: new Date().toISOString(),
    processingTime: 5000,
    stats: {
      totalSigns: ALL_COLO2_SIGNS.length,
      fieldLocateSigns: ALL_COLO2_SIGNS.filter((s: any) => s.isFieldLocate).length,
      mainAreaSigns: ALL_COLO2_SIGNS.filter((s: any) => !s.isFieldLocate).length
    }
  }],
  
  '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14.pdf': [{
    pdfFile: '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14.pdf',
    pageNumber: 1,
    imageSize: { width: 6048, height: 4320 },
    planImageUrl: '/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14_page_1.png',
    extractedSigns: [],
    timestamp: new Date().toISOString(),
    processingTime: 1800
  }],
  
  '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 9.pdf': [{
    pdfFile: '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 9.pdf',
    pageNumber: 1,
    imageSize: { width: 6048, height: 4320 },
    planImageUrl: '/plans/000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 9_page_1.png',
    extractedSigns: [],
    timestamp: new Date().toISOString(),
    processingTime: 1650
  }]
};
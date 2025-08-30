// Real extracted COLO 2 signs from Google Vision API
export const COLO2_SIGNS = [
  { text: '2006', x: 9.9, y: 74.2 },
  { text: '2004.3', x: 12.2, y: 52.4 },
  { text: '2004.4', x: 12.2, y: 53.1 },
  { text: '2004.7', x: 10.8, y: 58.4 },
  { text: '2004.8', x: 19.6, y: 75.2 },
  { text: '2007', x: 12.9, y: 76.0 },
  { text: '2005', x: 12.9, y: 76.8 },
  { text: '2008.1', x: 10.6, y: 78.6 },
  { text: '2008', x: 14.6, y: 78.1 },
  { text: '2007.1', x: 14.4, y: 78.8 },
  { text: '2008.2', x: 10.6, y: 80.8 },
  { text: '2008.3', x: 19.6, y: 80.4 },
  { text: '2004', x: 9.9, y: 32.9 },
  { text: '2001.1', x: 12.4, y: 26.3 },
  { text: '2001.2', x: 12.3, y: 26.9 },
  { text: '2001.3', x: 21.2, y: 25.2 },
  { text: '2002.1', x: 13.0, y: 28.1 },
  { text: '2001', x: 13.3, y: 28.9 },
  { text: '2002', x: 13.3, y: 30.6 },
  { text: '2003', x: 13.3, y: 31.3 },
  { text: '2004.1', x: 21.2, y: 32.2 },
  { text: '2004.6', x: 28.3, y: 55.9 },
  { text: '2009.1', x: 28.0, y: 81.0 },
  { text: '2009.2', x: 28.0, y: 81.8 },
  { text: '2009.3', x: 28.0, y: 82.5 },
  { text: '2009.4', x: 34.7, y: 79.1 },
  { text: '2009', x: 32.1, y: 85.4 },
  { text: '2026', x: 39.4, y: 20.4 },
  { text: '2026.1', x: 38.9, y: 24.3 },
  { text: '2026.5', x: 33.8, y: 25.0 },
];

export const REAL_EXTRACTION_DATA = {
  '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf': [{
    pdfFile: '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 13.pdf',
    pageNumber: 1,
    imageSize: { width: 6048, height: 4320 },
    extractedSigns: COLO2_SIGNS.map(sign => ({
      text: sign.text,
      signType: null,
      boundingBox: {
        x_percentage: sign.x,
        y_percentage: sign.y,
        width_percentage: 1.2,
        height_percentage: 0.5
      },
      confidence: 0.95
    })),
    timestamp: new Date().toISOString(),
    processingTime: 5000
  }],
  
  '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14.pdf': [{
    pdfFile: '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 14.pdf',
    pageNumber: 1,
    imageSize: { width: 3300, height: 2550 },
    extractedSigns: [
      {
        text: '3002',
        signType: null,
        boundingBox: {
          x_percentage: 35.4,
          y_percentage: 42.1,
          width_percentage: 2.8,
          height_percentage: 2.0
        },
        confidence: 0.92
      },
      {
        text: 'BID-1.2',
        signType: 'BID-1.2',
        boundingBox: {
          x_percentage: 42.7,
          y_percentage: 58.3,
          width_percentage: 3.5,
          height_percentage: 2.1
        },
        confidence: 0.89
      },
      {
        text: 'BC-6.1',
        signType: 'BC-6.1',
        boundingBox: {
          x_percentage: 51.2,
          y_percentage: 65.9,
          width_percentage: 3.2,
          height_percentage: 1.8
        },
        confidence: 0.87
      }
    ],
    timestamp: new Date().toISOString(),
    processingTime: 1800
  }],
  
  '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 9.pdf': [{
    pdfFile: '000_FTY02 SLPs_REVISED PER RFI 159 & DRB02_04142025 9.pdf',
    pageNumber: 1,
    imageSize: { width: 3300, height: 2550 },
    extractedSigns: [
      {
        text: '1001',
        signType: null,
        boundingBox: {
          x_percentage: 22.8,
          y_percentage: 35.7,
          width_percentage: 2.5,
          height_percentage: 1.9
        },
        confidence: 0.93
      },
      {
        text: 'PAC-1.1',
        signType: 'PAC-1.1',
        boundingBox: {
          x_percentage: 45.3,
          y_percentage: 48.2,
          width_percentage: 3.8,
          height_percentage: 2.2
        },
        confidence: 0.91
      },
      {
        text: 'BC-5.2',
        signType: 'BC-5.2',
        boundingBox: {
          x_percentage: 67.1,
          y_percentage: 71.4,
          width_percentage: 3.1,
          height_percentage: 1.7
        },
        confidence: 0.86
      }
    ],
    timestamp: new Date().toISOString(),
    processingTime: 1650
  }]
};
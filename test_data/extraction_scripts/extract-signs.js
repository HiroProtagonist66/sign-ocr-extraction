"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignExtractor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pdf_to_png_converter_1 = require("pdf-to-png-converter");
const sharp_1 = __importDefault(require("sharp"));
// Sign number patterns to detect
const SIGN_PATTERNS = [
    // Sign type codes with higher priority
    { pattern: /\b(BC|PAC|BID|ID)-\d+\.\d+\b/i, type: 'typed_code', priority: 1 },
    // 4-digit numbers with optional decimals
    { pattern: /\b\d{4}(?:\.\d+)?\b/, type: 'sign_number', priority: 2 },
    // 3-digit numbers (less common but valid)
    { pattern: /\b\d{3}\b/, type: 'sign_number_short', priority: 3 },
];
// Sign type mappings
const SIGN_TYPES = {
    'BC-1.0': 'Exit Sign',
    'BC-1.14': 'Special Exit',
    'BC-5.1': '1 Hour Fire Barrier',
    'BC-5.2': '2 Hour Fire Barrier',
    'BC-6.1': 'Equipment ID',
    'PAC-1.1': 'Project Marker',
    'BID-1.2': 'Bidirectional',
    'ID-5.2': 'Room ID',
};
class SignExtractor {
    constructor(apiKey, outputDir) {
        this.googleVisionApiKey = apiKey;
        this.outputDir = outputDir;
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
    }
    /**
     * Convert PDF to PNG images
     */
    async convertPdfToImages(pdfPath) {
        console.log(`Converting PDF to images: ${pdfPath}`);
        const pngPages = await (0, pdf_to_png_converter_1.pdfToPng)(pdfPath, {
            disableFontFace: false,
            useSystemFonts: false,
            viewportScale: 2.0, // Higher resolution for better OCR
            outputFolder: path.join(this.outputDir, 'temp_images'),
            outputFileMaskFunc: (pageNum) => `${path.basename(pdfPath, '.pdf')}_page_${pageNum}`,
            verbosityLevel: 0,
        });
        return pngPages;
    }
    /**
     * Call Google Vision API for text detection
     */
    async callGoogleVisionApi(imageBuffer) {
        const base64Image = imageBuffer.toString('base64');
        const requestBody = {
            requests: [{
                    image: { content: base64Image },
                    features: [
                        { type: 'TEXT_DETECTION', maxResults: 50 },
                        { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
                    ]
                }]
        };
        const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleVisionApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            throw new Error(`Google Vision API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
    /**
     * Extract sign numbers from OCR text annotations
     */
    extractSignsFromAnnotations(annotations, imageWidth, imageHeight) {
        const signs = [];
        const processedTexts = new Set();
        if (!annotations || annotations.length === 0) {
            return signs;
        }
        // Skip the first annotation (full text)
        for (let i = 1; i < annotations.length; i++) {
            const annotation = annotations[i];
            const text = annotation.description?.trim();
            if (!text)
                continue;
            // Check against patterns
            for (const signPattern of SIGN_PATTERNS) {
                if (signPattern.pattern.test(text)) {
                    // Avoid duplicates
                    const normalizedText = text.toUpperCase();
                    if (processedTexts.has(normalizedText))
                        continue;
                    processedTexts.add(normalizedText);
                    // Calculate bounding box percentages
                    const vertices = annotation.boundingPoly?.vertices || [];
                    if (vertices.length !== 4)
                        continue;
                    const minX = Math.min(...vertices.map((v) => v.x || 0));
                    const maxX = Math.max(...vertices.map((v) => v.x || 0));
                    const minY = Math.min(...vertices.map((v) => v.y || 0));
                    const maxY = Math.max(...vertices.map((v) => v.y || 0));
                    const width = maxX - minX;
                    const height = maxY - minY;
                    // Determine sign type
                    let signType = null;
                    const upperText = text.toUpperCase();
                    // Check if it matches a known sign type
                    for (const [code, description] of Object.entries(SIGN_TYPES)) {
                        if (upperText.includes(code.toUpperCase())) {
                            signType = code;
                            break;
                        }
                    }
                    // If no specific type found but matches typed_code pattern
                    if (!signType && signPattern.type === 'typed_code') {
                        signType = text.match(signPattern.pattern)?.[0] || null;
                    }
                    const extractedSign = {
                        text: text,
                        signType: signType,
                        boundingBox: {
                            x_percentage: (minX / imageWidth) * 100,
                            y_percentage: (minY / imageHeight) * 100,
                            width_percentage: (width / imageWidth) * 100,
                            height_percentage: (height / imageHeight) * 100,
                        },
                        confidence: annotation.confidence || 0.95,
                        vertices: vertices,
                        rawBounds: {
                            minX, maxX, minY, maxY, width, height
                        }
                    };
                    signs.push(extractedSign);
                    break; // Found a match, move to next annotation
                }
            }
        }
        return signs;
    }
    /**
     * Process a single PDF file
     */
    async processPdf(pdfPath) {
        const startTime = Date.now();
        const results = [];
        const pdfName = path.basename(pdfPath);
        console.log(`\nProcessing PDF: ${pdfName}`);
        try {
            // Convert PDF to images
            const pngPages = await this.convertPdfToImages(pdfPath);
            console.log(`  Converted to ${pngPages.length} images`);
            // Process each page
            for (let i = 0; i < pngPages.length; i++) {
                const page = pngPages[i];
                const pageNum = i + 1;
                console.log(`  Processing page ${pageNum}...`);
                // Get image metadata
                const metadata = await (0, sharp_1.default)(page.content).metadata();
                const imageWidth = metadata.width || 0;
                const imageHeight = metadata.height || 0;
                // Call Google Vision API
                const visionResponse = await this.callGoogleVisionApi(page.content);
                const textAnnotations = visionResponse.responses?.[0]?.textAnnotations || [];
                console.log(`    Found ${textAnnotations.length} text annotations`);
                // Extract signs
                const extractedSigns = this.extractSignsFromAnnotations(textAnnotations, imageWidth, imageHeight);
                console.log(`    Extracted ${extractedSigns.length} sign numbers`);
                // Save page image for visualization
                const imagePath = path.join(this.outputDir, `${path.basename(pdfName, '.pdf')}_page_${pageNum}.png`);
                fs.writeFileSync(imagePath, page.content);
                const result = {
                    pdfFile: pdfName,
                    pageNumber: pageNum,
                    imageSize: {
                        width: imageWidth,
                        height: imageHeight,
                    },
                    extractedSigns: extractedSigns,
                    timestamp: new Date().toISOString(),
                    processingTime: Date.now() - startTime,
                };
                results.push(result);
                // Save individual page result
                const pageResultPath = path.join(this.outputDir, `${path.basename(pdfName, '.pdf')}_page_${pageNum}_results.json`);
                fs.writeFileSync(pageResultPath, JSON.stringify(result, null, 2));
            }
        }
        catch (error) {
            console.error(`Error processing ${pdfName}:`, error);
            throw error;
        }
        return results;
    }
    /**
     * Process all PDFs in a directory
     */
    async processAllPdfs(pdfDir) {
        const allResults = new Map();
        const pdfFiles = fs.readdirSync(pdfDir)
            .filter(file => file.toLowerCase().endsWith('.pdf'))
            .map(file => path.join(pdfDir, file));
        console.log(`Found ${pdfFiles.length} PDF files to process`);
        for (const pdfPath of pdfFiles) {
            try {
                const results = await this.processPdf(pdfPath);
                allResults.set(path.basename(pdfPath), results);
            }
            catch (error) {
                console.error(`Failed to process ${pdfPath}:`, error);
            }
        }
        // Save combined results
        const combinedResults = {
            processedAt: new Date().toISOString(),
            totalPdfs: allResults.size,
            results: Object.fromEntries(allResults),
        };
        const combinedPath = path.join(this.outputDir, 'all_extraction_results.json');
        fs.writeFileSync(combinedPath, JSON.stringify(combinedResults, null, 2));
        console.log(`\nAll results saved to: ${combinedPath}`);
        return allResults;
    }
    /**
     * Generate summary statistics
     */
    generateSummary(results) {
        let totalSigns = 0;
        let totalPages = 0;
        const signTypes = new Map();
        for (const [pdfName, pages] of results) {
            totalPages += pages.length;
            for (const page of pages) {
                totalSigns += page.extractedSigns.length;
                for (const sign of page.extractedSigns) {
                    const type = sign.signType || 'unknown';
                    signTypes.set(type, (signTypes.get(type) || 0) + 1);
                }
            }
        }
        const summary = {
            totalPdfs: results.size,
            totalPages,
            totalSigns,
            signTypes: Object.fromEntries(signTypes),
            averageSignsPerPage: totalPages > 0 ? (totalSigns / totalPages).toFixed(2) : 0,
        };
        console.log('\n=== Extraction Summary ===');
        console.log(JSON.stringify(summary, null, 2));
        const summaryPath = path.join(this.outputDir, 'extraction_summary.json');
        fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    }
}
exports.SignExtractor = SignExtractor;
// Export for use in runner script
exports.default = SignExtractor;

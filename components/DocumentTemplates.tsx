import React, { useState, useRef } from 'react';
import { BrandIdentity } from '../types';
import { saveAs } from 'file-saver';
import PptxGenJS from 'pptxgenjs';
import { Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, VerticalAlign } from 'docx';
import JSZip from 'jszip';

interface DocumentTemplatesProps {
    identity: BrandIdentity;
    lang: 'en' | 'ar';
}

const DocumentTemplates: React.FC<DocumentTemplatesProps> = ({ identity, lang }) => {
    const [activeTab, setActiveTab] = useState<'document' | 'presentation'>('document');
    const [logoPosition, setLogoPosition] = useState<{ vertical: 'header' | 'footer', horizontal: 'left' | 'center' | 'right' }>({
        vertical: 'header',
        horizontal: 'center'
    });
    const contentRef = useRef<HTMLDivElement>(null);

    // --- Helper to get brand font names ---
    const getFonts = () => {
        const headerFont = identity.fontPairings.header;
        const bodyFont = identity.fontPairings.body;
        return { headerFont, bodyFont };
    };

    // --- Helper to get brand colors ---
    const getColors = () => {
        const primary = identity.colorPalette[0]?.hex || '#2c3e50';
        const secondary = identity.colorPalette[1]?.hex || '#7f8c8d';
        const text = '#222222';
        return { primary, secondary, text };
    };

    const { headerFont, bodyFont } = getFonts();
    const { primary, secondary, text } = getColors();
    const logoUrl = identity.logoImage || '';
    const isRtl = lang === 'ar';
    const companyName = identity.companyName;

    const headerFontUrl = `https://fonts.googleapis.com/css2?family=${headerFont.replace(/ /g, '+')}:wght@700&display=swap`;
    const bodyFontUrl = `https://fonts.googleapis.com/css2?family=${bodyFont.replace(/ /g, '+')}:wght@400&display=swap`;

    // --- Shared doc creation logic ---
    const createDoc = async () => {
        if (!logoUrl) throw new Error("No logo available.");

        let logoBuffer: ArrayBuffer;
        if (logoUrl.startsWith('data:')) {
            const base64 = logoUrl.split(',')[1];
            const binary = atob(base64);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                array[i] = binary.charCodeAt(i);
            }
            logoBuffer = array.buffer;
        } else {
            const res = await fetch(logoUrl);
            logoBuffer = await res.arrayBuffer();
        }

        const alignmentStart = isRtl ? AlignmentType.END : AlignmentType.START;
        const alignmentCenter = AlignmentType.CENTER;
        const bidi = isRtl;

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                    },
                },
                headers: {
                    default: logoPosition.vertical === 'header' ? new Header({
                        children: [
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: logoBuffer,
                                        transformation: { width: 90, height: 90 },
                                    }),
                                ],
                                alignment: logoPosition.horizontal === 'left' ? (isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT) : logoPosition.horizontal === 'center' ? alignmentCenter : (isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT),
                                border: { bottom: { style: BorderStyle.SINGLE, size: 32, color: primary.replace('#', '') } },
                            }),
                        ],
                    }) : undefined,
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Confidential • Generated on ${new Date().toLocaleDateString()}`,
                                        size: 18,
                                        color: secondary.replace('#', ''),
                                        bidi,
                                    }),
                                ],
                                alignment: alignmentCenter,
                                border: { top: { style: BorderStyle.SINGLE, size: 8, color: 'EEEEEE' } },
                            }),
                            ...(logoPosition.vertical === 'footer' ? [new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: logoBuffer,
                                        transformation: { width: 50, height: 50 },
                                    }),
                                ],
                                alignment: logoPosition.horizontal === 'left' ? (isRtl ? AlignmentType.RIGHT : AlignmentType.LEFT) : logoPosition.horizontal === 'center' ? alignmentCenter : (isRtl ? AlignmentType.LEFT : AlignmentType.RIGHT),
                            })] : []),
                        ],
                    }),
                },
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: companyName,
                                font: headerFont,
                                size: 64,
                                bold: true,
                                color: primary.replace('#', ''),
                                bidi,
                            }),
                        ],
                        alignment: alignmentCenter,
                        spacing: { after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: identity.logo.style,
                                font: bodyFont,
                                size: 28,
                                color: secondary.replace('#', ''),
                                bidi,
                            }),
                        ],
                        alignment: alignmentCenter,
                        spacing: { after: 800 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Brand Overview",
                                font: headerFont,
                                size: 40,
                                bold: true,
                                color: primary.replace('#', ''),
                                bidi,
                            }),
                        ],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: primary.replace('#', '') } },
                        spacing: { before: 700, after: 200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: identity.logo.prompt,
                                font: bodyFont,
                                size: 24,
                                bidi,
                            }),
                        ],
                        alignment: alignmentStart,
                        spacing: { after: 320 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Color Palette",
                                font: headerFont,
                                size: 40,
                                bold: true,
                                color: primary.replace('#', ''),
                                bidi,
                            }),
                        ],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: primary.replace('#', '') } },
                        spacing: { before: 700, after: 200 },
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: identity.colorPalette.map(color => new TableCell({
                                    children: [
                                        new Paragraph({}),
                                        new Paragraph({
                                            children: [new TextRun({ text: color.hex, bold: true, size: 22, bidi })],
                                            alignment: alignmentCenter,
                                        }),
                                        new Paragraph({
                                            children: [new TextRun({ text: color.name, size: 20, color: secondary.replace('#', ''), bidi })],
                                            alignment: alignmentCenter,
                                        }),
                                    ],
                                    shading: { fill: color.hex.replace('#', ''), type: ShadingType.SOLID, color: 'auto' },
                                    verticalAlign: VerticalAlign.CENTER,
                                    width: { size: Math.floor(100 / identity.colorPalette.length), type: WidthType.PERCENTAGE },
                                    borders: {
                                        top: { style: BorderStyle.SINGLE, size: 8, color: 'DDDDDD' },
                                        bottom: { style: BorderStyle.SINGLE, size: 8, color: 'DDDDDD' },
                                        left: { style: BorderStyle.SINGLE, size: 8, color: 'DDDDDD' },
                                        right: { style: BorderStyle.SINGLE, size: 8, color: 'DDDDDD' },
                                    },
                                })),
                            }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "Typography",
                                font: headerFont,
                                size: 40,
                                bold: true,
                                color: primary.replace('#', ''),
                                bidi,
                            }),
                        ],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: primary.replace('#', '') } },
                        spacing: { before: 700, after: 200 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: "Header Font", size: 20, color: secondary.replace('#', ''), bidi })],
                        spacing: { after: 120 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: headerFont, font: headerFont, size: 48, color: primary.replace('#', ''), bidi })],
                        spacing: { after: 120 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", font: headerFont, size: 28, bidi })],
                        spacing: { after: 120 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: "abcdefghijklmnopqrstuvwxyz", font: headerFont, size: 28, bidi })],
                        spacing: { after: 400 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: "Body Font", size: 20, color: secondary.replace('#', ''), bidi })],
                        spacing: { after: 120 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: bodyFont, font: bodyFont, size: 48, color: primary.replace('#', ''), bidi })],
                        spacing: { after: 120 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", font: bodyFont, size: 28, bidi })],
                        spacing: { after: 120 },
                    }),
                    new Paragraph({
                        children: [new TextRun({ text: "abcdefghijklmnopqrstuvwxyz", font: bodyFont, size: 28, bidi })],
                    }),
                ],
            }],
        });

        return doc;
    };

    // --- Export Functions ---

    const handlePrint = () => {
        window.print();
    };

    const handleExportDocx = async () => {
        try {
            const doc = await createDoc();
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${companyName}-Brand-Document.docx`);
        } catch (error) {
            console.error(error);
            alert("Export failed.");
        }
    };

    const handleExportPptx = async () => {
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';
        pptx.rtlMode = isRtl;

        let logoBase64: string;
        try {
            const res = await fetch(logoUrl);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            await new Promise((resolve) => { reader.onloadend = resolve; });
            logoBase64 = reader.result as string;
        } catch (error) {
            console.error("Error fetching logo for PPTX:", error);
            alert("Failed to load logo.");
            return;
        }

        pptx.defineSlideMaster({
            title: 'MASTER_SLIDE',
            background: { color: 'FFFFFF' },
            objects: [
                { image: { x: isRtl ? '5%' : '90%', y: '5%', w: 1.5, h: 0.75, data: logoBase64 } },
                { rect: { x: 0, y: '95%', w: '100%', h: 0.4, fill: primary } },
            ],
            slideNumber: { x: isRtl ? '5%' : '95%', y: '96%', color: 'FFFFFF', fontSize: 10 },
        });

        const slide1 = pptx.addSlide();
        slide1.background = { color: primary };
        slide1.addText(companyName, { x: 1, y: 2.5, w: '80%', fontSize: 60, color: 'FFFFFF', bold: true, align: 'center', fontFace: headerFont });
        slide1.addText(identity.logo.style || 'Brand Identity', { x: 1, y: 4, w: '80%', fontSize: 24, color: 'EEEEEE', align: 'center', fontFace: bodyFont });
        if (logoUrl) {
            slide1.addImage({ data: logoBase64, x: '42%', y: 0.5, w: 2, h: 2 });
        }

        const slide2 = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
        slide2.addText('Our Mission', { x: 0.5, y: 0.5, fontSize: 36, color: primary, bold: true, fontFace: headerFont });
        slide2.addText(identity.logo.prompt, { x: 1, y: 2, w: '80%', fontSize: 24, color: text, fontFace: bodyFont });

        const slide3 = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
        slide3.addText('Brand Colors', { x: 0.5, y: 0.5, fontSize: 36, color: primary, bold: true, fontFace: headerFont });

        identity.colorPalette.forEach((color, index) => {
            const xPos = 1 + (index * 2.5);
            slide3.addShape(pptx.ShapeType.rect, { x: xPos, y: 2, w: 2, h: 2, fill: color.hex });
            slide3.addText(color.hex, { x: xPos, y: 4.2, w: 2, fontSize: 14, align: 'center', fontFace: bodyFont });
            slide3.addText(color.name, { x: xPos, y: 4.5, w: 2, fontSize: 12, align: 'center', color: secondary, fontFace: bodyFont });
        });

        const slide4 = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
        slide4.addText('Typography', { x: 0.5, y: 0.5, fontSize: 36, color: primary, bold: true, fontFace: headerFont });
        slide4.addText('Header Font: ' + headerFont, { x: 1, y: 2, fontSize: 32, color: text, fontFace: headerFont, bold: true });
        slide4.addText('Body Font: ' + bodyFont, { x: 1, y: 3, fontSize: 24, color: text, fontFace: bodyFont });
        slide4.addText('The quick brown fox jumps over the lazy dog.', { x: 1, y: 4, fontSize: 18, color: secondary, fontFace: bodyFont });

        const pptxBlob = await pptx.write({ outputType: 'blob' }) as Blob;
        saveAs(pptxBlob as Blob, `${companyName}-Presentation.pptx`);
    };

    const handleDownloadBundle = async () => {
        const zip = new JSZip();

        // Add DOCX
        try {
            const doc = await createDoc();
            const docBlob = await Packer.toBlob(doc);
            zip.file(`${companyName}-Brand-Document.docx`, docBlob);
        } catch (error) {
            console.error('DOCX generation failed:', error);
        }

        // Add PPTX
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';
        pptx.rtlMode = isRtl;

        let logoBase64: string = '';
        if (logoUrl) {
            try {
                const res = await fetch(logoUrl);
                const blob = await res.blob();
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                await new Promise((resolve) => { reader.onloadend = resolve; });
                logoBase64 = reader.result as string;
            } catch { }
        }

        pptx.defineSlideMaster({
            title: 'MASTER_SLIDE',
            background: { color: 'FFFFFF' },
            objects: [
                { image: { x: isRtl ? '5%' : '90%', y: '5%', w: 1.5, h: 0.75, data: logoBase64 } },
                { rect: { x: 0, y: '95%', w: '100%', h: 0.4, fill: primary } },
            ],
            slideNumber: { x: isRtl ? '5%' : '95%', y: '96%', color: 'FFFFFF', fontSize: 10 },
        });

        const slide1 = pptx.addSlide();
        slide1.background = { color: primary };
        slide1.addText(companyName, { x: 1, y: 2.5, w: '80%', fontSize: 60, color: 'FFFFFF', bold: true, align: 'center', fontFace: headerFont });
        slide1.addText(identity.logo.style || 'Brand Identity', { x: 1, y: 4, w: '80%', fontSize: 24, color: 'EEEEEE', align: 'center', fontFace: bodyFont });
        if (logoBase64) {
            slide1.addImage({ data: logoBase64, x: '42%', y: 0.5, w: 2, h: 2 });
        }

        const slide2 = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
        slide2.addText('Our Mission', { x: 0.5, y: 0.5, fontSize: 36, color: primary, bold: true, fontFace: headerFont });
        slide2.addText(identity.logo.prompt, { x: 1, y: 2, w: '80%', fontSize: 24, color: text, fontFace: bodyFont });

        const slide3 = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
        slide3.addText('Brand Colors', { x: 0.5, y: 0.5, fontSize: 36, color: primary, bold: true, fontFace: headerFont });

        identity.colorPalette.forEach((color, index) => {
            const xPos = 1 + (index * 2.5);
            slide3.addShape(pptx.ShapeType.rect, { x: xPos, y: 2, w: 2, h: 2, fill: color.hex });
            slide3.addText(color.hex, { x: xPos, y: 4.2, w: 2, fontSize: 14, align: 'center', fontFace: bodyFont });
            slide3.addText(color.name, { x: xPos, y: 4.5, w: 2, fontSize: 12, align: 'center', color: secondary, fontFace: bodyFont });
        });

        const slide4 = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
        slide4.addText('Typography', { x: 0.5, y: 0.5, fontSize: 36, color: primary, bold: true, fontFace: headerFont });
        slide4.addText('Header Font: ' + headerFont, { x: 1, y: 2, fontSize: 32, color: text, fontFace: headerFont, bold: true });
        slide4.addText('Body Font: ' + bodyFont, { x: 1, y: 3, fontSize: 24, color: text, fontFace: bodyFont });
        slide4.addText('The quick brown fox jumps over the lazy dog.', { x: 1, y: 4, fontSize: 18, color: secondary, fontFace: bodyFont });

        const pptxBlob = await pptx.write({ outputType: 'blob' }) as Blob;
        zip.file(`${companyName}-Presentation.pptx`, pptxBlob);

        // Add fonts
        const fontsFolder = zip.folder('fonts');
        const fontInfo = [
            { name: headerFont, slug: headerFont.toLowerCase().replace(/\s/g, ''), weights: ['Regular', 'Bold'] },
            { name: bodyFont, slug: bodyFont.toLowerCase().replace(/\s/g, ''), weights: ['Regular', 'Bold'] },
        ];

        for (const font of fontInfo) {
            for (const weight of font.weights) {
                let filename = `${font.name.replace(/\s/g, '')}-${weight}.ttf`;
                let url = `https://raw.githubusercontent.com/google/fonts/main/ofl/${font.slug}/${filename}`;

                try {
                    let res = await fetch(url);
                    if (!res.ok) {
                        // Try static folder
                        filename = `static/${filename}`;
                        url = `https://raw.githubusercontent.com/google/fonts/main/ofl/${font.slug}/${filename}`;
                        res = await fetch(url);
                    }
                    if (res.ok) {
                        const buffer = await res.arrayBuffer();
                        fontsFolder.file(filename, buffer);
                    } else {
                        console.warn(`Font file not found: ${url}`);
                    }
                } catch (error) {
                    console.error(`Error downloading font ${filename}:`, error);
                }

                // Also try variable if static not found
                if (weight === 'Regular') {
                    filename = `${font.name.replace(/\s/g, '')}-VariableFont_wght.ttf`; // Example for variable
                    url = `https://raw.githubusercontent.com/google/fonts/main/ofl/${font.slug}/${filename}`;
                    try {
                        const res = await fetch(url);
                        if (res.ok) {
                            const buffer = await res.arrayBuffer();
                            fontsFolder.file(filename, buffer);
                        }
                    } catch { }
                }
            }
        }

        // Add brand.css
        const cssContent = `
/* Brand CSS for ${companyName} */
/* To use: Link this CSS and install the fonts from the fonts folder */

@font-face {
    font-family: '${headerFont}';
    src: url('./fonts/${headerFont.replace(/\s/g, '')}-Regular.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
}

@font-face {
    font-family: '${headerFont}';
    src: url('./fonts/${headerFont.replace(/\s/g, '')}-Bold.ttf') format('truetype');
    font-weight: bold;
    font-style: normal;
}

@font-face {
    font-family: '${bodyFont}';
    src: url('./fonts/${bodyFont.replace(/\s/g, '')}-Regular.ttf') format('truetype');
    font-weight: normal;
    font-style: normal;
}

@font-face {
    font-family: '${bodyFont}';
    src: url('./fonts/${bodyFont.replace(/\s/g, '')}-Bold.ttf') format('truetype');
    font-weight: bold;
    font-style: normal;
}

:root {
    --brand-primary: ${primary};
    --brand-secondary: ${secondary};
    --brand-text: ${text};
}

body {
    font-family: '${bodyFont}', sans-serif;
    color: var(--brand-text);
    line-height: 1.6;
}

h1, h2, h3 {
    font-family: '${headerFont}', serif;
    color: var(--brand-primary);
}

.brand-header {
    border-bottom: 4px solid var(--brand-primary);
}

/* Add more styles as needed from your preview */
`;
        zip.file('brand.css', cssContent);

        // Add README.txt
        const readmeContent = `
Brand Identity Bundle for ${companyName}

Thank you for using the AI Brand Identity Generator!

This ZIP contains:
- ${companyName}-Brand-Document.docx: Your brand guidelines document. Open in Microsoft Word.
- ${companyName}-Presentation.pptx: Your brand presentation slides. Open in Microsoft PowerPoint.
- fonts/ folder: Contains the TTF font files for ${headerFont} and ${bodyFont}.
- brand.css: A CSS file with brand styles, fonts, and colors. Use this for web projects.

To ensure everything looks exactly like the web preview:
1. Install the fonts:
   - On Windows: Right-click each .ttf file > Install.
   - On Mac: Double-click each .ttf file > Install Font.
   - On Linux: Copy to ~/.fonts and refresh cache.
2. Open the DOCX and PPTX files. They reference the font names, so with fonts installed, they'll match perfectly.
3. For web use: Link brand.css in your HTML, and the styles will apply (assuming fonts are installed or loaded).

If some fonts are missing, they may be variable fonts—use the VariableFont file if available.

Generated on: ${new Date().toLocaleDateString()}

For questions, contact support.
`;
        zip.file('README.txt', readmeContent);

        // Generate and download ZIP
        try {
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveAs(zipBlob, `${companyName}-Brand-Bundle.zip`);
        } catch (error) {
            console.error('ZIP generation failed:', error);
            alert("Bundle download failed.");
        }
    };

    return (
        <div className="mt-16 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200" id="documents-section">
            <link href={headerFontUrl} rel="stylesheet" />
            <link href={bodyFontUrl} rel="stylesheet" />

            <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Documents Template</h2>
                    <p className="text-gray-500 text-sm">Preview and export your brand assets</p>
                </div>

                <div className="flex bg-gray-200 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('document')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'document' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        Document
                    </button>
                    <button
                        onClick={() => setActiveTab('presentation')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'presentation' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        Presentation
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row justify-between gap-4 bg-white sticky top-0 z-10">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Logo V:</span>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setLogoPosition(prev => ({ ...prev, vertical: 'header' }))}
                                className={`px-3 py-1 text-xs font-medium rounded ${logoPosition.vertical === 'header' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                            >
                                Header
                            </button>
                            <button
                                onClick={() => setLogoPosition(prev => ({ ...prev, vertical: 'footer' }))}
                                className={`px-3 py-1 text-xs font-medium rounded ${logoPosition.vertical === 'footer' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                            >
                                Footer
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Logo H:</span>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setLogoPosition(prev => ({ ...prev, horizontal: 'left' }))}
                                className={`px-3 py-1 text-xs font-medium rounded ${logoPosition.horizontal === 'left' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                            >
                                Left
                            </button>
                            <button
                                onClick={() => setLogoPosition(prev => ({ ...prev, horizontal: 'center' }))}
                                className={`px-3 py-1 text-xs font-medium rounded ${logoPosition.horizontal === 'center' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                            >
                                Center
                            </button>
                            <button
                                onClick={() => setLogoPosition(prev => ({ ...prev, horizontal: 'right' }))}
                                className={`px-3 py-1 text-xs font-medium rounded ${logoPosition.horizontal === 'right' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                            >
                                Right
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 ml-auto flex-wrap">
                    <button
                        onClick={handlePrint}
                        className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Export PDF
                    </button>

                    {activeTab === 'document' ? (
                        <button
                            onClick={handleExportDocx}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Export DOCX
                        </button>
                    ) : (
                        <button
                            onClick={handleExportPptx}
                            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                            Export PPTX
                        </button>
                    )}
                    <button
                        onClick={handleDownloadBundle}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Download Bundle
                    </button>
                </div>
            </div>

            {/* Preview Area */}
            <div className="p-8 bg-gray-100 flex justify-center overflow-y-auto" style={{ maxHeight: '80vh' }}>
                {activeTab === 'document' && (
                    <div
                        ref={contentRef}
                        className="bg-white shadow-2xl mx-auto transition-all duration-500 ease-in-out relative"
                        dir={isRtl ? 'rtl' : 'ltr'}
                        style={{
                            width: '210mm',
                            minHeight: '297mm',
                            padding: '25mm 20mm',
                            boxSizing: 'border-box',
                            fontFamily: `'${bodyFont}', sans-serif`,
                            color: text,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div className="brand-header" style={{ borderBottom: `4px solid ${primary}`, marginBottom: '40px', paddingBottom: '25px', textAlign: 'center' }}>
                            {logoPosition.vertical === 'header' && logoUrl && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: logoPosition.horizontal === 'left' ? 'flex-start' : logoPosition.horizontal === 'right' ? 'flex-end' : 'center',
                                    marginBottom: '20px',
                                    width: '100%'
                                }}>
                                    <img src={logoUrl} alt="Logo" style={{ height: '90px', objectFit: 'contain' }} />
                                </div>
                            )}
                            <h1 style={{ fontFamily: `'${headerFont}', serif`, color: primary, fontSize: '32pt', margin: '0 0 10px 0', fontWeight: 700 }}>{companyName}</h1>
                            <div style={{ fontFamily: `'${bodyFont}', sans-serif`, color: secondary, fontSize: '14pt' }}>{identity.logo.style}</div>
                        </div>

                        <div className="content" style={{ fontSize: '12pt', lineHeight: 1.7, flex: 1 }}>
                            <h2 style={{ fontFamily: `'${headerFont}', serif`, color: primary, fontSize: '20pt', borderBottom: `2px solid ${primary}`, paddingBottom: '10px', marginTop: '35px' }}>Brand Overview</h2>
                            <p>{identity.logo.prompt}</p>

                            <h2 style={{ fontFamily: `'${headerFont}', serif`, color: primary, fontSize: '20pt', borderBottom: `2px solid ${primary}`, paddingBottom: '10px', marginTop: '35px' }}>Color Palette</h2>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, 1fr)',
                                gap: '20px',
                                pageBreakInside: 'avoid',
                                marginTop: '20px'
                            }}>
                                {identity.colorPalette.map((color, idx) => (
                                    <div key={idx} style={{
                                        textAlign: 'center',
                                        pageBreakInside: 'avoid'
                                    }}>
                                        <div style={{
                                            width: '100%',
                                            height: '100px',
                                            backgroundColor: color.hex,
                                            border: '1px solid #ddd',
                                            marginBottom: '12px'
                                        }}></div>
                                        <div style={{ fontWeight: 'bold', fontSize: '11pt' }}>{color.hex}</div>
                                        <div style={{ fontSize: '10pt', color: secondary }}>{color.name}</div>
                                    </div>
                                ))}
                            </div>

                            <h2 style={{ fontFamily: `'${headerFont}', serif`, color: primary, fontSize: '20pt', borderBottom: `2px solid ${primary}`, paddingBottom: '10px', marginTop: '35px' }}>Typography</h2>
                            <div style={{ marginTop: '20px' }}>
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ fontSize: '10pt', color: secondary, marginBottom: '5px' }}>Header Font</div>
                                    <div style={{ fontFamily: `'${headerFont}', serif`, fontSize: '24pt', color: primary }}>{headerFont}</div>
                                    <div style={{ fontFamily: `'${headerFont}', serif`, fontSize: '14pt' }}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
                                    <div style={{ fontFamily: `'${headerFont}', serif`, fontSize: '14pt' }}>abcdefghijklmnopqrstuvwxyz</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '10pt', color: secondary, marginBottom: '5px' }}>Body Font</div>
                                    <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '24pt', color: primary }}>{bodyFont}</div>
                                    <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '14pt' }}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</div>
                                    <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '14pt' }}>abcdefghijklmnopqrstuvwxyz</div>
                                </div>
                            </div>
                        </div>

                        <div className="footer" style={{ marginTop: 'auto', textAlign: 'center', color: secondary, fontSize: '9pt', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                            {logoPosition.vertical === 'footer' && logoUrl && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: logoPosition.horizontal === 'left' ? 'flex-start' : logoPosition.horizontal === 'right' ? 'flex-end' : 'center',
                                    marginBottom: '10px',
                                    width: '100%'
                                }}>
                                    <img src={logoUrl} alt="Logo" style={{ height: '50px', objectFit: 'contain' }} />
                                </div>
                            )}
                            <span>Confidential • Generated on {new Date().toLocaleDateString()}</span>
                        </div>
                    </div>
                )}

                {activeTab === 'presentation' && (
                    <div className="flex flex-col gap-8" dir={isRtl ? 'rtl' : 'ltr'}>
                        {/* Slide 1: Title */}
                        <div
                            className="slide shadow-xl relative overflow-hidden"
                            style={{
                                width: '960px',
                                height: '540px',
                                backgroundColor: primary,
                                color: 'white',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                textAlign: 'center',
                                padding: '40px',
                                flexShrink: 0
                            }}
                        >
                            {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '120px', marginBottom: '30px' }} />}
                            <h1 style={{ fontFamily: `'${headerFont}', serif`, fontSize: '48pt', fontWeight: 'bold', marginBottom: '10px' }}>{companyName}</h1>
                            <p style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '20pt', opacity: 0.9 }}>{identity.logo.style}</p>
                        </div>

                        {/* Slide 2: Mission */}
                        <div
                            className="slide shadow-xl relative overflow-hidden"
                            style={{
                                width: '960px',
                                height: '540px',
                                backgroundColor: 'white',
                                padding: '60px',
                                flexShrink: 0
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: logoPosition.vertical === 'header' ? '30px' : 'auto',
                                bottom: logoPosition.vertical === 'footer' ? '30px' : 'auto',
                                left: logoPosition.horizontal === 'left' ? '40px' : logoPosition.horizontal === 'center' ? '50%' : 'auto',
                                right: logoPosition.horizontal === 'right' ? '40px' : 'auto',
                                transform: logoPosition.horizontal === 'center' ? 'translateX(-50%)' : 'none',
                                zIndex: 10
                            }}>
                                {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '40px' }} />}
                            </div>
                            <h2 style={{ fontFamily: `'${headerFont}', serif`, color: primary, fontSize: '36pt', marginBottom: '40px' }}>Our Mission</h2>
                            <p style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '24pt', color: text, lineHeight: 1.5 }}>{identity.logo.prompt}</p>
                            <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '20px', backgroundColor: primary }}></div>
                        </div>

                        {/* Slide 3: Colors */}
                        <div
                            className="slide shadow-xl relative overflow-hidden"
                            style={{
                                width: '960px',
                                height: '540px',
                                backgroundColor: 'white',
                                padding: '60px',
                                flexShrink: 0
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: logoPosition.vertical === 'header' ? '30px' : 'auto',
                                bottom: logoPosition.vertical === 'footer' ? '30px' : 'auto',
                                left: logoPosition.horizontal === 'left' ? '40px' : logoPosition.horizontal === 'center' ? '50%' : 'auto',
                                right: logoPosition.horizontal === 'right' ? '40px' : 'auto',
                                transform: logoPosition.horizontal === 'center' ? 'translateX(-50%)' : 'none',
                                zIndex: 10
                            }}>
                                {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '40px' }} />}
                            </div>
                            <h2 style={{ fontFamily: `'${headerFont}', serif`, color: primary, fontSize: '36pt', marginBottom: '40px' }}>Brand Colors</h2>
                            <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', marginTop: '60px' }}>
                                {identity.colorPalette.map((color, idx) => (
                                    <div key={idx} style={{ textAlign: 'center' }}>
                                        <div style={{ width: '150px', height: '150px', backgroundColor: color.hex, borderRadius: '12px', marginBottom: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}></div>
                                        <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '14pt', fontWeight: 'bold', color: text }}>{color.hex}</div>
                                        <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '12pt', color: secondary }}>{color.name}</div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '20px', backgroundColor: primary }}></div>
                        </div>

                        {/* Slide 4: Typography */}
                        <div
                            className="slide shadow-xl relative overflow-hidden"
                            style={{
                                width: '960px',
                                height: '540px',
                                backgroundColor: 'white',
                                padding: '60px',
                                flexShrink: 0
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: logoPosition.vertical === 'header' ? '30px' : 'auto',
                                bottom: logoPosition.vertical === 'footer' ? '30px' : 'auto',
                                left: logoPosition.horizontal === 'left' ? '40px' : logoPosition.horizontal === 'center' ? '50%' : 'auto',
                                right: logoPosition.horizontal === 'right' ? '40px' : 'auto',
                                transform: logoPosition.horizontal === 'center' ? 'translateX(-50%)' : 'none',
                                zIndex: 10
                            }}>
                                {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '40px' }} />}
                            </div>
                            <h2 style={{ fontFamily: `'${headerFont}', serif`, color: primary, fontSize: '36pt', marginBottom: '40px' }}>Typography</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                                <div>
                                    <div style={{ fontFamily: `'${headerFont}', serif`, fontSize: '32pt', color: text, fontWeight: 'bold' }}>Header Font: {headerFont}</div>
                                </div>
                                <div>
                                    <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '24pt', color: text }}>Body Font: {bodyFont}</div>
                                </div>
                                <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '18pt', color: secondary, marginTop: '20px' }}>
                                    The quick brown fox jumps over the lazy dog.
                                </div>
                            </div>
                            <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '20px', backgroundColor: primary }}></div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #documents-section, #documents-section * { visibility: visible; }
                    #documents-section { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; border: none; box-shadow: none; }
                    #documents-section > div:nth-child(2), #documents-section > div:first-child { display: none; }
                    .slide { -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-after: always; }
                }
            `}</style>
        </div>
    );
};

export default DocumentTemplates;

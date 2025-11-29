import React, { useState, useRef } from 'react';
import { BrandIdentity } from '../types';
import { saveAs } from 'file-saver';
import PptxGenJS from 'pptxgenjs';
import { Document, Packer, Paragraph, TextRun, ImageRun, Header, Footer, AlignmentType, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, VerticalAlign, convertInchesToTwip } from 'docx';
import JSZip from 'jszip';
import { fetchFontBuffer } from '../utils/fontRegistry';
import { useLanguage } from '../LanguageContext';

interface DocumentTemplatesProps {
    identity: BrandIdentity;
    lang: 'en' | 'ar';
}

const DocumentTemplates: React.FC<DocumentTemplatesProps> = ({ identity, lang }) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'document' | 'presentation'>('document');
    const [logoPosition, setLogoPosition] = useState<{ vertical: 'header' | 'footer', horizontal: 'left' | 'center' | 'right' }>({
        vertical: 'header',
        horizontal: 'center'
    });
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const isRtl = lang === 'ar';

    const getFonts = () => {
        const headerFont = identity.fontPairings.header;
        const bodyFont = identity.fontPairings.body;
        return { headerFont, bodyFont };
    };

    const getColors = () => {
        const primary = identity.colorPalette[0]?.hex || '#2c3e50';
        const secondary = identity.colorPalette[1]?.hex || '#7f8c8d';
        const accent = identity.colorPalette[2]?.hex || '#e74c3c';
        const text = '#1a1a1a';
        return { primary, secondary, accent, text };
    };

    const { headerFont, bodyFont } = getFonts();
    const { primary, secondary, accent, text } = getColors();
    const logoUrl = identity.logoImage || '';
    const companyName = identity.companyName;

    const headerFontUrl = `https://fonts.googleapis.com/css2?family=${headerFont.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
    const bodyFontUrl = `https://fonts.googleapis.com/css2?family=${bodyFont.replace(/ /g, '+')}:wght@400;500&display=swap`;

    const getText = (key: string) => t(key as any) || key;

    // Helper to determine text color based on background brightness
    const getContrastColor = (hexColor: string): string => {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 128 ? '#000000' : '#FFFFFF';
    };

    // Helper to detect if a light color needs a border to be visible on white backgrounds
    const needsBorder = (hexColor: string): boolean => {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        return brightness > 240; // Very light colors need border
    };

    // Helper to get slide logo position styles
    const getSlideLogoStyle = (): React.CSSProperties => {
        const isHeader = logoPosition.vertical === 'header';

        let horizontalStyle: React.CSSProperties = {};
        if (logoPosition.horizontal === 'center') {
            horizontalStyle = { left: '50%', transform: 'translateX(-50%)' };
        } else if (logoPosition.horizontal === 'left') {
            horizontalStyle = isRtl ? { right: '30px' } : { left: '30px' };
        } else {
            horizontalStyle = isRtl ? { left: '30px' } : { right: '30px' };
        }

        return {
            position: 'absolute',
            [isHeader ? 'top' : 'bottom']: isHeader ? '20px' : '36px',
            ...horizontalStyle,
            height: '50px',
            objectFit: 'contain',
        };
    };

    // --- Create DOCX ---
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

        const getAlignment = (position: 'left' | 'center' | 'right') => {
            if (position === 'center') return AlignmentType.CENTER;
            if (isRtl) {
                return position === 'left' ? AlignmentType.RIGHT : AlignmentType.LEFT;
            }
            return position === 'left' ? AlignmentType.LEFT : AlignmentType.RIGHT;
        };

        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: convertInchesToTwip(1),
                            right: convertInchesToTwip(1),
                            bottom: convertInchesToTwip(1),
                            left: convertInchesToTwip(1)
                        },
                    },
                },
                headers: {
                    default: logoPosition.vertical === 'header' ? new Header({
                        children: [
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: logoBuffer,
                                        transformation: { width: 70, height: 70 },
                                        type: 'png',
                                    }),
                                ],
                                alignment: getAlignment(logoPosition.horizontal),
                                spacing: { after: 200 },
                            }),
                        ],
                    }) : undefined,
                },
                footers: {
                    default: new Footer({
                        children: [
                            ...(logoPosition.vertical === 'footer' ? [new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: logoBuffer,
                                        transformation: { width: 50, height: 50 },
                                        type: 'png',
                                    }),
                                ],
                                alignment: getAlignment(logoPosition.horizontal),
                                spacing: { after: 100 },
                            })] : []),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `${getText('docConfidential')} • ${getText('docGeneratedOn')} ${new Date().toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}`,
                                        size: 18,
                                        color: secondary.replace('#', ''),
                                        font: isRtl ? 'Arial' : bodyFont,
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                                border: { top: { style: BorderStyle.SINGLE, size: 8, color: 'EEEEEE' } },
                            }),
                        ],
                    }),
                },
                children: [
                    // Company Name Title
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: companyName,
                                size: 52,
                                bold: true,
                                color: primary.replace('#', ''),
                                font: isRtl ? 'Arial' : headerFont,
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 80 },
                        bidirectional: isRtl,
                    }),
                    // Style subtitle
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: identity.logo.style || '',
                                size: 20,
                                color: secondary.replace('#', ''),
                                font: isRtl ? 'Arial' : bodyFont,
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        bidirectional: isRtl,
                    }),
                    // Divider line
                    new Paragraph({
                        children: [],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 24, color: primary.replace('#', '') } },
                        spacing: { after: 400 },
                    }),
                    // Brand Overview Section
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: getText('docBrandOverview'),
                                size: 26,
                                color: primary.replace('#', ''),
                                font: isRtl ? 'Arial' : headerFont,
                                italics: true,
                            }),
                        ],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: primary.replace('#', '') } },
                        spacing: { before: 200, after: 150 },
                        bidirectional: isRtl,
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: identity.logo.prompt || '',
                                size: 20,
                                font: isRtl ? 'Arial' : bodyFont,
                            }),
                        ],
                        spacing: { after: 300 },
                        bidirectional: isRtl,
                    }),
                    // Color Palette Section
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: getText('docColorPalette'),
                                size: 26,
                                color: primary.replace('#', ''),
                                font: isRtl ? 'Arial' : headerFont,
                                italics: true,
                            }),
                        ],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: primary.replace('#', '') } },
                        spacing: { before: 200, after: 150 },
                        bidirectional: isRtl,
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: identity.colorPalette.map(color => {
                                    const textColor = getContrastColor(color.hex);
                                    const lightColorBorder = needsBorder(color.hex) ? {
                                        top: { style: BorderStyle.SINGLE, size: 8, color: 'E0E0E0' },
                                        bottom: { style: BorderStyle.SINGLE, size: 8, color: 'E0E0E0' },
                                        left: { style: BorderStyle.SINGLE, size: 8, color: 'E0E0E0' },
                                        right: { style: BorderStyle.SINGLE, size: 8, color: 'E0E0E0' },
                                    } : undefined;
                                    return new TableCell({
                                        children: [
                                            new Paragraph({ children: [], spacing: { after: 300 } }),
                                            new Paragraph({
                                                children: [new TextRun({
                                                    text: color.hex,
                                                    bold: true,
                                                    size: 18,
                                                    font: 'Arial',
                                                    color: textColor.replace('#', ''),
                                                })],
                                                alignment: AlignmentType.CENTER,
                                            }),
                                            new Paragraph({
                                                children: [new TextRun({
                                                    text: color.name,
                                                    size: 16,
                                                    color: textColor.replace('#', ''),
                                                    font: isRtl ? 'Arial' : bodyFont,
                                                })],
                                                alignment: AlignmentType.CENTER,
                                                bidirectional: isRtl,
                                            }),
                                            new Paragraph({ children: [], spacing: { after: 300 } }),
                                        ],
                                        shading: { fill: color.hex.replace('#', ''), type: ShadingType.SOLID, color: 'auto' },
                                        verticalAlign: VerticalAlign.CENTER,
                                        width: { size: Math.floor(100 / identity.colorPalette.length), type: WidthType.PERCENTAGE },
                                        borders: lightColorBorder,
                                    });
                                }),
                            }),
                        ],
                    }),
                    // Typography Section
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: getText('docTypography'),
                                size: 26,
                                color: primary.replace('#', ''),
                                font: isRtl ? 'Arial' : headerFont,
                                italics: true,
                            }),
                        ],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: primary.replace('#', '') } },
                        spacing: { before: 350, after: 200 },
                        bidirectional: isRtl,
                    }),
                    // Header font name
                    new Paragraph({
                        children: [new TextRun({
                            text: headerFont,
                            size: 36,
                            color: primary.replace('#', ''),
                            font: headerFont,
                        })],
                        spacing: { after: 60 },
                    }),
                    new Paragraph({
                        children: [new TextRun({
                            text: isRtl ? 'أبجد هوز حطي كلمن' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
                            size: 20,
                            font: isRtl ? 'Arial' : headerFont,
                        })],
                        spacing: { after: 250 },
                        bidirectional: isRtl,
                    }),
                    // Body font name
                    new Paragraph({
                        children: [new TextRun({
                            text: bodyFont,
                            size: 36,
                            color: primary.replace('#', ''),
                            font: bodyFont,
                        })],
                        spacing: { after: 60 },
                    }),
                    new Paragraph({
                        children: [new TextRun({
                            text: isRtl ? 'أبجد هوز حطي كلمن' : 'abcdefghijklmnopqrstuvwxyz',
                            size: 20,
                            font: isRtl ? 'Arial' : bodyFont,
                        })],
                        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: primary.replace('#', '') } },
                        spacing: { after: 80 },
                        bidirectional: isRtl,
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
        setIsExporting('docx');
        try {
            const doc = await createDoc();
            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${companyName}-Brand-Document.docx`);
        } catch (error) {
            console.error(error);
            alert("Export failed. Please try again.");
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportPptx = async () => {
        setIsExporting('pptx');
        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_16x9';
        pptx.rtlMode = isRtl;

        let logoBase64: string;
        try {
            if (logoUrl.startsWith('data:')) {
                logoBase64 = logoUrl;
            } else {
                const res = await fetch(logoUrl);
                const blob = await res.blob();
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                await new Promise((resolve) => { reader.onloadend = resolve; });
                logoBase64 = reader.result as string;
            }
        } catch (error) {
            console.error("Error fetching logo for PPTX:", error);
            alert("Failed to load logo.");
            setIsExporting(null);
            return;
        }

        const fontToUse = isRtl ? 'Arial' : headerFont;
        const bodyFontToUse = isRtl ? 'Arial' : bodyFont;

        // Helper to get logo x position based on controls
        const getLogoX = (logoWidth: number = 1.2): number => {
            if (logoPosition.horizontal === 'center') {
                return (10 - logoWidth) / 2; // Center of 10" slide
            } else if (logoPosition.horizontal === 'left') {
                return isRtl ? (10 - logoWidth - 0.3) : 0.3;
            } else {
                return isRtl ? 0.3 : (10 - logoWidth - 0.3);
            }
        };

        // Helper to get logo y position based on controls
        const getLogoY = (): number => {
            return logoPosition.vertical === 'header' ? 0.3 : 4.3; // Top or above footer bar
        };

        // Check if we're in centered mode (logo centered at header)
        const isCenteredHeader = logoPosition.horizontal === 'center' && logoPosition.vertical === 'header';
        // Content starts lower when logo is centered at top (logo ends at ~1.1", add small gap)
        const contentStartY = isCenteredHeader ? 1.25 : 0.5;

        // Title slide with logo (no filter)
        const slide1 = pptx.addSlide();
        slide1.background = { color: primary.replace('#', '') };
        if (logoBase64) {
            slide1.addImage({ data: logoBase64, x: 4, y: 0.8, w: 2, h: 2 }); // Title slide always centered
        }
        slide1.addText(companyName, {
            x: 0.5, y: 3, w: 9, h: 1,
            fontSize: 48, color: 'FFFFFF', bold: true, align: 'center',
            fontFace: fontToUse,
            rtlMode: isRtl,
        });
        slide1.addText(identity.logo.style || '', {
            x: 0.5, y: 4, w: 9, h: 0.5,
            fontSize: 20, color: 'EEEEEE', align: 'center',
            fontFace: bodyFontToUse,
            rtlMode: isRtl,
        });

        // Logo size for slides 2-4 (smaller than title slide)
        const logoSize = 0.8;

        // Mission slide with logo position controlled
        const slide2 = pptx.addSlide();
        if (logoBase64) {
            slide2.addImage({ data: logoBase64, x: getLogoX(logoSize), y: getLogoY(), w: logoSize, h: logoSize });
        }
        slide2.addText(getText('docOurMission'), {
            x: 0, y: contentStartY, w: 10, h: 0.8,
            fontSize: 26, color: primary.replace('#', ''), bold: true, align: 'center',
            fontFace: fontToUse,
            rtlMode: isRtl,
        });
        slide2.addText(identity.logo.prompt || '', {
            x: 0.5, y: contentStartY + 1.0, w: 9, h: 2.5,
            fontSize: 16, color: text.replace('#', ''), align: 'center',
            fontFace: bodyFontToUse,
            rtlMode: isRtl,
        });
        // Footer bar at very bottom of slide (16:9 slide height is 5.625")
        slide2.addShape(pptx.ShapeType.rect, { x: 0, y: 5.33, w: 10, h: 0.3, fill: { color: primary.replace('#', '') } });

        // Colors slide with logo position controlled
        const slide3 = pptx.addSlide();
        if (logoBase64) {
            slide3.addImage({ data: logoBase64, x: getLogoX(logoSize), y: getLogoY(), w: logoSize, h: logoSize });
        }
        slide3.addText(getText('docBrandColors'), {
            x: 0, y: contentStartY, w: 10, h: 0.8,
            fontSize: 26, color: primary.replace('#', ''), bold: true, align: 'center',
            fontFace: fontToUse,
            rtlMode: isRtl,
        });
        // Calculate centered positions for color boxes
        const colorCount = identity.colorPalette.length;
        const boxWidth = 1.4;
        const boxGap = 0.25;
        const totalColorsWidth = (colorCount * boxWidth) + ((colorCount - 1) * boxGap);
        const colorsStartX = (10 - totalColorsWidth) / 2;
        const colorsY = contentStartY + 0.9;

        identity.colorPalette.forEach((color, index) => {
            const xPos = colorsStartX + (index * (boxWidth + boxGap));
            slide3.addShape(pptx.ShapeType.rect, {
                x: xPos, y: colorsY, w: boxWidth, h: boxWidth,
                fill: { color: color.hex.replace('#', '') },
                line: needsBorder(color.hex) ? { color: 'CCCCCC', width: 1 } : { color: 'FFFFFF', width: 0 },
            });
            // Hex code right below box
            slide3.addText(color.hex, { x: xPos, y: colorsY + boxWidth + 0.1, w: boxWidth, fontSize: 11, align: 'center', fontFace: 'Arial', bold: true });
            // Color name below hex
            slide3.addText(color.name, { x: xPos, y: colorsY + boxWidth + 0.35, w: boxWidth, fontSize: 9, align: 'center', color: secondary.replace('#', ''), fontFace: bodyFontToUse, rtlMode: isRtl });
        });
        // Footer bar at very bottom of slide
        slide3.addShape(pptx.ShapeType.rect, { x: 0, y: 5.33, w: 10, h: 0.3, fill: { color: primary.replace('#', '') } });

        // Typography slide with logo position controlled
        const slide4 = pptx.addSlide();
        if (logoBase64) {
            slide4.addImage({ data: logoBase64, x: getLogoX(logoSize), y: getLogoY(), w: logoSize, h: logoSize });
        }
        slide4.addText(getText('docTypography'), {
            x: 0, y: contentStartY, w: 10, h: 0.8,
            fontSize: 26, color: primary.replace('#', ''), bold: true, align: 'center',
            fontFace: fontToUse,
            rtlMode: isRtl,
        });
        // Styled box for header font (with left border effect using thin rectangle)
        const typoBoxY1 = contentStartY + 0.9;
        slide4.addShape(pptx.ShapeType.rect, { x: 1, y: typoBoxY1, w: 8, h: 0.7, fill: { color: primary.replace('#', ''), transparency: 95 } });
        slide4.addShape(pptx.ShapeType.rect, { x: 1, y: typoBoxY1, w: 0.06, h: 0.7, fill: { color: primary.replace('#', '') } });
        slide4.addText(`${getText('docHeaderFont')}: ${headerFont}`, {
            x: 1.2, y: typoBoxY1, w: 7.6, h: 0.7,
            fontSize: 20, color: text.replace('#', ''), fontFace: fontToUse, bold: true, align: 'center',
            valign: 'middle',
            rtlMode: isRtl,
        });
        // Styled box for body font
        const typoBoxY2 = typoBoxY1 + 0.9;
        slide4.addShape(pptx.ShapeType.rect, { x: 1, y: typoBoxY2, w: 8, h: 0.7, fill: { color: secondary.replace('#', ''), transparency: 95 } });
        slide4.addShape(pptx.ShapeType.rect, { x: 1, y: typoBoxY2, w: 0.06, h: 0.7, fill: { color: secondary.replace('#', '') } });
        slide4.addText(`${getText('docBodyFont')}: ${bodyFont}`, {
            x: 1.2, y: typoBoxY2, w: 7.6, h: 0.7,
            fontSize: 16, color: text.replace('#', ''), fontFace: bodyFontToUse, align: 'center',
            valign: 'middle',
            rtlMode: isRtl,
        });
        // Sample text
        slide4.addText(getText('docQuickFox'), {
            x: 0, y: typoBoxY2 + 0.9, w: 10, h: 0.6,
            fontSize: 14, color: secondary.replace('#', ''), fontFace: bodyFontToUse, italic: true, align: 'center',
            rtlMode: isRtl,
        });
        // Footer bar at very bottom of slide
        slide4.addShape(pptx.ShapeType.rect, { x: 0, y: 5.33, w: 10, h: 0.3, fill: { color: primary.replace('#', '') } });

        const pptxBlob = await pptx.write({ outputType: 'blob' }) as Blob;
        saveAs(pptxBlob, `${companyName}-Presentation.pptx`);
        setIsExporting(null);
    };

    const handleDownloadBundle = async () => {
        setIsExporting('bundle');
        const zip = new JSZip();

        try {
            const doc = await createDoc();
            const docBlob = await Packer.toBlob(doc);
            zip.file(`${companyName}-Brand-Document.docx`, docBlob);
        } catch (error) {
            console.error('DOCX generation failed:', error);
        }

        const fontsFolder = zip.folder('fonts');
        const fontNames = [headerFont, bodyFont];
        const weights: ('Regular' | 'Bold')[] = ['Regular', 'Bold'];

        for (const fontName of fontNames) {
            for (const weight of weights) {
                const filename = `${fontName.replace(/\s/g, '')}-${weight}.ttf`;
                try {
                    const buffer = await fetchFontBuffer(fontName, weight);
                    if (buffer) {
                        fontsFolder!.file(filename, buffer);
                    }
                } catch (error) {
                    console.error(`Error fetching font ${filename}:`, error);
                }
            }
        }

        const cssContent = `/* Brand CSS for ${companyName} */
:root {
    --brand-primary: ${primary};
    --brand-secondary: ${secondary};
    --brand-accent: ${accent};
}

body {
    font-family: '${bodyFont}', sans-serif;
    color: #1a1a1a;
}

h1, h2, h3 {
    font-family: '${headerFont}', serif;
    color: var(--brand-primary);
}`;
        zip.file('brand.css', cssContent);

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${companyName}-Brand-Bundle.zip`);
        setIsExporting(null);
    };

    return (
        <div className="doc-templates-root" id="documents-section">
            <link href={headerFontUrl} rel="stylesheet" />
            <link href={bodyFontUrl} rel="stylesheet" />
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />

            <style>{`
                .doc-templates-root {
                    --primary: ${primary};
                    --secondary: ${secondary};
                    --accent: ${accent};
                    margin-top: 3rem;
                }

                .doc-container {
                    background: #ffffff;
                    border-radius: 20px;
                    overflow: hidden;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
                }

                .doc-header {
                    padding: 1.75rem 2rem;
                    background: linear-gradient(135deg, #fafbfc 0%, #f3f4f6 100%);
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1.5rem;
                    flex-wrap: wrap;
                }

                .doc-header-content h2 {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #111827;
                    margin: 0 0 0.25rem;
                }

                .doc-header-content p {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.875rem;
                    color: #6b7280;
                    margin: 0;
                }

                .doc-tabs {
                    display: flex;
                    background: #ffffff;
                    border-radius: 12px;
                    padding: 4px;
                    gap: 4px;
                    border: 1px solid #e5e7eb;
                }

                .doc-tab {
                    padding: 0.625rem 1.25rem;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #6b7280;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .doc-tab:hover:not(.active) {
                    color: #374151;
                    background: #f9fafb;
                }

                .doc-tab.active {
                    color: #ffffff;
                    background: var(--primary);
                }

                .doc-tab svg {
                    width: 16px;
                    height: 16px;
                }

                .doc-toolbar {
                    padding: 1rem 2rem;
                    background: #ffffff;
                    border-bottom: 1px solid #f3f4f6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }

                .doc-controls {
                    display: flex;
                    gap: 1.5rem;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .doc-control-group {
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                }

                .doc-control-label {
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #9ca3af;
                    text-transform: uppercase;
                }

                .doc-control-buttons {
                    display: flex;
                    background: #f9fafb;
                    border-radius: 8px;
                    padding: 3px;
                    gap: 2px;
                    border: 1px solid #e5e7eb;
                }

                .doc-control-btn {
                    padding: 0.375rem 0.75rem;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.75rem;
                    font-weight: 500;
                    color: #6b7280;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }

                .doc-control-btn:hover:not(.active) {
                    color: #374151;
                }

                .doc-control-btn.active {
                    color: #ffffff;
                    background: var(--primary);
                }

                .doc-export-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .doc-export-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                    padding: 0.625rem 1rem;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.8125rem;
                    font-weight: 600;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .doc-export-btn:active {
                    transform: scale(0.97);
                }

                .doc-export-btn.pdf {
                    background: #f3f4f6;
                    color: #374151;
                    border: 1px solid #e5e7eb;
                }

                .doc-export-btn.pdf:hover {
                    background: #e5e7eb;
                }

                .doc-export-btn.docx {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                }

                .doc-export-btn.pptx {
                    background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                    color: white;
                }

                .doc-export-btn.bundle {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
                    color: white;
                }

                .doc-export-btn.loading {
                    opacity: 0.7;
                    pointer-events: none;
                }

                .doc-export-btn svg {
                    width: 15px;
                    height: 15px;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .doc-export-btn.loading svg {
                    animation: spin 0.8s linear infinite;
                }

                .doc-preview-area {
                    padding: 2.5rem;
                    background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
                    min-height: 400px;
                    display: flex;
                    justify-content: center;
                    overflow-x: auto;
                }

                .doc-preview {
                    background: white;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                }

                .slides-container {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .slide-wrapper {
                    position: relative;
                }

                .slide-label {
                    position: absolute;
                    top: -1.5rem;
                    ${isRtl ? 'right' : 'left'}: 0;
                    font-family: 'Outfit', sans-serif;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #9ca3af;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .slide-label-number {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 20px;
                    height: 20px;
                    background: #f3f4f6;
                    border-radius: 6px;
                    font-size: 0.6875rem;
                    font-weight: 700;
                    color: #6b7280;
                }

                .slide-preview {
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                    border-radius: 8px;
                    overflow: hidden;
                }

                /* Print styles - ONLY document page, clean white background */
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Hide everything first */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    body > *:not(.doc-templates-root),
                    body > *:not(.doc-templates-root) * {
                        display: none !important;
                        visibility: hidden !important;
                    }

                    /* Hide all container elements */
                    .doc-container {
                        all: unset !important;
                        display: block !important;
                    }

                    .doc-header,
                    .doc-tabs,
                    .doc-toolbar,
                    .doc-controls,
                    .doc-export-buttons,
                    .slides-container,
                    .slide-wrapper,
                    .slide-label,
                    .slide-preview {
                        display: none !important;
                    }

                    .doc-preview-area {
                        all: unset !important;
                        display: block !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        background: white !important;
                    }

                    .doc-templates-root {
                        all: unset !important;
                        display: block !important;
                    }

                    /* Show only the document preview */
                    .doc-preview {
                        display: block !important;
                        visibility: visible !important;
                        position: relative !important;
                        width: 100% !important;
                        max-width: none !important;
                        min-height: auto !important;
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 15mm !important;
                        background: white !important;
                        box-sizing: border-box !important;
                    }

                    .doc-preview * {
                        visibility: visible !important;
                    }
                }
            `}</style>

            <div className="doc-container">
                {/* Header */}
                <div className="doc-header">
                    <div className="doc-header-content">
                        <h2>{getText('docBrandDocuments')}</h2>
                        <p>{getText('docSubtitle')}</p>
                    </div>

                    <div className="doc-tabs">
                        <button
                            onClick={() => setActiveTab('document')}
                            className={`doc-tab ${activeTab === 'document' ? 'active' : ''}`}
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {getText('docTabDocument')}
                        </button>
                        <button
                            onClick={() => setActiveTab('presentation')}
                            className={`doc-tab ${activeTab === 'presentation' ? 'active' : ''}`}
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                            </svg>
                            {getText('docTabPresentation')}
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="doc-toolbar">
                    <div className="doc-controls">
                        <div className="doc-control-group">
                            <span className="doc-control-label">{getText('docPosition')}</span>
                            <div className="doc-control-buttons">
                                <button
                                    onClick={() => setLogoPosition(prev => ({ ...prev, vertical: 'header' }))}
                                    className={`doc-control-btn ${logoPosition.vertical === 'header' ? 'active' : ''}`}
                                >
                                    {getText('docHeader')}
                                </button>
                                <button
                                    onClick={() => setLogoPosition(prev => ({ ...prev, vertical: 'footer' }))}
                                    className={`doc-control-btn ${logoPosition.vertical === 'footer' ? 'active' : ''}`}
                                >
                                    {getText('docFooter')}
                                </button>
                            </div>
                        </div>
                        <div className="doc-control-group">
                            <span className="doc-control-label">{getText('docAlign')}</span>
                            <div className="doc-control-buttons">
                                <button
                                    onClick={() => setLogoPosition(prev => ({ ...prev, horizontal: 'left' }))}
                                    className={`doc-control-btn ${logoPosition.horizontal === 'left' ? 'active' : ''}`}
                                >
                                    {getText('docLeft')}
                                </button>
                                <button
                                    onClick={() => setLogoPosition(prev => ({ ...prev, horizontal: 'center' }))}
                                    className={`doc-control-btn ${logoPosition.horizontal === 'center' ? 'active' : ''}`}
                                >
                                    {getText('docCenter')}
                                </button>
                                <button
                                    onClick={() => setLogoPosition(prev => ({ ...prev, horizontal: 'right' }))}
                                    className={`doc-control-btn ${logoPosition.horizontal === 'right' ? 'active' : ''}`}
                                >
                                    {getText('docRight')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="doc-export-buttons">
                        <button onClick={handlePrint} className="doc-export-btn pdf">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            {getText('docExportPDF')}
                        </button>

                        {activeTab === 'document' ? (
                            <button
                                onClick={handleExportDocx}
                                className={`doc-export-btn docx ${isExporting === 'docx' ? 'loading' : ''}`}
                                disabled={isExporting !== null}
                            >
                                {isExporting === 'docx' ? (
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                ) : (
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                )}
                                {getText('docExportDOCX')}
                            </button>
                        ) : (
                            <button
                                onClick={handleExportPptx}
                                className={`doc-export-btn pptx ${isExporting === 'pptx' ? 'loading' : ''}`}
                                disabled={isExporting !== null}
                            >
                                {isExporting === 'pptx' ? (
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                ) : (
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                    </svg>
                                )}
                                {getText('docExportPPTX')}
                            </button>
                        )}

                        <button
                            onClick={handleDownloadBundle}
                            className={`doc-export-btn bundle ${isExporting === 'bundle' ? 'loading' : ''}`}
                            disabled={isExporting !== null}
                        >
                            {isExporting === 'bundle' ? (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                            ) : (
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            {getText('docExportBundle')}
                        </button>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="doc-preview-area">
                    {activeTab === 'document' && (
                        <div
                            ref={printRef}
                            className="doc-preview"
                            dir={isRtl ? 'rtl' : 'ltr'}
                            style={{
                                width: '210mm',
                                minHeight: '297mm',
                                padding: '20mm',
                                boxSizing: 'border-box',
                                fontFamily: `'${bodyFont}', sans-serif`,
                                color: text,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            {/* Header with logo */}
                            {logoPosition.vertical === 'header' && logoUrl && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: logoPosition.horizontal === 'left' ? 'flex-start' : logoPosition.horizontal === 'right' ? 'flex-end' : 'center',
                                    marginBottom: '15px',
                                }}>
                                    <img src={logoUrl} alt="Logo" style={{ height: '65px', objectFit: 'contain' }} />
                                </div>
                            )}

                            {/* Title */}
                            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                <h1 style={{
                                    fontFamily: `'${headerFont}', serif`,
                                    color: primary,
                                    fontSize: '26pt',
                                    margin: '0 0 4px 0',
                                    fontWeight: 700,
                                }}>{companyName}</h1>
                                <div style={{
                                    fontFamily: `'${bodyFont}', sans-serif`,
                                    color: secondary,
                                    fontSize: '10pt',
                                }}>{identity.logo.style}</div>
                            </div>

                            {/* Divider line */}
                            <div style={{ borderBottom: `3px solid ${primary}`, marginBottom: '25px' }} />

                            {/* Content */}
                            <div style={{ fontSize: '10pt', lineHeight: 1.5, flex: 1 }}>
                                {/* Brand Overview */}
                                <h2 style={{
                                    fontFamily: `'${headerFont}', serif`,
                                    color: primary,
                                    fontSize: '13pt',
                                    fontStyle: 'italic',
                                    fontWeight: 'normal',
                                    borderBottom: `1px solid ${primary}`,
                                    paddingBottom: '4px',
                                    marginTop: '15px',
                                    marginBottom: '10px',
                                }}>
                                    {getText('docBrandOverview')}
                                </h2>
                                <p style={{ margin: '0 0 15px 0', textAlign: 'center' }}>{identity.logo.prompt}</p>

                                {/* Color Palette - Table matching Word exactly */}
                                <h2 style={{
                                    fontFamily: `'${headerFont}', serif`,
                                    color: primary,
                                    fontSize: '13pt',
                                    fontStyle: 'italic',
                                    fontWeight: 'normal',
                                    borderBottom: `1px solid ${primary}`,
                                    paddingBottom: '4px',
                                    marginTop: '15px',
                                    marginBottom: '10px',
                                }}>
                                    {getText('docColorPalette')}
                                </h2>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
                                    <tbody>
                                        <tr>
                                            {identity.colorPalette.map((color, idx) => {
                                                const textColor = getContrastColor(color.hex);
                                                return (
                                                    <td key={idx} style={{
                                                        backgroundColor: color.hex,
                                                        color: textColor,
                                                        textAlign: 'center',
                                                        padding: '20px 8px',
                                                        width: `${100 / identity.colorPalette.length}%`,
                                                        verticalAlign: 'middle',
                                                        border: needsBorder(color.hex) ? '1px solid #E0E0E0' : 'none',
                                                    }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '9pt' }}>{color.hex}</div>
                                                        <div style={{ fontSize: '8pt' }}>{color.name}</div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Typography */}
                                <h2 style={{
                                    fontFamily: `'${headerFont}', serif`,
                                    color: primary,
                                    fontSize: '13pt',
                                    fontStyle: 'italic',
                                    fontWeight: 'normal',
                                    borderBottom: `1px solid ${primary}`,
                                    paddingBottom: '4px',
                                    marginTop: '20px',
                                    marginBottom: '12px',
                                }}>
                                    {getText('docTypography')}
                                </h2>
                                <div style={{ marginBottom: '12px' }}>
                                    <div style={{ fontFamily: `'${headerFont}', serif`, fontSize: '18pt', color: primary, marginBottom: '2px' }}>{headerFont}</div>
                                    <div style={{ fontFamily: `'${headerFont}', serif`, fontSize: '10pt' }}>
                                        {isRtl ? 'أبجد هوز حطي كلمن سعفص قرشت' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '18pt', color: primary, marginBottom: '2px' }}>{bodyFont}</div>
                                    <div style={{
                                        fontFamily: `'${bodyFont}', sans-serif`,
                                        fontSize: '10pt',
                                        borderBottom: `1px solid ${primary}`,
                                        paddingBottom: '8px',
                                    }}>
                                        {isRtl ? 'أبجد هوز حطي كلمن سعفص قرشت' : 'abcdefghijklmnopqrstuvwxyz'}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ marginTop: 'auto', textAlign: 'center', color: secondary, fontSize: '8pt', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                {logoPosition.vertical === 'footer' && logoUrl && (
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: logoPosition.horizontal === 'left' ? 'flex-start' : logoPosition.horizontal === 'right' ? 'flex-end' : 'center',
                                        marginBottom: '8px',
                                    }}>
                                        <img src={logoUrl} alt="Logo" style={{ height: '30px', objectFit: 'contain' }} />
                                    </div>
                                )}
                                <span>{getText('docConfidential')} • {getText('docGeneratedOn')} {new Date().toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'presentation' && (
                        <div className="slides-container" dir={isRtl ? 'rtl' : 'ltr'}>
                            {/* Slide 1: Title - Logo shown normally */}
                            <div className="slide-wrapper">
                                <div className="slide-label">
                                    <span className="slide-label-number">01</span>
                                    {getText('docSlideTitle')}
                                </div>
                                <div
                                    className="slide-preview"
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
                                        position: 'relative',
                                    }}
                                >
                                    {logoUrl && <img src={logoUrl} alt="Logo" style={{ height: '120px', marginBottom: '24px' }} />}
                                    <h1 style={{ fontFamily: `'${headerFont}', serif`, fontSize: '44pt', fontWeight: 'bold', marginBottom: '12px' }}>{companyName}</h1>
                                    <p style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '18pt', opacity: 0.9 }}>{identity.logo.style}</p>
                                </div>
                            </div>

                            {/* Slide 2: Mission - Logo position controlled */}
                            <div className="slide-wrapper">
                                <div className="slide-label">
                                    <span className="slide-label-number">02</span>
                                    {getText('docSlideMission')}
                                </div>
                                <div
                                    className="slide-preview"
                                    style={{
                                        width: '960px',
                                        height: '540px',
                                        backgroundColor: 'white',
                                        padding: logoPosition.horizontal === 'center' && logoPosition.vertical === 'header'
                                            ? '100px 50px 50px 50px'
                                            : '50px',
                                        position: 'relative',
                                    }}
                                >
                                    {logoUrl && (
                                        <img
                                            src={logoUrl}
                                            alt="Logo"
                                            style={getSlideLogoStyle()}
                                        />
                                    )}
                                    <h2 style={{ fontFamily: `'${headerFont}', serif`, color: primary, fontSize: '26pt', marginBottom: '20px' }}>
                                        {getText('docOurMission')}
                                    </h2>
                                    <p style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '16pt', color: text, lineHeight: 1.6, maxWidth: '800px' }}>
                                        {identity.logo.prompt}
                                    </p>
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '16px', backgroundColor: primary }}></div>
                                </div>
                            </div>

                            {/* Slide 3: Colors - Logo position controlled */}
                            <div className="slide-wrapper">
                                <div className="slide-label">
                                    <span className="slide-label-number">03</span>
                                    {getText('docSlideColors')}
                                </div>
                                <div
                                    className="slide-preview"
                                    style={{
                                        width: '960px',
                                        height: '540px',
                                        backgroundColor: 'white',
                                        padding: logoPosition.horizontal === 'center' && logoPosition.vertical === 'header'
                                            ? '100px 50px 50px 50px'
                                            : '50px',
                                        position: 'relative',
                                    }}
                                >
                                    {logoUrl && (
                                        <img
                                            src={logoUrl}
                                            alt="Logo"
                                            style={getSlideLogoStyle()}
                                        />
                                    )}
                                    <h2 style={{ fontFamily: `'${headerFont}', serif`, color: primary, fontSize: '26pt', marginBottom: '30px' }}>
                                        {getText('docBrandColors')}
                                    </h2>
                                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                                        {identity.colorPalette.map((color, idx) => (
                                            <div key={idx} style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    width: '100px',
                                                    height: '100px',
                                                    backgroundColor: color.hex,
                                                    borderRadius: '10px',
                                                    marginBottom: '10px',
                                                    border: needsBorder(color.hex) ? '1px solid #E0E0E0' : 'none',
                                                    boxSizing: 'border-box',
                                                }}></div>
                                                <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '11pt', fontWeight: 'bold', color: text }}>{color.hex}</div>
                                                <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '9pt', color: secondary }}>{color.name}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '16px', backgroundColor: primary }}></div>
                                </div>
                            </div>

                            {/* Slide 4: Typography - Logo position controlled */}
                            <div className="slide-wrapper">
                                <div className="slide-label">
                                    <span className="slide-label-number">04</span>
                                    {getText('docSlideTypography')}
                                </div>
                                <div
                                    className="slide-preview"
                                    style={{
                                        width: '960px',
                                        height: '540px',
                                        backgroundColor: 'white',
                                        padding: logoPosition.horizontal === 'center' && logoPosition.vertical === 'header'
                                            ? '100px 50px 50px 50px'
                                            : '50px',
                                        position: 'relative',
                                    }}
                                >
                                    {logoUrl && (
                                        <img
                                            src={logoUrl}
                                            alt="Logo"
                                            style={getSlideLogoStyle()}
                                        />
                                    )}
                                    <h2 style={{ fontFamily: `'${headerFont}', serif`, color: primary, fontSize: '26pt', marginBottom: '30px' }}>
                                        {getText('docTypography')}
                                    </h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{
                                            padding: '16px',
                                            background: `${primary}08`,
                                            borderRadius: '10px',
                                            borderLeft: `4px solid ${primary}`,
                                        }}>
                                            <div style={{ fontFamily: `'${headerFont}', serif`, fontSize: '22pt', color: text, fontWeight: 'bold' }}>
                                                {getText('docHeaderFont')}: {headerFont}
                                            </div>
                                        </div>
                                        <div style={{
                                            padding: '16px',
                                            background: `${secondary}08`,
                                            borderRadius: '10px',
                                            borderLeft: `4px solid ${secondary}`,
                                        }}>
                                            <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '16pt', color: text }}>
                                                {getText('docBodyFont')}: {bodyFont}
                                            </div>
                                        </div>
                                        <div style={{ fontFamily: `'${bodyFont}', sans-serif`, fontSize: '14pt', color: secondary, fontStyle: 'italic', marginTop: '4px' }}>
                                            {getText('docQuickFox')}
                                        </div>
                                    </div>
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '16px', backgroundColor: primary }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentTemplates;

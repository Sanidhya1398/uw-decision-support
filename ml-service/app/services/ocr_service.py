"""
OCR Service using EasyOCR for document text extraction.
Supports PDFs (searchable and scanned) and images.
"""

import os
import tempfile
from typing import Optional, List, Dict, Any
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Lazy load EasyOCR to avoid startup delays
_ocr_instance = None

def get_ocr():
    """Get or create EasyOCR instance (lazy loading)."""
    global _ocr_instance
    if _ocr_instance is None:
        try:
            import easyocr
            # Initialize with English (add 'hi' for Hindi if needed)
            _ocr_instance = easyocr.Reader(
                ['en'],
                gpu=False,  # Set True if GPU available
                verbose=False,
            )
            logger.info("EasyOCR initialized successfully")
        except ImportError as e:
            logger.error(f"EasyOCR not available: {e}")
            _ocr_instance = "unavailable"
    return _ocr_instance if _ocr_instance != "unavailable" else None


def pdf_to_images(pdf_path: str) -> List[str]:
    """Convert PDF pages to images for OCR."""
    try:
        from pdf2image import convert_from_path

        # Create temp directory for images
        temp_dir = tempfile.mkdtemp()

        # Convert PDF to images (300 DPI for good OCR quality)
        images = convert_from_path(pdf_path, dpi=200)

        image_paths = []
        for i, image in enumerate(images):
            image_path = os.path.join(temp_dir, f"page_{i+1}.png")
            image.save(image_path, "PNG")
            image_paths.append(image_path)

        logger.info(f"Converted PDF to {len(image_paths)} images")
        return image_paths
    except Exception as e:
        logger.error(f"PDF to image conversion failed: {e}")
        return []


def extract_text_from_image(image_path: str) -> Dict[str, Any]:
    """Extract text from a single image using EasyOCR."""
    ocr = get_ocr()
    if ocr is None:
        return {
            "text": "",
            "confidence": 0,
            "error": "EasyOCR not available"
        }

    try:
        # EasyOCR returns list of (bbox, text, confidence)
        result = ocr.readtext(image_path)

        if not result:
            return {
                "text": "",
                "confidence": 0,
                "boxes": []
            }

        # Extract text and confidence from result
        lines = []
        confidences = []
        boxes = []

        for detection in result:
            if len(detection) >= 3:
                bbox, text, conf = detection[0], detection[1], detection[2]
                lines.append(text)
                confidences.append(conf)
                boxes.append({
                    "text": text,
                    "confidence": conf,
                    "coordinates": bbox
                })

        full_text = " ".join(lines)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0

        return {
            "text": full_text,
            "confidence": avg_confidence,
            "boxes": boxes,
            "line_count": len(lines)
        }
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        return {
            "text": "",
            "confidence": 0,
            "error": str(e)
        }


def extract_text_from_pdf(pdf_path: str) -> Dict[str, Any]:
    """Extract text from PDF using OCR."""
    # First try native PDF text extraction
    native_text = extract_native_pdf_text(pdf_path)

    if native_text and len(native_text.strip()) > 100:
        logger.info("Using native PDF text extraction")
        return {
            "text": native_text,
            "confidence": 0.95,
            "method": "native",
            "page_count": count_pdf_pages(pdf_path)
        }

    # Fall back to OCR for scanned PDFs
    logger.info("PDF appears scanned, using OCR")
    image_paths = pdf_to_images(pdf_path)

    if not image_paths:
        return {
            "text": "",
            "confidence": 0,
            "method": "ocr",
            "error": "Failed to convert PDF to images. Install poppler: https://github.com/oschwartz10612/poppler-windows/releases"
        }

    all_text = []
    all_confidences = []
    all_boxes = []

    for i, image_path in enumerate(image_paths):
        logger.info(f"Processing page {i+1}/{len(image_paths)}")
        result = extract_text_from_image(image_path)
        if result.get("text"):
            all_text.append(f"--- Page {i+1} ---\n{result['text']}")
            all_confidences.append(result.get("confidence", 0))
            all_boxes.extend(result.get("boxes", []))

        # Clean up temp image
        try:
            os.remove(image_path)
        except:
            pass

    # Clean up temp directory
    if image_paths:
        try:
            os.rmdir(os.path.dirname(image_paths[0]))
        except:
            pass

    full_text = "\n\n".join(all_text)
    avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0

    return {
        "text": full_text,
        "confidence": avg_confidence,
        "method": "ocr",
        "page_count": len(image_paths),
        "boxes": all_boxes
    }


def extract_native_pdf_text(pdf_path: str) -> str:
    """Try to extract text directly from PDF (for searchable PDFs)."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(pdf_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip()
    except ImportError:
        logger.warning("PyMuPDF not available for native PDF extraction")
        return ""
    except Exception as e:
        logger.warning(f"Native PDF extraction failed: {e}")
        return ""


def count_pdf_pages(pdf_path: str) -> int:
    """Count pages in a PDF."""
    try:
        import fitz
        doc = fitz.open(pdf_path)
        count = len(doc)
        doc.close()
        return count
    except:
        return 0


def process_document(file_path: str, file_type: str) -> Dict[str, Any]:
    """
    Main entry point for document processing.

    Args:
        file_path: Path to the uploaded file
        file_type: MIME type of the file

    Returns:
        Dict with extracted text, confidence, and metadata
    """
    logger.info(f"Processing document: {file_path}, type: {file_type}")

    if file_type == "application/pdf":
        result = extract_text_from_pdf(file_path)
    elif file_type.startswith("image/"):
        result = extract_text_from_image(file_path)
        result["method"] = "ocr"
        result["page_count"] = 1
    else:
        # Try to read as text
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            result = {
                "text": text,
                "confidence": 1.0,
                "method": "text",
                "page_count": 1
            }
        except:
            result = {
                "text": "",
                "confidence": 0,
                "method": "unknown",
                "error": f"Unsupported file type: {file_type}"
            }

    # Add language detection
    if result.get("text"):
        result["language"] = detect_language(result["text"])

    return result


def detect_language(text: str) -> str:
    """Simple language detection."""
    # Check for Hindi/Devanagari
    devanagari_count = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    if devanagari_count > len(text) * 0.1:
        return "hi-en"  # Hindi-English mix
    return "en"


def extract_with_structure(file_path: str) -> Dict[str, Any]:
    """
    Extract text with basic structure preservation.
    """
    try:
        result = process_document(file_path, "application/pdf")
        return {
            "text_blocks": result.get("text", "").split("\n\n"),
            "tables": [],  # EasyOCR doesn't do table detection
            "confidence": result.get("confidence", 0)
        }
    except Exception as e:
        logger.error(f"Structure extraction failed: {e}")
        return {"error": str(e)}

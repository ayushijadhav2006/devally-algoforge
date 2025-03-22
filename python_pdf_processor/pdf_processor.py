#!/usr/bin/env python3
"""
PDF Processor for NGO Connect
This script handles PDF text extraction, table detection, and provides structured data for the chatbot.
"""

import os
import io
import json
import re
import argparse
from typing import Dict, List, Any, Optional, Tuple

# PDF processing libraries
import PyPDF2
import pdfplumber
import pytesseract
from pdf2image import convert_from_bytes, convert_from_path
from PIL import Image

# NLP and data handling
import pandas as pd
import numpy as np

class PDFProcessor:
    """Handles PDF processing with multiple extraction methods for best results"""
    
    def __init__(self, tesseract_path: Optional[str] = None):
        """
        Initialize the PDF processor
        
        Args:
            tesseract_path: Path to tesseract executable (for OCR)
        """
        self.results = {}
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
    
    def process_pdf(self, file_path: str, ocr_enabled: bool = True) -> Dict[str, Any]:
        """
        Process a PDF file with multiple extraction techniques
        
        Args:
            file_path: Path to the PDF file
            ocr_enabled: Whether to use OCR for image-based PDFs
            
        Returns:
            Dict with extracted text, tables, and metadata
        """
        print(f"Processing PDF: {file_path}")
        
        # Read file as bytes
        if os.path.exists(file_path):
            with open(file_path, 'rb') as file:
                pdf_bytes = file.read()
        else:
            raise FileNotFoundError(f"PDF file not found: {file_path}")
        
        # Get basic metadata
        result = {
            "filename": os.path.basename(file_path),
            "filesize": len(pdf_bytes),
            "extracted_text": "",
            "pages": [],
            "tables": [],
            "is_scanned": False,
            "is_donation_report": False,
            "donation_data": None,
            "extraction_method": "text"
        }
        
        # Try multiple extraction methods
        text_result = self._extract_text_with_pypdf(pdf_bytes)
        if not self._is_sufficient_text(text_result):
            # Try with pdfplumber if PyPDF2 didn't get good results
            text_result = self._extract_text_with_pdfplumber(file_path)
            result["extraction_method"] = "pdfplumber"
        
        if not self._is_sufficient_text(text_result) and ocr_enabled:
            # If still not good, try OCR
            text_result = self._extract_text_with_ocr(pdf_bytes)
            result["extraction_method"] = "ocr"
            result["is_scanned"] = True
        
        # Store results
        result["extracted_text"] = text_result.get("full_text", "")
        result["pages"] = text_result.get("pages", [])
        
        # Look for tables
        tables_result = self._extract_tables(file_path)
        if tables_result and tables_result.get("tables"):
            result["tables"] = tables_result.get("tables")
        
        # Check if this is a donation report and extract relevant data
        if self._is_donation_report(result["extracted_text"]):
            result["is_donation_report"] = True
            result["donation_data"] = self._extract_donation_data(result)
        
        return result
    
    def _extract_text_with_pypdf(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract text using PyPDF2"""
        result = {"full_text": "", "pages": []}
        
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
            num_pages = len(pdf_reader.pages)
            
            full_text = ""
            pages = []
            
            for i in range(num_pages):
                page = pdf_reader.pages[i]
                page_text = page.extract_text() or ""
                pages.append(page_text)
                full_text += f"\n\n=== Page {i+1} ===\n\n{page_text}"
            
            result["full_text"] = full_text
            result["pages"] = pages
            print(f"PyPDF2 extracted {len(full_text)} characters")
            
        except Exception as e:
            print(f"Error extracting text with PyPDF2: {e}")
        
        return result
    
    def _extract_text_with_pdfplumber(self, file_path: str) -> Dict[str, Any]:
        """Extract text using pdfplumber (better for complex layouts)"""
        result = {"full_text": "", "pages": []}
        
        try:
            with pdfplumber.open(file_path) as pdf:
                full_text = ""
                pages = []
                
                for i, page in enumerate(pdf.pages):
                    page_text = page.extract_text() or ""
                    pages.append(page_text)
                    full_text += f"\n\n=== Page {i+1} ===\n\n{page_text}"
                
                result["full_text"] = full_text
                result["pages"] = pages
                print(f"pdfplumber extracted {len(full_text)} characters")
                
        except Exception as e:
            print(f"Error extracting text with pdfplumber: {e}")
        
        return result
    
    def _extract_text_with_ocr(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract text using OCR for image-based PDFs"""
        result = {"full_text": "", "pages": []}
        
        try:
            # Convert PDF to images
            images = convert_from_bytes(pdf_bytes)
            full_text = ""
            pages = []
            
            for i, image in enumerate(images):
                # Use pytesseract OCR
                page_text = pytesseract.image_to_string(image)
                pages.append(page_text)
                full_text += f"\n\n=== Page {i+1} ===\n\n{page_text}"
            
            result["full_text"] = full_text
            result["pages"] = pages
            print(f"OCR extracted {len(full_text)} characters")
            
        except Exception as e:
            print(f"Error extracting text with OCR: {e}")
        
        return result
    
    def _extract_tables(self, file_path: str) -> Dict[str, Any]:
        """Extract tables from PDF"""
        result = {"tables": []}
        
        try:
            with pdfplumber.open(file_path) as pdf:
                tables = []
                
                for i, page in enumerate(pdf.pages):
                    page_tables = page.extract_tables()
                    
                    for j, table_data in enumerate(page_tables):
                        if table_data and len(table_data) > 1:  # At least header and one row
                            # Convert to list of dicts
                            headers = [str(h).strip() for h in table_data[0] if h]
                            rows = []
                            
                            for row in table_data[1:]:
                                row_dict = {}
                                for idx, cell in enumerate(row):
                                    if idx < len(headers):
                                        row_dict[headers[idx]] = str(cell).strip() if cell else ""
                                rows.append(row_dict)
                            
                            tables.append({
                                "page": i + 1,
                                "table_number": j + 1,
                                "headers": headers,
                                "rows": rows
                            })
                
                result["tables"] = tables
                print(f"Extracted {len(tables)} tables")
                
        except Exception as e:
            print(f"Error extracting tables: {e}")
        
        return result
    
    def _is_sufficient_text(self, result: Dict[str, Any]) -> bool:
        """Check if enough text was extracted"""
        text = result.get("full_text", "")
        # Consider text sufficient if more than 200 chars and contains real words
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text)
        return len(text) > 200 and len(words) > 20
    
    def _is_donation_report(self, text: str) -> bool:
        """Check if this appears to be a donation report"""
        donation_keywords = [
            "donation", "donor", "contribute", "giving", "fundraising",
            "cash", "online", "crypto", "total", "amount"
        ]
        
        # Check for key terms
        keyword_matches = sum(1 for keyword in donation_keywords if keyword.lower() in text.lower())
        
        # Check for money patterns (e.g., $123.45)
        money_patterns = re.findall(r'\$\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*(?:USD|dollars)', text)
        
        return keyword_matches >= 3 or len(money_patterns) >= 5
    
    def _extract_donation_data(self, result: Dict[str, Any]) -> Dict[str, Any]:
        """Extract structured donation data from text and tables"""
        donation_data = {
            "title": "",
            "date_range": "",
            "total_amount": "",
            "donors": [],
            "donations": []
        }
        
        text = result.get("extracted_text", "")
        
        # Try to find the title
        title_match = re.search(r'(?:^|\n)([^\n]*donation[^\n]*report[^\n]*)', text, re.IGNORECASE)
        if title_match:
            donation_data["title"] = title_match.group(1).strip()
        else:
            donation_data["title"] = "Donation Report"
        
        # Look for total amount
        total_pattern = re.search(r'total.*?(?:amount|donation|cash).*?[\$£€]?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', 
                               text, re.IGNORECASE)
        if total_pattern:
            donation_data["total_amount"] = total_pattern.group(1)
        
        # Extract donors and amounts from tables
        if result.get("tables"):
            for table in result.get("tables"):
                headers = [h.lower() for h in table.get("headers", [])]
                
                # Check if this looks like a donation table
                has_donor = any("donor" in h or "name" in h for h in headers)
                has_amount = any("amount" in h or "total" in h or "donation" in h for h in headers)
                has_date = any("date" in h for h in headers)
                
                if has_donor and has_amount:
                    # This is likely a donation table
                    donor_idx = next((i for i, h in enumerate(headers) if "donor" in h or "name" in h), None)
                    amount_idx = next((i for i, h in enumerate(headers) if "amount" in h or "total" in h or "donation" in h), None)
                    date_idx = next((i for i, h in enumerate(headers) if "date" in h), None)
                    
                    for row in table.get("rows", []):
                        row_values = list(row.values())
                        if len(row_values) > max(donor_idx or 0, amount_idx or 0):
                            donor = row_values[donor_idx] if donor_idx is not None else ""
                            amount = row_values[amount_idx] if amount_idx is not None else ""
                            date = row_values[date_idx] if date_idx is not None else ""
                            
                            if donor and amount:
                                donation_data["donors"].append(donor)
                                donation_data["donations"].append({
                                    "donor": donor,
                                    "amount": amount,
                                    "date": date
                                })
        
        # If we didn't find donors in tables, try to extract from text
        if not donation_data["donors"]:
            # Look for patterns like "Name: $Amount" or "Name - $Amount"
            donor_patterns = re.findall(r'([A-Za-z\s]+)[\s:]+[\$£€]?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', text)
            for donor, amount in donor_patterns:
                donor = donor.strip()
                if donor and donor not in donation_data["donors"] and not any(c.isdigit() for c in donor):
                    donation_data["donors"].append(donor)
                    donation_data["donations"].append({
                        "donor": donor,
                        "amount": amount,
                        "date": ""
                    })
        
        return donation_data

    def save_results(self, output_path: str, result: Dict[str, Any]):
        """Save processing results to JSON file"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        print(f"Results saved to {output_path}")

def main():
    """Main function to run the PDF processor"""
    parser = argparse.ArgumentParser(description="Process PDF files for text and data extraction")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("--output", "-o", help="Output JSON file path")
    parser.add_argument("--tesseract", help="Path to tesseract executable")
    parser.add_argument("--no-ocr", action="store_true", help="Disable OCR for image-based PDFs")
    
    args = parser.parse_args()
    
    processor = PDFProcessor(tesseract_path=args.tesseract)
    
    try:
        result = processor.process_pdf(args.pdf_path, ocr_enabled=not args.no_ocr)
        
        if args.output:
            processor.save_results(args.output, result)
        else:
            # Print summary to console
            print("\nExtraction Summary:")
            print(f"Filename: {result['filename']}")
            print(f"Extraction method: {result['extraction_method']}")
            print(f"Characters extracted: {len(result['extracted_text'])}")
            print(f"Tables found: {len(result['tables'])}")
            
            if result["is_donation_report"]:
                print("\nDonation Report Detected:")
                print(f"Title: {result['donation_data']['title']}")
                print(f"Total amount: {result['donation_data']['total_amount']}")
                print(f"Donors found: {len(result['donation_data']['donors'])}")
            
            print("\nFirst 500 characters of extracted text:")
            print(result["extracted_text"][:500] + "...")
            
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    main() 
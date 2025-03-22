#!/usr/bin/env python3
"""
Simple PDF Processor for NGO Connect
Handles PDF extraction and Gemini AI integration
"""

import os
import io
import re
import json
import sys
import base64
from typing import Dict, Any, Optional
import argparse

# PDF processing
import PyPDF2
import pdfplumber
from pdf2image import convert_from_bytes, convert_from_path
import pytesseract

# For Gemini AI
import google.generativeai as genai

class SimplePDFProcessor:
    """Simplified PDF processor with Gemini AI integration"""
    
    def __init__(self, api_key: str = None):
        """Initialize with optional API key"""
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            print("Warning: No Gemini API key provided. Set GEMINI_API_KEY environment variable.")
        else:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel("gemini-1.5-pro")
    
    def process_pdf(self, file_path: str) -> Dict[str, Any]:
        """Process PDF and extract text using multiple methods"""
        print(f"Processing PDF: {file_path}")
        
        result = {
            "filename": os.path.basename(file_path),
            "extracted_text": "",
            "method": "unknown"
        }
        
        # Try multiple extraction methods
        text = self._extract_with_pypdf(file_path)
        if text and len(text) > 200:
            result["extracted_text"] = text
            result["method"] = "pypdf"
            return result
        
        # Try pdfplumber if PyPDF2 didn't work well
        text = self._extract_with_pdfplumber(file_path)
        if text and len(text) > 200:
            result["extracted_text"] = text
            result["method"] = "pdfplumber"
            return result
        
        # Last resort: try OCR
        text = self._extract_with_ocr(file_path)
        if text:
            result["extracted_text"] = text
            result["method"] = "ocr"
            return result
        
        # If all else fails, return what we got from PyPDF2
        result["extracted_text"] = text or "Failed to extract text from PDF."
        result["method"] = "fallback"
        return result
    
    def _extract_with_pypdf(self, file_path: str) -> Optional[str]:
        """Extract text using PyPDF2"""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() or ""
                print(f"PyPDF2 extracted {len(text)} characters")
                return text
        except Exception as e:
            print(f"PyPDF2 extraction error: {e}")
            return None
    
    def _extract_with_pdfplumber(self, file_path: str) -> Optional[str]:
        """Extract text using pdfplumber"""
        try:
            with pdfplumber.open(file_path) as pdf:
                text = ""
                for page in pdf.pages:
                    text += page.extract_text() or ""
                print(f"pdfplumber extracted {len(text)} characters")
                return text
        except Exception as e:
            print(f"pdfplumber extraction error: {e}")
            return None
    
    def _extract_with_ocr(self, file_path: str) -> Optional[str]:
        """Extract text using OCR"""
        try:
            # Convert PDF to images
            images = convert_from_path(file_path)
            text = ""
            for i, image in enumerate(images):
                # Use pytesseract OCR
                page_text = pytesseract.image_to_string(image)
                text += f"\n\n--- Page {i+1} ---\n\n{page_text}"
            print(f"OCR extracted {len(text)} characters")
            return text
        except Exception as e:
            print(f"OCR extraction error: {e}")
            return None
    
    def analyze_pdf_with_gemini(self, file_path: str, question: str = None) -> str:
        """Extract PDF text and analyze with Gemini AI"""
        # Process PDF
        pdf_data = self.process_pdf(file_path)
        extracted_text = pdf_data["extracted_text"]
        
        # Check if we have an API key
        if not self.api_key:
            return "Error: Gemini API key not configured. Set GEMINI_API_KEY environment variable."
        
        # Check if we extracted text
        if not extracted_text or len(extracted_text) < 100:
            return "Error: Could not extract sufficient text from the PDF."
        
        try:
            # Default question if none provided
            if not question:
                question = "Please summarize the content of this document."
            
            # Prepare prompt for Gemini
            prompt = f"""You are an assistant that analyzes PDF documents.
I have extracted the text from a PDF document. Please analyze the following text content and answer my question.

PDF Filename: {pdf_data["filename"]}
Extraction method: {pdf_data["method"]}

EXTRACTED TEXT:
{extracted_text[:8000]}  # Limit to 8000 chars to avoid token limits

QUESTION: {question}

Please answer based ONLY on the information in the extracted text. If the answer isn't in the text, say so clearly.
"""
            
            # Call Gemini API
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            return f"Error analyzing with Gemini: {str(e)}"

    def is_donation_report(self, text: str) -> bool:
        """Check if text appears to be a donation report"""
        keywords = ["donation", "donor", "amount", "total", "cash", "online"]
        keyword_count = sum(1 for kw in keywords if kw.lower() in text.lower())
        
        # Check for table-like patterns and monetary values
        has_money = bool(re.search(r'\$\d+|\d+\.\d{2}', text))
        
        return keyword_count >= 3 and has_money

def main():
    """Command line interface"""
    parser = argparse.ArgumentParser(description="Process PDF and analyze with Gemini AI")
    parser.add_argument("pdf_path", help="Path to the PDF file")
    parser.add_argument("--question", "-q", help="Question to ask about the PDF content")
    parser.add_argument("--api-key", help="Gemini API key (or set GEMINI_API_KEY environment variable)")
    
    args = parser.parse_args()
    
    processor = SimplePDFProcessor(api_key=args.api_key)
    answer = processor.analyze_pdf_with_gemini(args.pdf_path, args.question)
    
    print("\n--- AI Analysis ---\n")
    print(answer)
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 
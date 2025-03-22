#!/usr/bin/env python3
"""
Command-line interface for PDF processing
Direct interface to the PDF processor without going through the API
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, Optional

# Import our processor
from pdf_processor import PDFProcessor

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Process PDFs for NGO Connect")
    
    # Subcommands
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Process command
    process_parser = subparsers.add_parser("process", help="Process a PDF file")
    process_parser.add_argument("pdf_path", help="Path to the PDF file to process")
    process_parser.add_argument("--output", "-o", help="Output JSON file path (default: <pdf_name>.json)")
    process_parser.add_argument("--no-ocr", action="store_true", help="Disable OCR for image-based PDFs")
    process_parser.add_argument("--tesseract", help="Path to tesseract executable")
    
    # Query command - for future AI querying
    query_parser = subparsers.add_parser("query", help="Query a processed PDF file with AI")
    query_parser.add_argument("json_path", help="Path to the processed JSON file")
    query_parser.add_argument("question", help="Question to ask about the PDF content")
    
    return parser.parse_args()

def process_pdf(args) -> Dict[str, Any]:
    """Process a PDF file and return the results"""
    processor = PDFProcessor(tesseract_path=args.tesseract)
    
    print(f"Processing PDF: {args.pdf_path}")
    
    try:
        result = processor.process_pdf(args.pdf_path, ocr_enabled=not args.no_ocr)
        
        # Determine output path
        output_path = args.output
        if not output_path:
            pdf_basename = os.path.basename(args.pdf_path)
            name_without_ext = os.path.splitext(pdf_basename)[0]
            output_path = f"{name_without_ext}.json"
        
        # Save results
        processor.save_results(output_path, result)
        
        # Return results for potential further processing
        return result
        
    except Exception as e:
        print(f"Error processing PDF: {e}", file=sys.stderr)
        sys.exit(1)

def query_pdf(args) -> None:
    """Query a processed PDF with AI"""
    try:
        # Check if Google API key is set
        api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("Error: GOOGLE_API_KEY or GEMINI_API_KEY environment variable must be set", file=sys.stderr)
            sys.exit(1)
            
        # Import Google AI libraries only when needed
        try:
            import google.generativeai as genai
            from google.generativeai.types import GenerationConfig
        except ImportError:
            print("Error: google-generativeai package not installed. Install with: pip install google-generativeai", file=sys.stderr)
            sys.exit(1)
        
        # Load processed PDF data
        with open(args.json_path, 'r', encoding='utf-8') as f:
            pdf_data = json.load(f)
        
        # Configure the AI
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-pro")
        
        # Build context
        context = f"""You are an assistant specializing in analyzing PDF documents.
I have uploaded a PDF document and extracted its content. Please answer my question based ONLY on the information contained in this PDF.
If the answer is not in the document, please say so clearly.

Here is some information about the document:
- Filename: {pdf_data.get('filename', 'Unknown')}
- Extraction method: {pdf_data.get('extraction_method', 'Unknown')}

"""
        
        # Add donation report info if applicable
        if pdf_data.get('is_donation_report', False):
            donation_data = pdf_data.get('donation_data', {})
            context += f"""This is a donation report with the following details:
- Title: {donation_data.get('title', 'Donation Report')}
- Total Amount: {donation_data.get('total_amount', 'Not specified')}
- Number of donors: {len(donation_data.get('donors', []))}

"""
        
        # Add extracted text
        context += f"The extracted text from the document is:\n\n{pdf_data.get('extracted_text', '')}\n\n"
        
        # Add the question
        context += f"My question is: {args.question}"
        
        # Generate response
        generation_config = GenerationConfig(
            temperature=0.1,  # Low temperature for factual responses
            max_output_tokens=2048
        )
        
        response = model.generate_content(
            context,
            generation_config=generation_config
        )
        
        # Print the response
        print("\n--- AI Response ---\n")
        print(response.text)
        
    except Exception as e:
        print(f"Error querying PDF: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    """Main function to run the CLI"""
    args = parse_args()
    
    if args.command == "process":
        process_pdf(args)
    elif args.command == "query":
        query_pdf(args)
    else:
        print("Please specify a command: process or query", file=sys.stderr)
        sys.exit(1)
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 
#!/usr/bin/env python3
"""
FastAPI backend for PDF processing
Provides endpoints for PDF upload, text extraction, and querying with AI
"""

import os
import json
import time
import uuid
import shutil
from typing import Dict, List, Any, Optional

import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, BackgroundTasks, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# Import our PDF processor
from pdf_processor import PDFProcessor

# For AI integration
import google.generativeai as genai
from google.generativeai.types import GenerationConfig

# Create FastAPI app
app = FastAPI(
    title="NGO Connect PDF Processor API",
    description="API for processing PDFs and generating AI responses about their content",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload and results directories
UPLOAD_DIR = "uploads"
RESULTS_DIR = "results"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

# Initialize PDF processor
pdf_processor = PDFProcessor()

# Configure Gemini AI if API key is available
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-pro")
else:
    model = None
    print("Warning: GEMINI_API_KEY not set. AI features will be disabled.")

# Data models
class PDFProcessingResult(BaseModel):
    id: str
    status: str
    filename: str
    filesize: int
    timestamp: float
    extraction_method: Optional[str] = None
    is_donation_report: Optional[bool] = False
    text_length: Optional[int] = None
    table_count: Optional[int] = None
    
class MessageRequest(BaseModel):
    pdf_id: str
    message: str

class MessageResponse(BaseModel):
    response: str
    
# Helper functions
def get_chat_context(pdf_result: Dict[str, Any], message: str) -> str:
    """Build a context string for the AI to work with"""
    
    # Start with a basic prompt template
    context = f"""You are an assistant that specializes in analyzing PDF documents.
I have uploaded a PDF document and extracted its content. Please answer my question based ONLY on the information contained in this PDF.
If the answer is not in the document, please say so clearly.

Here is some information about the document:
- Filename: {pdf_result.get('filename')}
- Extraction method: {pdf_result.get('extraction_method')}
"""
    
    # Add donation report info if applicable
    if pdf_result.get('is_donation_report') and pdf_result.get('donation_data'):
        donation_data = pdf_result.get('donation_data', {})
        context += f"""
This is a donation report with the following details:
- Title: {donation_data.get('title', 'Donation Report')}
- Total Amount: {donation_data.get('total_amount', 'Not specified')}
- Number of donors: {len(donation_data.get('donors', []))}
"""

        # Add donor information if available
        if donation_data.get('donations'):
            context += "\nDonor information:\n"
            for i, donation in enumerate(donation_data.get('donations', [])[:5]):  # Show up to 5 donors
                context += f"- {donation.get('donor', 'Unknown')}: {donation.get('amount', 'Unknown')} ({donation.get('date', 'Unknown date')})\n"
            
            if len(donation_data.get('donations', [])) > 5:
                context += f"...and {len(donation_data.get('donations', [])) - 5} more donors\n"
    
    # Add extracted text (truncated if too long)
    extracted_text = pdf_result.get('extracted_text', '')
    if len(extracted_text) > 8000:
        truncated_text = extracted_text[:8000] + "...[text truncated due to length]"
        context += f"\nExtracted text from the document:\n{truncated_text}\n"
    else:
        context += f"\nExtracted text from the document:\n{extracted_text}\n"
    
    # Add table information if available
    if pdf_result.get('tables'):
        context += f"\nThe document contains {len(pdf_result.get('tables', []))} tables.\n"
        
        # Add details of up to 2 tables for context
        for i, table in enumerate(pdf_result.get('tables', [])[:2]):
            context += f"\nTable {i+1} (Page {table.get('page')}):\n"
            context += "Headers: " + " | ".join(table.get('headers', [])) + "\n"
            
            # Show a few rows as examples
            for j, row in enumerate(table.get('rows', [])[:3]):
                row_str = " | ".join([str(val) for val in row.values()])
                context += f"Row {j+1}: {row_str}\n"
                
            if len(table.get('rows', [])) > 3:
                context += f"...and {len(table.get('rows', [])) - 3} more rows\n"
    
    # Add the user's question
    context += f"\nMy question is: {message}\n"
    
    return context

@app.get("/")
async def root():
    """Root endpoint - check if API is running"""
    return {"status": "ok", "message": "NGO Connect PDF Processor API is running"}

@app.post("/upload", response_model=PDFProcessingResult)
async def upload_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    ocr_enabled: bool = Form(True)
):
    """Upload and process a PDF file"""
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Uploaded file must be a PDF")
    
    # Create a unique ID and save the file
    process_id = str(uuid.uuid4())
    timestamp = time.time()
    file_path = os.path.join(UPLOAD_DIR, f"{process_id}.pdf")
    
    try:
        # Save uploaded file
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        # Create initial response
        initial_response = PDFProcessingResult(
            id=process_id,
            status="processing",
            filename=file.filename,
            filesize=os.path.getsize(file_path),
            timestamp=timestamp
        )
        
        # Process in background to allow response to return quickly
        background_tasks.add_task(
            process_pdf_background, 
            process_id, 
            file_path, 
            file.filename, 
            ocr_enabled
        )
        
        return initial_response
        
    except Exception as e:
        # Clean up if there was an error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

async def process_pdf_background(process_id: str, file_path: str, original_filename: str, ocr_enabled: bool):
    """Process the PDF in background and save results"""
    result_path = os.path.join(RESULTS_DIR, f"{process_id}.json")
    
    try:
        # Process the PDF
        result = pdf_processor.process_pdf(file_path, ocr_enabled=ocr_enabled)
        
        # Add process metadata
        result["id"] = process_id
        result["original_filename"] = original_filename
        result["status"] = "completed"
        result["processing_time"] = time.time() - result["timestamp"] if "timestamp" in result else 0
        
        # Save results
        with open(result_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
            
    except Exception as e:
        # Save error information
        error_result = {
            "id": process_id,
            "original_filename": original_filename,
            "status": "error",
            "error": str(e)
        }
        with open(result_path, 'w', encoding='utf-8') as f:
            json.dump(error_result, f, indent=2, ensure_ascii=False)

@app.get("/status/{process_id}", response_model=PDFProcessingResult)
async def get_status(process_id: str):
    """Check the status of a PDF processing job"""
    result_path = os.path.join(RESULTS_DIR, f"{process_id}.json")
    
    if not os.path.exists(result_path):
        # Check if the file exists but processing hasn't completed
        if os.path.exists(os.path.join(UPLOAD_DIR, f"{process_id}.pdf")):
            return PDFProcessingResult(
                id=process_id,
                status="processing",
                filename="",
                filesize=0,
                timestamp=0
            )
        else:
            raise HTTPException(status_code=404, detail=f"Process ID {process_id} not found")
    
    try:
        with open(result_path, 'r', encoding='utf-8') as f:
            result = json.load(f)
            
        # Create a simplified response
        response = PDFProcessingResult(
            id=result.get("id", process_id),
            status=result.get("status", "unknown"),
            filename=result.get("original_filename", result.get("filename", "")),
            filesize=result.get("filesize", 0),
            timestamp=result.get("timestamp", 0),
            extraction_method=result.get("extraction_method", ""),
            is_donation_report=result.get("is_donation_report", False),
            text_length=len(result.get("extracted_text", "")),
            table_count=len(result.get("tables", []))
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving process status: {str(e)}")

@app.get("/result/{process_id}")
async def get_result(process_id: str, include_text: bool = Query(True)):
    """Get the full result of a PDF processing job"""
    result_path = os.path.join(RESULTS_DIR, f"{process_id}.json")
    
    if not os.path.exists(result_path):
        raise HTTPException(status_code=404, detail=f"Result for process ID {process_id} not found")
    
    try:
        with open(result_path, 'r', encoding='utf-8') as f:
            result = json.load(f)
            
        if not include_text:
            # Remove the large text field to reduce response size
            if "extracted_text" in result:
                result["extracted_text"] = f"[Text removed - {len(result['extracted_text'])} characters]"
                
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving result: {str(e)}")

@app.post("/chat", response_model=MessageResponse)
async def chat_with_pdf(request: MessageRequest):
    """Chat with AI about the contents of a processed PDF"""
    # Check if AI is enabled
    if not model or not GEMINI_API_KEY:
        raise HTTPException(status_code=501, detail="AI functionality not available - API key not configured")
    
    result_path = os.path.join(RESULTS_DIR, f"{request.pdf_id}.json")
    
    if not os.path.exists(result_path):
        raise HTTPException(status_code=404, detail=f"PDF with ID {request.pdf_id} not found")
    
    try:
        # Load PDF processing result
        with open(result_path, 'r', encoding='utf-8') as f:
            pdf_result = json.load(f)
            
        # Build context for the AI
        context = get_chat_context(pdf_result, request.message)
        
        # Call the AI model
        generation_config = GenerationConfig(
            temperature=0.1,  # Low temperature for factual responses
            max_output_tokens=2048
        )
        
        response = model.generate_content(
            context,
            generation_config=generation_config
        )
        
        return MessageResponse(response=response.text)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating AI response: {str(e)}")

@app.delete("/process/{process_id}")
async def delete_process(process_id: str):
    """Delete a process and its associated files"""
    result_path = os.path.join(RESULTS_DIR, f"{process_id}.json")
    upload_path = os.path.join(UPLOAD_DIR, f"{process_id}.pdf")
    
    deleted = False
    
    # Delete result file if exists
    if os.path.exists(result_path):
        os.remove(result_path)
        deleted = True
        
    # Delete upload file if exists
    if os.path.exists(upload_path):
        os.remove(upload_path)
        deleted = True
        
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Process ID {process_id} not found")
        
    return {"status": "success", "message": f"Process {process_id} deleted"}

def start():
    """Start the FastAPI server using uvicorn"""
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    start() 
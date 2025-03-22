#!/usr/bin/env python3
"""
Simple FastAPI server for PDF processing
Provides a minimal API for PDF upload, extraction, and Gemini AI integration
"""

import os
import shutil
import uvicorn
from typing import Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Import our simple PDF processor
from simple_pdf_processor import SimplePDFProcessor

# Create FastAPI app
app = FastAPI(
    title="Simple PDF Processor API",
    description="API for processing PDFs with Gemini AI",
    version="1.0.0"
)

# Add CORS middleware to allow requests from NGO Connect frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize PDF processor without API key yet
pdf_processor = None  # Will be initialized per-request with API key

# Response model for chat
class ChatResponse(BaseModel):
    answer: str

@app.get("/")
async def root():
    """Root endpoint - check if API is running"""
    return {"status": "ok", "message": "PDF Processor API is running"}

@app.post("/process", response_model=ChatResponse)
async def process_pdf(
    file: UploadFile = File(...),
    question: Optional[str] = Form(None),
    x_gemini_api_key: Optional[str] = Header(None)
):
    """
    Process PDF file and get Gemini AI response
    
    - **file**: PDF file to process
    - **question**: Question to ask about the PDF (optional)
    - **x_gemini_api_key**: Gemini API key from frontend (optional header)
    """
    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")
    
    # Save the uploaded file
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Process the PDF and get AI response
    try:
        # If no question provided, use a default one
        if not question:
            question = "Summarize this document and tell me what kind of information it contains."
        
        # Initialize processor with API key from header or environment
        processor = SimplePDFProcessor(api_key=x_gemini_api_key)
            
        # Process PDF and get Gemini response
        answer = processor.analyze_pdf_with_gemini(file_path, question)
        
        # Return the response
        return ChatResponse(answer=answer)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    
    finally:
        # Clean up - remove the uploaded file
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/chat", response_model=ChatResponse)
async def chat_with_pdf(
    file: UploadFile = File(...),
    question: str = Form(...),
    x_gemini_api_key: Optional[str] = Header(None)
):
    """
    Process PDF file and ask a specific question
    
    - **file**: PDF file to process
    - **question**: Question to ask about the PDF (required)
    - **x_gemini_api_key**: Gemini API key from frontend (optional header)
    """
    # This endpoint is essentially identical to /process but requires a question
    return await process_pdf(file=file, question=question, x_gemini_api_key=x_gemini_api_key)

def start():
    """Start the FastAPI server"""
    uvicorn.run("simple_api:app", host="0.0.0.0", port=8000, reload=True)

if __name__ == "__main__":
    start() 
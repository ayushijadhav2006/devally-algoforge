// NGO Connect Integration for chat-report/page.jsx
// This file shows how to integrate the Python PDF processor with your existing chat interface

/**
 * Function to upload PDF to Python backend
 * This will use the GEMINI_API_KEY from your Next.js .env.local file
 */
async function processPDFWithPythonBackend(pdfFile, question = null) {
  try {
    const formData = new FormData();
    formData.append('file', pdfFile);
    
    if (question) {
      formData.append('question', question);
    }
    
    // Get API key from Next.js environment
    // This will use the key from your .env.local file
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    const headers = {};
    if (apiKey) {
      headers['X-Gemini-API-Key'] = apiKey;
    }
    
    const response = await fetch('http://localhost:8000/process', {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Error processing PDF');
    }
    
    const data = await response.json();
    return data.answer;
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
}

// ========================================================================
// INTEGRATION GUIDE: Replace parts of your page.jsx with this code
// ========================================================================

/*
1. First, import this function at the top of your page.jsx file:

import { processPDFWithPythonBackend } from "../../path/to/this/file";

2. Replace your handleFileUpload function:
*/

const handleFileUpload = async (e) => {
  const selectedFile = e.target.files[0];
  if (!selectedFile) return;
  
  if (selectedFile.type !== "application/pdf") {
    alert("Please upload a PDF file");
    return;
  }
  
  setIsUploading(true);
  
  try {
    // Process the PDF with the Python backend
    const initialAnalysis = await processPDFWithPythonBackend(
      selectedFile, 
      "Analyze this document. If it appears to be a donation report, identify the total donation amount, number of donors, and any other key information."
    );
    
    // Update UI with the file and initial message
    setFile(selectedFile);
    setMessages([
      {
        role: "system",
        content: `PDF "${selectedFile.name}" has been processed successfully.`
      },
      {
        role: "assistant",
        content: initialAnalysis
      }
    ]);
    
    setShowExamples(false);
  } catch (error) {
    setFileError(`Error processing PDF: ${error.message}`);
  } finally {
    setIsUploading(false);
  }
};

/*
3. Replace your handleSendMessage function:
*/

const handleSendMessage = async () => {
  if (!inputMessage.trim() || !file) return;
  
  const userMessage = { role: "user", content: inputMessage };
  const updatedMessages = [...messages, userMessage];
  setMessages(updatedMessages);
  setInputMessage("");
  setIsProcessing(true);
  
  try {
    // Process the question with the Python backend
    const answer = await processPDFWithPythonBackend(file, inputMessage);
    
    // Update messages with AI response
    setMessages([
      ...updatedMessages,
      { role: "assistant", content: answer }
    ]);
  } catch (error) {
    setMessages([
      ...updatedMessages,
      { role: "assistant", content: `Error: ${error.message}` }
    ]);
  } finally {
    setIsProcessing(false);
  }
};

/*
4. That's it! Your NGO Connect app will now use the Python backend
   for PDF processing instead of the JavaScript implementation.
   The Python backend will automatically use your Gemini API key from .env.local.
*/ 
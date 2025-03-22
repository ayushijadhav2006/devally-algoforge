// Example for integrating the Python PDF processor with React in NGO Connect

/**
 * Uploads a PDF file and gets AI analysis
 * @param {File} pdfFile - The PDF file to upload
 * @param {string} question - Optional question to ask about the PDF
 * @returns {Promise<string>} - The AI response
 */
async function processPDFWithAI(pdfFile, question = null) {
  try {
    // Create form data for file upload
    const formData = new FormData();
    formData.append('file', pdfFile);
    
    // Add question if provided
    if (question) {
      formData.append('question', question);
    }
    
    // Get Gemini API key from Next.js environment
    // Next.js makes environment variables available through process.env
    // Only variables prefixed with NEXT_PUBLIC_ are available on the client side
    const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    // Prepare headers with API key
    const headers = {};
    if (geminiApiKey) {
      headers['X-Gemini-API-Key'] = geminiApiKey;
    }
    
    // Upload to the Python API
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

/**
 * React component example for file upload and chat
 * This would replace your current JavaScript PDF processing
 */
function PDFChatComponent() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert('Please select a PDF file first');
      return;
    }
    
    setLoading(true);
    
    try {
      const answer = await processPDFWithAI(file, question);
      setResponse(answer);
    } catch (error) {
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h2>Chat with PDF</h2>
      
      <div>
        <input 
          type="file" 
          accept=".pdf" 
          onChange={handleFileChange} 
        />
      </div>
      
      <div>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about the PDF..."
          rows={3}
        />
      </div>
      
      <button 
        onClick={handleSubmit} 
        disabled={loading || !file}
      >
        {loading ? 'Processing...' : 'Submit'}
      </button>
      
      {response && (
        <div>
          <h3>Response:</h3>
          <div>{response}</div>
        </div>
      )}
    </div>
  );
}

// Example for replacement in your chat-report/page.jsx
export default function ChatReport() {
  // Your existing state and logic...
  
  // Replace your current PDF extraction with:
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    if (selectedFile.type !== "application/pdf") {
      alert("Please upload a PDF file");
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Initial analysis to show while user can ask questions
      const initialAnalysis = await processPDFWithAI(
        selectedFile, 
        "Analyze this document and tell me what kind of information it contains."
      );
      
      // Set the file and initial message
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
  
  // Replace your current message handler with:
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !file) return;
    
    const userMessage = { role: "user", content: inputMessage };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage("");
    setIsProcessing(true);
    
    try {
      // Send the question and file to Python backend
      const answer = await processPDFWithAI(file, inputMessage);
      
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
  
  // Rest of your component...
} 
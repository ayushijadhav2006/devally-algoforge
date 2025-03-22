# NGO Connect PDF Processor

A Python-based system for processing PDF files with advanced text extraction, table detection, and AI-powered chat capabilities.

## Features

- **Multiple PDF extraction methods**: Uses various libraries to ensure best results
- **OCR for image-based PDFs**: Automatically detects and uses OCR for scanned documents
- **Table extraction**: Identifies and extracts tables from PDFs into structured data
- **Donation report detection**: Special handling for donation reports with metadata extraction
- **AI integration**: Chat with your PDFs using Gemini AI to ask questions about content
- **API & CLI options**: Use as a service or directly from command line

## Installation

### Requirements

- Python 3.8+
- Tesseract OCR (for image-based PDFs)
- Google Gemini API key (for AI features)

### Setup

1. Clone the repository or download the files
2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

3. Install Tesseract OCR:
   - Windows: Download from [https://github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)
   - Linux: `sudo apt-get install tesseract-ocr`
   - macOS: `brew install tesseract`

4. Set up environment variables:
   - For AI features: `export GEMINI_API_KEY=your_api_key_here`

## Options

### 1. Simple Solution (Recommended for NGO Connect)

We provide a simplified solution that focuses on exactly what you need:

1. Upload PDF → 2. Extract text → 3. Send to Gemini AI → 4. Get response

This approach is simple to integrate and requires minimal code changes:

```bash
# Run the simple API
python simple_api.py
```

To integrate with your React frontend, use the example code in `frontend_example.js`.

### 2. Full-Featured Solution (Advanced)

For more advanced needs, we provide a comprehensive solution:

```bash
# Command Line Interface
python cli.py process path/to/your/file.pdf

# Full API Server
python api.py
```

## Usage

### Simple API

Start the simple API server:

```bash
python simple_api.py
# or double-click run_simple_api.bat on Windows
```

Upload and process a PDF file:

```javascript
// JavaScript example
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('question', 'What is this document about?');

const response = await fetch('http://localhost:8000/process', {
  method: 'POST',
  body: formData,
});

const data = await response.json();
console.log(data.answer);
```

### Simple CLI

Process a PDF directly from command line:

```bash
python simple_pdf_processor.py path/to/your/file.pdf --question "What is the total donation amount?"
```

### Advanced Usage

For more advanced usage, see the full documentation for the [CLI](#command-line-interface) and [REST API](#rest-api).

### Command Line Interface

Process a PDF file:

```bash
python cli.py process path/to/your/file.pdf
```

Process with specific options:

```bash
python cli.py process path/to/your/file.pdf --output results.json --no-ocr
```

Query processed results with AI:

```bash
python cli.py query results.json "What is the total donation amount?"
```

### REST API

The API will be available at http://localhost:8000 with the following endpoints:

- `POST /upload` - Upload and process a PDF file
- `GET /status/{process_id}` - Check processing status
- `GET /result/{process_id}` - Get full processing results
- `POST /chat` - Chat with PDF content using AI

## Integrating with NGO Connect

This Python processor can replace the JavaScript-based browser processing in the NGO Connect application.

### Configuring the Gemini API Key

To use your existing Gemini API key from Next.js environment variables:

1. Make sure your `.env.local` file in your Next.js project has the Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   
   # For client-side access, also add (if needed):
   NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
   ```

2. The frontend code will automatically pass this API key to the Python backend via a header.

3. No need to set the API key in two places - your Python backend will use the key from your Next.js application.

### Quick Integration

1. Start the simple API server:
   ```bash
   python simple_api.py
   ```

2. Replace the PDF processing logic in your frontend with API calls:
   - See `frontend_example.js` for ready-to-use code

### Full Integration

1. Run the full API server
2. Update the frontend to call the API endpoints instead of doing browser-based processing
3. The API will handle all the PDF processing and AI interaction

## Folder Structure

- `pdf_processor.py` - Core PDF processing engine
- `api.py` - FastAPI server for REST API
- `cli.py` - Command line interface
- `uploads/` - Temporary storage for uploaded PDFs
- `results/` - JSON results from PDF processing

## License

MIT 
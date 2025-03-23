"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Send, FileText, Paperclip, X, RotateCw } from "lucide-react";

// API configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://geolocation-smile-share.onrender.com";

export default function ChatbotPage() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [showExamples, setShowExamples] = useState(true);
  const [fileError, setFileError] = useState("");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * Process PDF with Python backend
   */
  async function processPDFWithPythonBackend(pdfFile, question) {
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("question", question);

      const response = await fetch(`${API_BASE_URL}/chat-with-pdf/`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - let the browser set it with the boundary
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error processing PDF");
      }

      const data = await response.json();
      return data.answer;
    } catch (error) {
      console.error("Error processing PDF:", error);
      throw error;
    }
  }

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setFileError("Please upload a PDF file");
      return;
    }

    setIsUploading(true);
    setFileError("");

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
          content: `PDF "${selectedFile.name}" has been processed successfully.`,
        },
        {
          role: "assistant",
          content: initialAnalysis,
        },
      ]);

      setShowExamples(false);
    } catch (error) {
      setFileError(`Error processing PDF: ${error.message}`);
      console.error("PDF processing error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !file || isProcessing) return;

    const userMessage = { role: "user", content: inputMessage };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsProcessing(true);

    try {
      // Process the question with the Python backend
      const answer = await processPDFWithPythonBackend(file, inputMessage);

      // Update messages with AI response
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error.message}` },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowExamples(true);
  };

  const removeFile = () => {
    setFile(null);
    setMessages([]);
    setShowExamples(true);
    setFileError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExampleClick = (question) => {
    setInputMessage(question);
  };

  // Example questions to get started
  const examples = [
    "What is the total donation amount in this report?",
    "Who made the largest donation?",
    "Summarize the key information in this document",
    "When was the last donation made?",
    "What types of donation methods were used?",
    "Compare donations from last month to this month",
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex flex-col p-4 md:p-8 max-w-5xl mx-auto w-full">
        <div className="text-2xl font-bold mb-4">Chat with PDF Reports</div>
        <div className="text-muted-foreground mb-8">
          Upload your PDF reports and ask questions to get insights
        </div>

        <Card className="flex-1 flex flex-col">
          <CardContent className="p-4 flex-1 flex flex-col">
            {!file ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Upload className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-medium mb-2">
                  Upload a PDF Report
                </h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Upload your donation reports or any PDF file to analyze it
                  using AI
                </p>
                <div className="flex flex-col items-center gap-4">
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="mr-2 h-4 w-4" />
                    Browse PDF files
                  </Button>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  {fileError && (
                    <p className="text-red-500 mt-2">{fileError}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between border-b pb-4 mb-4">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-500" />
                    <span className="font-medium truncate max-w-[230px]">
                      {file.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearChat}
                      disabled={isProcessing}
                    >
                      <RotateCw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeFile}
                      disabled={isProcessing}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${
                          message.role === "user" ? "flex-row-reverse" : ""
                        }`}
                      >
                        <Avatar
                          className={`w-8 h-8 mt-0.5 ${
                            message.role === "assistant"
                              ? "bg-primary"
                              : "bg-muted"
                          }`}
                        >
                          <AvatarFallback>
                            {message.role === "user" ? "U" : "AI"}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`rounded-lg px-3 py-2 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : message.role === "system"
                                ? "bg-muted text-muted-foreground text-sm"
                                : "bg-muted"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isProcessing && (
                    <div className="flex justify-start">
                      <div className="flex gap-3 max-w-[80%]">
                        <Avatar className="w-8 h-8 mt-0.5 bg-primary">
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <div className="rounded-lg px-3 py-2 bg-muted">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 rounded-full bg-current animate-bounce"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {showExamples && messages.length === 0 && (
                    <div className="p-4 border rounded-lg">
                      <h3 className="text-sm font-medium mb-2">
                        Example questions to ask
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {examples.map((example, index) => (
                          <button
                            key={index}
                            className="text-left px-3 py-2 text-sm border rounded-md hover:bg-muted"
                            onClick={() => handleExampleClick(example)}
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about your PDF..."
                    className="min-h-[50px] resize-none"
                    disabled={isProcessing || isUploading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={
                      !inputMessage.trim() ||
                      isProcessing ||
                      isUploading ||
                      !file
                    }
                    className="h-[50px] px-3"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {isUploading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-lg font-medium">Processing PDF...</p>
            <p className="text-muted-foreground">This might take a moment</p>
          </div>
        </div>
      )}
    </div>
  );
}

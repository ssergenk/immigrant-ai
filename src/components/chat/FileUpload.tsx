'use client'

import { useState } from 'react'
import { Upload, File, X, AlertCircle, Send } from 'lucide-react'

interface FileUploadProps {
  onFileUpload: (file: File) => void
  isUploading: boolean
  disabled?: boolean
}

export default function FileUpload({ onFileUpload, isUploading, disabled }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    // Check file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload only PDF or image files (JPG, PNG)')
      return
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    
    const files = e.target.files
    if (files && files[0]) {
      handleFileSelect(files[0])
    }
  }

  const handleUpload = () => {
    if (selectedFile && !disabled) {
      onFileUpload(selectedFile)
      // Don't clear the file here - let the parent component handle it
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
  }

  if (disabled) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-yellow-400 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">Document Analysis - Premium Feature</span>
        </div>
        <p className="text-gray-400 text-sm mb-3">
          Upload and analyze your immigration documents like I-485, N-400, I-130, and RFE responses. 
          Get detailed feedback and guidance from your AI immigration lawyer.
        </p>
        <button
          onClick={() => {/* This will trigger upgrade modal */}}
          className="text-blue-400 hover:text-blue-300 transition-colors text-sm underline"
        >
          Upgrade to Premium to unlock document analysis
        </button>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 text-white mb-3">
        <Upload className="w-5 h-5" />
        <span className="font-semibold">Upload Immigration Document</span>
      </div>

      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive && !disabled
              ? 'border-blue-500 bg-blue-500 bg-opacity-10'
              : 'border-gray-600 hover:border-gray-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-300 mb-2">
            Drag and drop your document here, or click to browse
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Supports PDF, JPG, PNG (max 10MB)
          </p>
          <input
            type="file"
            onChange={handleInputChange}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            id="file-upload"
            disabled={disabled}
          />
          <label
            htmlFor="file-upload"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors inline-block"
          >
            Choose File
          </label>
        </div>
      ) : (
        <div className="border border-gray-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <File className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-white font-medium">{selectedFile.name}</div>
                <div className="text-gray-400 text-sm">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready to analyze
                </div>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={isUploading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-semibold"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyzing Document...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send to Analyze
                </>
              )}
            </button>
            <button
              onClick={removeFile}
              disabled={isUploading}
              className="text-gray-400 hover:text-white transition-colors px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        <p>💡 <strong>Tip:</strong> Upload forms like I-485 (Green Card Application), N-400 (Citizenship), 
        I-130 (Family Petition), or RFE responses for detailed analysis and guidance.</p>
      </div>
    </div>
  )
}
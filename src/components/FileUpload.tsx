'use client'

import { useState, useRef, useCallback } from 'react'

interface FileUploadProps {
  onFileUpload: (file: File) => void
  onFileRemove?: () => void
  acceptedTypes?: string[]
  maxSize?: number // in MB
  currentFile?: string // URL of current file
  placeholder?: string
  className?: string
}

export default function FileUpload({
  onFileUpload,
  onFileRemove,
  acceptedTypes = ['image/*', 'video/*', 'audio/*', '.pdf', '.doc', '.docx'],
  maxSize = 10, // 10MB default
  currentFile,
  placeholder = 'Click to upload or drag and drop',
  className = ''
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size must be less than ${maxSize}MB`
    }

    // Check file type
    const fileType = file.type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    const isValidType = acceptedTypes.some(type => {
      if (type.startsWith('.')) {
        return type === fileExtension
      }
      if (type.includes('*')) {
        const baseType = type.split('/')[0]
        return fileType.startsWith(baseType)
      }
      return fileType === type
    })

    if (!isValidType) {
      return `File type not supported. Accepted: ${acceptedTypes.join(', ')}`
    }

    return null
  }

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError(null)
    
    const error = validateFile(file)
    if (error) {
      setUploadError(error)
      return
    }

    setIsUploading(true)
    try {
      // In a real implementation, you would upload to a service like Supabase Storage
      // For now, we'll just pass the file to the parent component
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate upload delay
      onFileUpload(file)
    } catch (error) {
      setUploadError('Failed to upload file. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [onFileUpload, maxSize, acceptedTypes])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleRemove = useCallback(() => {
    if (onFileRemove) {
      onFileRemove()
    }
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onFileRemove])

  const getFileIcon = (fileName?: string) => {
    if (!fileName) return '📁'
    
    const extension = fileName.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return '🖼️'
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return '🎥'
      case 'mp3':
      case 'wav':
      case 'ogg':
        return '🎵'
      case 'pdf':
        return '📄'
      case 'doc':
      case 'docx':
        return '📝'
      default:
        return '📁'
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="space-y-2">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600">Uploading...</p>
          </div>
        ) : currentFile ? (
          <div className="space-y-4">
            <div className="text-4xl">{getFileIcon(currentFile)}</div>
            <div>
              <p className="font-medium text-gray-900">File uploaded</p>
              <p className="text-sm text-gray-500 truncate max-w-xs mx-auto">
                {currentFile.split('/').pop()}
              </p>
            </div>
            <div className="flex justify-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClick()
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Replace
              </button>
              {onFileRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove()
                  }}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📤</div>
            <div>
              <p className="text-gray-900 font-medium">{placeholder}</p>
              <p className="text-sm text-gray-500">
                Max size: {maxSize}MB • Supported: {acceptedTypes.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <div className="text-red-400 mr-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm text-red-800">{uploadError}</p>
          </div>
        </div>
      )}

      {/* Upload Guidelines */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Drag and drop files or click to browse</p>
        <p>• Files are uploaded securely and can be removed at any time</p>
        <p>• Supported formats: Images, Videos, Audio, Documents</p>
      </div>
    </div>
  )
}

// Hook for handling file uploads with Supabase Storage (future implementation)
export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = async (file: File, bucket: string = 'content-files'): Promise<string | null> => {
    setUploading(true)
    setError(null)

    try {
      // This would integrate with Supabase Storage in the future
      // For now, return a mock URL
      await new Promise(resolve => setTimeout(resolve, 2000))
      const mockUrl = `https://example.com/uploads/${Date.now()}-${file.name}`
      return mockUrl
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      return null
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = async (url: string): Promise<boolean> => {
    try {
      // This would integrate with Supabase Storage in the future
      await new Promise(resolve => setTimeout(resolve, 500))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      return false
    }
  }

  return {
    uploadFile,
    deleteFile,
    uploading,
    error,
    clearError: () => setError(null)
  }
} 
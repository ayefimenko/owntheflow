'use client'

import { useState, useEffect } from 'react'
import { Certificate } from '@/types/content'
import { ContentService } from '@/lib/content'

// Extended certificate type with populated user data
interface CertificateWithUser extends Certificate {
  user?: {
    display_name?: string
    avatar_url?: string
  }
}

interface CertificateDisplayProps {
  certificate: CertificateWithUser
  isPublicView?: boolean
}

export default function CertificateDisplay({ certificate, isPublicView = false }: CertificateDisplayProps) {
  const [isSharing, setIsSharing] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const shareToLinkedIn = () => {
    setIsSharing(true)
    const certificateUrl = `${window.location.origin}/cert/${certificate.verification_code}`
    const text = `I'm excited to share that I've earned a certificate in ${certificate.title}! 🎓`
    
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(certificateUrl)}&summary=${encodeURIComponent(text)}`
    
    window.open(linkedInUrl, '_blank', 'width=550,height=750')
    setIsSharing(false)
  }

  const copyVerificationLink = async () => {
    const url = `${window.location.origin}/cert/${certificate.verification_code}`
    try {
      await navigator.clipboard.writeText(url)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const downloadPDF = async () => {
    // This would generate and download a PDF version
    // For now, we'll just print the certificate
    window.print()
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Certificate Card */}
      <div className="bg-white border-2 border-gray-200 rounded-xl shadow-xl overflow-hidden">
        {/* Certificate Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">{certificate.certificate_type === 'completion' ? 'Certificate of Completion' : 'Achievement Certificate'}</h1>
            <p className="text-blue-100">Own The Flow Learning Platform</p>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="px-8 py-12 text-center">
          <div className="mb-8">
            <p className="text-gray-600 text-lg mb-4">This certifies that</p>
                         <h2 className="text-3xl font-bold text-gray-900 mb-4">
               {isPublicView ? 'Learner' : certificate.user?.display_name || 'Learner'}
             </h2>
            <p className="text-gray-600 text-lg mb-4">has successfully completed</p>
            <h3 className="text-2xl font-semibold text-blue-600 mb-6">
              {certificate.path?.title || certificate.course?.title}
            </h3>
          </div>

          {certificate.description && (
            <p className="text-gray-700 mb-8 max-w-2xl mx-auto">{certificate.description}</p>
          )}

          {/* Certificate Footer */}
          <div className="flex justify-between items-center pt-8 border-t border-gray-200">
            <div className="text-left">
              <p className="text-sm text-gray-500">Issued on</p>
              <p className="font-semibold text-gray-900">{formatDate(certificate.issued_at)}</p>
            </div>
            
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">🏄</span>
              </div>
              <p className="text-sm font-medium text-gray-900">Own The Flow</p>
            </div>

            <div className="text-right">
              <p className="text-sm text-gray-500">Verification Code</p>
              <p className="font-mono text-sm font-semibold text-gray-900">{certificate.verification_code}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isPublicView && (
          <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                type="button"
                onClick={shareToLinkedIn}
                disabled={isSharing}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                </svg>
                {isSharing ? 'Sharing...' : 'Share on LinkedIn'}
              </button>

              <button
                type="button"
                onClick={copyVerificationLink}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Verification Link
              </button>

              <button
                type="button"
                onClick={downloadPDF}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Certificate Status */}
      <div className="mt-6 text-center">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          certificate.status === 'issued' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            certificate.status === 'issued' ? 'bg-green-500' : 'bg-red-500'
          }`} />
          {certificate.status === 'issued' ? 'Valid Certificate' : 'Revoked Certificate'}
        </div>
        
        {isPublicView && (
          <p className="mt-2 text-sm text-gray-500">
            Verify this certificate at: {window.location.host}/cert/{certificate.verification_code}
          </p>
        )}
      </div>
    </div>
  )
}

// Certificate Verification Page Component
export function CertificateVerificationPage({ verificationCode }: { verificationCode: string }) {
  const [certificate, setCertificate] = useState<CertificateWithUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCertificate = async () => {
      try {
        const cert = await ContentService.getCertificateByCode(verificationCode)
        if (cert) {
          setCertificate(cert as CertificateWithUser)
        } else {
          setError('Certificate not found or invalid verification code')
        }
      } catch (err) {
        setError('Failed to verify certificate')
      } finally {
        setLoading(false)
      }
    }

    loadCertificate()
  }, [verificationCode])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying certificate...</p>
        </div>
      </div>
    )
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Certificate Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please check the verification code and try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Certificate Verification</h1>
          <p className="text-gray-600">This certificate has been verified as authentic</p>
        </div>
        
        <CertificateDisplay certificate={certificate} isPublicView={true} />
      </div>
    </div>
  )
} 
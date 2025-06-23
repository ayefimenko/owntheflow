import { CertificateVerificationPage } from '@/components/CertificateDisplay'

interface CertificatePageProps {
  params: {
    code: string
  }
}

export default function CertificatePage({ params }: CertificatePageProps) {
  return <CertificateVerificationPage verificationCode={params.code} />
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CertificatePageProps) {
  return {
    title: `Certificate Verification - ${params.code} | Own The Flow`,
    description: 'Verify this certificate from Own The Flow learning platform',
    openGraph: {
      title: 'Certificate Verification | Own The Flow',
      description: 'Verify this certificate from Own The Flow learning platform',
      type: 'website',
    },
  }
} 
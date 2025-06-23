import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import PermissionGuard from '@/components/PermissionGuard';

export default function AnalyticsPage() {
  return (
    <PermissionGuard role={['admin', 'content_manager']}>
      <div className="min-h-screen bg-gray-50">
        <AnalyticsDashboard />
      </div>
    </PermissionGuard>
  );
} 
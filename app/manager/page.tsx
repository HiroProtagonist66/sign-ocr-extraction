import dynamic from 'next/dynamic';

// Dynamically import the client component to avoid SSR issues with PDF.js
const ManagerClient = dynamic(
  () => import('./manager-client'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Release Manager...</p>
        </div>
      </div>
    )
  }
);

export default function ManagerPage() {
  return <ManagerClient />;
}
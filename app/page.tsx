import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Sign OCR Extraction System</h1>
        <p className="text-xl mb-8">Extract and visualize sign numbers from architectural PDFs</p>
        <Link 
          href="/plans/test" 
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          View Interactive Demo
        </Link>
      </div>
    </main>
  );
}
import { useState } from 'react';
import { Scanner } from './components/Scanner';

function App() {
  const [scanning, setScanning] = useState(true);
  const [result, setResult] = useState('');

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">Scanner App</h1>
      
      {result && (
        <div className="p-4 bg-white shadow rounded-lg w-full max-w-lg text-center font-mono">
          Last Scan: {result}
        </div>
      )}

      <button 
        onClick={() => setScanning(!scanning)}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg"
      >
        {scanning ? 'Stop Scanning' : 'Start Scanning'}
      </button>

      <Scanner isScanning={scanning} onScan={(text) => setResult(text)} />
    </div>
  );
}

export default App;

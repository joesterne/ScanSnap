import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, ImagePlus } from 'lucide-react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  isScanning: boolean;
}

export function Scanner({ onScan, isScanning }: ScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCode = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let isSubscribed = true;

    async function setupScanner() {
      if (!isScanning) {
        if (html5QrCode.current && html5QrCode.current.isScanning) {
          try {
            await html5QrCode.current.stop();
          } catch (e) {
            console.error('Failed to stop scanner.', e);
          }
        }
        return;
      }

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          if (isSubscribed) setHasPermission(true);
          
          if (!html5QrCode.current) {
            html5QrCode.current = new Html5Qrcode('qr-reader', {
              verbose: false,
              formatsToSupport: [
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
              ],
            });
          }

          if (!html5QrCode.current.isScanning) {
            await html5QrCode.current.start(
              { facingMode: 'environment' },
              {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                aspectRatio: 1.0,
              },
              (decodedText) => {
                onScan(decodedText);
              },
              (errorMessage) => {
                // Ignore frequent scan failures
              }
            );
          }
        } else {
          if (isSubscribed) {
            setHasPermission(false);
            setError('No cameras found.');
          }
        }
      } catch (err: any) {
        if (isSubscribed) {
          setHasPermission(false);
          setError(err?.message || 'Error accessing camera.');
        }
      }
    }

    setupScanner();

    return () => {
      isSubscribed = false;
      if (html5QrCode.current && html5QrCode.current.isScanning) {
        html5QrCode.current.stop().catch(console.error);
      }
    };
  }, [isScanning, onScan, nonce]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        setError('');
        if (html5QrCode.current && html5QrCode.current.isScanning) {
          await html5QrCode.current.stop();
        }
        
        if (!html5QrCode.current) {
          html5QrCode.current = new Html5Qrcode('qr-reader', {
            verbose: false,
            formatsToSupport: [
               Html5QrcodeSupportedFormats.UPC_A,
               Html5QrcodeSupportedFormats.UPC_E,
               Html5QrcodeSupportedFormats.EAN_13,
               Html5QrcodeSupportedFormats.EAN_8,
               Html5QrcodeSupportedFormats.CODE_128,
               Html5QrcodeSupportedFormats.CODE_39,
            ]
          });
        }
        
        const decodedText = await html5QrCode.current.scanFile(file, true);
        onScan(decodedText);
      } catch (err: any) {
        console.error('File scan error:', err);
        setError('No barcode found in image.');
        setNonce(n => n + 1); // restart camera
      }
      e.target.value = '';
    }
  };

  if (!isScanning) return null;

  return (
    <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-2xl bg-black shadow-xl aspect-[3/4] sm:aspect-square">
      {hasPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 text-white bg-gray-900">
          <Camera className="w-12 h-12 mb-4 text-gray-500" />
          <p className="text-sm font-medium mb-2">Camera Access Denied</p>
          <p className="text-xs text-gray-400">
            {error || 'Please allow camera access in your browser to scan barcodes.'}
          </p>
        </div>
      )}
      
      {hasPermission === null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 text-white bg-gray-900">
          <RefreshCw className="w-8 h-8 mb-4 text-gray-500 animate-spin" />
          <p className="text-sm">Initializing camera...</p>
        </div>
      )}

      {/* The container for html5-qrcode video feed */}
      <div id="qr-reader" ref={scannerRef} className="w-full h-full object-cover"></div>
      
      {/* Overlay guide */}
      <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 z-10">
        <div className="w-full h-full border-2 border-green-500 rounded-lg relative">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-500/50"></div>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
        <label className="bg-black/60 backdrop-blur-md text-white px-5 py-2.5 rounded-full flex items-center gap-2 cursor-pointer border border-white/20 hover:bg-black/80 transition shadow-lg">
          <ImagePlus className="w-5 h-5" />
          <span className="text-sm font-medium">Scan Photo</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, RefreshCw, ImagePlus, SwitchCamera, Flashlight, FlashlightOff } from 'lucide-react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  isScanning: boolean;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, isScanning }) => {
  const html5QrCode = useRef<Html5Qrcode | null>(null);
  const isTransitioning = useRef(false);
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [nonce, setNonce] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(() => {
    const saved = localStorage.getItem('scanner_facingMode');
    return (saved === 'user' || saved === 'environment') ? saved : 'environment';
  });
  const [isTorchOn, setIsTorchOn] = useState(() => {
    return localStorage.getItem('scanner_isTorchOn') === 'true';
  });

  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let isSubscribed = true;

    const startScanner = async () => {
      if (!isScanning) return;
      
      while (isTransitioning.current) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (!isSubscribed) return;
      
      isTransitioning.current = true;

      try {
        if (html5QrCode.current?.isScanning) {
          await html5QrCode.current.stop();
        }
      } catch (e) {
        console.error('Failed to stop scanner before restart.', e);
      }

      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          if (isSubscribed) setHasPermission(true);

          if (!html5QrCode.current) {
            html5QrCode.current = new Html5Qrcode('reader');
          }

          if (!html5QrCode.current.isScanning) {
            await html5QrCode.current.start(
              { facingMode },
              {
                fps: 10,
              },
              (decodedText) => {
                if (isSubscribed) {
                  // Haptic feedback
                  if (window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(100);
                  }
                  
                  // Audio beep
                  try {
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    oscillator.type = 'sine';
                    oscillator.frequency.value = 800;
                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.1);
                  } catch (e) {
                    console.warn('Audio feedback failed', e);
                  }

                  onScanRef.current(decodedText);
                }
              },
              (errorMessage) => {
                // Ignore frequent scan failures
              }
            );

            // Re-apply torch state if it was on
            if (isTorchOn && facingMode === 'environment') {
              try {
                await html5QrCode.current.applyVideoConstraints({
                  advanced: [{ torch: true } as any]
                });
              } catch (err) {
                console.warn('Torch not supported or failed to re-apply', err);
                setIsTorchOn(false);
                localStorage.setItem('scanner_isTorchOn', 'false');
              }
            }
          }
        } else {
          if (isSubscribed) {
            setHasPermission(false);
            setError('No camera found on this device');
          }
        }
      } catch (err) {
        console.error(err);
        if (isSubscribed) {
          setHasPermission(false);
          setError('Camera permission denied or camera is in use by another application');
        }
      } finally {
        isTransitioning.current = false;
      }
    };

    startScanner();

    return () => {
      isSubscribed = false;
      const stopScanner = async () => {
        while (isTransitioning.current) {
          await new Promise(r => setTimeout(r, 100));
        }
        isTransitioning.current = true;
        try {
          if (html5QrCode.current?.isScanning) {
            await html5QrCode.current.stop();
          }
        } catch (e) {
          console.error('Failed to stop scanner on cleanup.', e);
        } finally {
          isTransitioning.current = false;
        }
      };
      stopScanner();
    };
  }, [isScanning, nonce, facingMode]);

  const toggleTorch = async () => {
    if (html5QrCode.current && html5QrCode.current.isScanning) {
      try {
        const newTorchState = !isTorchOn;
        await html5QrCode.current.applyVideoConstraints({
          advanced: [{ torch: newTorchState } as any]
        });
        setIsTorchOn(newTorchState);
        localStorage.setItem('scanner_isTorchOn', String(newTorchState));
      } catch (err) {
        console.error('Failed to toggle torch', err);
        alert('Flashlight is not supported on this device/browser.');
        setIsTorchOn(false);
        localStorage.setItem('scanner_isTorchOn', 'false');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!html5QrCode.current) {
        html5QrCode.current = new Html5Qrcode('reader');
      }
      try {
        const decodedText = await html5QrCode.current.scanFile(file, true);
        
        // Success feedback
        if (window.navigator && window.navigator.vibrate) {
          window.navigator.vibrate(100);
        }
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.type = 'sine';
          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (err) {
          console.warn('Audio feedback failed', err);
        }

        onScanRef.current(decodedText);
      } catch (err) {
        setError('Could not read barcode from image. Please try another.');
      }
    }
  };

  if (!isScanning) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black aspect-[4/3] w-full max-w-lg mx-auto shadow-2xl ring-1 ring-black/5">
      <div id="reader" className="w-full h-full" />
      
      {hasPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center backdrop-blur-sm">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-lg font-medium text-white mb-2">{error}</p>
          <p className="text-sm text-gray-400 mb-6 max-w-sm">
            Please allow camera access in your browser settings to scan items.
          </p>
          <button
            onClick={() => setNonce(prev => prev + 1)}
            className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-medium hover:bg-gray-100 transition shadow-lg"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      )}

      {hasPermission === null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/80 font-medium">Requesting camera access...</p>
          </div>
        </div>
      )}

      {/* Frame overlay */}
      <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
        <div className="absolute inset-0 border-2 border-white/30" />
        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white -translate-x-1 -translate-y-1" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white translate-x-1 -translate-y-1" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white -translate-x-1 translate-y-1" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white translate-x-1 translate-y-1" />
        
        {/* Laser line */}
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
      </div>

      <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20 gap-3">
        <label className="bg-black/60 backdrop-blur-md text-white px-5 py-2.5 rounded-full flex items-center gap-2 cursor-pointer border border-white/20 hover:bg-black/80 transition shadow-lg">
          <ImagePlus className="w-5 h-5" />
          <span className="text-sm font-medium">Scan Photo</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>

        <button 
          onClick={() => {
            const nextMode = facingMode === 'environment' ? 'user' : 'environment';
            setFacingMode(nextMode);
            localStorage.setItem('scanner_facingMode', nextMode);
          }}
          className="bg-black/60 backdrop-blur-md text-white px-4 py-2.5 rounded-full flex items-center gap-2 border border-white/20 hover:bg-black/80 transition shadow-lg"
          aria-label="Switch Camera"
        >
          <SwitchCamera className="w-5 h-5" />
        </button>

        {facingMode === 'environment' && (
          <button 
            onClick={toggleTorch}
            className={`bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-full flex items-center gap-2 border transition shadow-lg ${isTorchOn ? 'text-yellow-400 border-yellow-400/50' : 'text-white border-white/20 hover:bg-black/80'}`}
            aria-label="Toggle Flashlight"
          >
            {isTorchOn ? <Flashlight className="w-5 h-5" /> : <FlashlightOff className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );
};

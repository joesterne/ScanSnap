import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, ImagePlus, SwitchCamera, Flashlight, FlashlightOff } from 'lucide-react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  isScanning: boolean;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 20_000_000;
const MAX_SCAN_LENGTH = 256;

const normalizeScan = (value: string) => value.trim().slice(0, MAX_SCAN_LENGTH);

export const Scanner: React.FC<ScannerProps> = ({ onScan, isScanning }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);
  
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

  const stopStream = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
        });
        streamRef.current = null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (!isScanning) {
        stopStream();
        return;
    }

    const startScanner = async () => {
        stopStream();
        setHasPermission(null);
        setError('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                }
            });

            if (!isMounted) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            streamRef.current = stream;
            setHasPermission(true);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Important: play() needs to be handled properly for iOS safari
                videoRef.current.setAttribute('playsinline', 'true');
                videoRef.current.play().catch(e => console.warn('Play interrupted', e));
            }

            // Sync torch state if possible
            if (isTorchOn && facingMode === 'environment') {
                const track = stream.getVideoTracks()[0];
                if (track && 'applyConstraints' in track) {
                    try {
                        await track.applyConstraints({ advanced: [{ torch: true } as any] });
                    } catch (e) {
                        setIsTorchOn(false);
                    }
                }
            }

            const tick = () => {
                if (!isMounted) return;
                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        });
                        
                        const decodedValue = code ? normalizeScan(code.data) : '';
                        if (decodedValue) {
                            if (window.navigator?.vibrate) window.navigator.vibrate(100);
                            onScanRef.current(decodedValue);
                        }
                    }
                }
                requestRef.current = requestAnimationFrame(tick);
            };
            requestRef.current = requestAnimationFrame(tick);
        } catch (err: any) {
            console.error('Camera access error:', err);
            if (isMounted) {
                setHasPermission(false);
                setError(err.name === 'NotAllowedError' ? 'Camera permission denied or camera in use.' : 'Camera not found or inaccessible.');
            }
        }
    };

    startScanner();

    return () => {
        isMounted = false;
        stopStream();
    };
  }, [isScanning, nonce, facingMode]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) {
        try {
            const nextTorch = !isTorchOn;
            await track.applyConstraints({ advanced: [{ torch: nextTorch } as any] });
            setIsTorchOn(nextTorch);
            localStorage.setItem('scanner_isTorchOn', String(nextTorch));
        } catch (e) {
            alert('Flashlight is not supported on this device/browser.');
            setIsTorchOn(false);
            localStorage.setItem('scanner_isTorchOn', 'false');
        }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      e.target.value = '';

      if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_BYTES) {
          setError('Please select an image smaller than 10 MB.');
          setHasPermission(false);
          return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          if (img.width * img.height > MAX_IMAGE_PIXELS) {
              setError('Image dimensions are too large to scan safely.');
              setHasPermission(false);
              return;
          }
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              
              // We try invert as well for static images since they might be dark themed
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: "attemptBoth"
              });
              
              const decodedValue = code ? normalizeScan(code.data) : '';
              if (decodedValue) {
                  if (window.navigator?.vibrate) window.navigator.vibrate(100);
                  setError('');
                  setHasPermission(true);
                  onScanRef.current(decodedValue);
              } else {
                  setError('Could not read barcode from image. Please try a clearer picture.');
                  setHasPermission(false);
              }
          }
      };
      img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          setError('Could not load image file.');
          setHasPermission(false);
      };
      img.src = objectUrl;
    }
  };

  if (!isScanning) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black aspect-[4/3] w-full max-w-lg mx-auto shadow-2xl ring-1 ring-black/5">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {hasPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center backdrop-blur-sm z-30">
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-30">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/80 font-medium">Requesting camera access...</p>
          </div>
        </div>
      )}

      {/* Frame overlay */}
      <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 z-10">
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

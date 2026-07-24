import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, ImagePlus, SwitchCamera, Flashlight, FlashlightOff } from 'lucide-react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  isScanning: boolean;
}

export function Scanner({ onScan, isScanning }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | null>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastScanAtRef = useRef(0);
  const hasDecodedRef = useRef(false);
  
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

  const getScanCanvas = () => {
    if (!scanCanvasRef.current) {
        scanCanvasRef.current = document.createElement('canvas');
    }
    return scanCanvasRef.current;
  };
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopStream = () => {
    if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
    }
    hasDecodedRef.current = false;
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

            const tick = (now: number) => {
                if (!isMounted) return;

                if (now - lastScanAtRef.current < 150) {
                    requestRef.current = requestAnimationFrame(tick);
                    return;
                }
                lastScanAtRef.current = now;

                const video = videoRef.current;
                if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
                    const canvas = getScanCanvas();
                    const sourceWidth = video.videoWidth;
                    const sourceHeight = video.videoHeight;
                    const scale = Math.min(1, 640 / Math.max(sourceWidth, sourceHeight));
                    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
                    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

                    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                        canvas.width = targetWidth;
                        canvas.height = targetHeight;
                        scanContextRef.current = canvas.getContext('2d', { willReadFrequently: true });
                    }

                    const ctx = scanContextRef.current;
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
                        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                        const code = jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        });
                        
                        if (code && code.data && code.data.trim() !== '' && !hasDecodedRef.current) {
                            hasDecodedRef.current = true;
                            stopStream();
                            if (window.navigator?.vibrate) window.navigator.vibrate(100);
                            onScanRef.current(code.data);
                            return;
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

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const img = new Image();
      img.onload = () => {
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
              
              if (code && code.data) {
                  if (window.navigator?.vibrate) window.navigator.vibrate(100);
                  setError('');
                  setHasPermission(true);
                  onScanRef.current(code.data);
              } else {
                  setError('Could not read barcode from image. Please try a clearer picture.');
                  setHasPermission(false);
              }
          }
      };
      img.onerror = () => {
          setError('Could not load image file.');
          setHasPermission(false);
      };
      img.src = URL.createObjectURL(file);
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
}

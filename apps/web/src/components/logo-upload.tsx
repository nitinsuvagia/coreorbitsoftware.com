'use client';

import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Camera, Upload, X, ZoomIn, RotateCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoUploadProps {
  value?: string | null;
  onChange: (logo: string | null) => void;
  name?: string;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  aspectRatio?: number; // width:height ratio, e.g., 3 means 3:1
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function LogoUpload({
  value,
  onChange,
  name = 'Logo',
  disabled = false,
  loading = false,
  size = 'lg',
  shape = 'circle',
  aspectRatio = 1,
}: LogoUploadProps) {
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const sizeClasses = {
    sm: aspectRatio === 1 ? 'h-16 w-16' : 'h-16',
    md: aspectRatio === 1 ? 'h-24 w-24' : 'h-24',
    lg: aspectRatio === 1 ? 'h-32 w-32' : 'h-32',
  };

  // Calculate width based on aspect ratio
  const getSizeStyle = () => {
    if (aspectRatio === 1) return {};
    const heights = { sm: 64, md: 96, lg: 128 };
    const height = heights[size];
    return { width: height * aspectRatio, height };
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setZoom(1);
        setRotation(0);
        setCropPosition({ x: 0, y: 0 });
        setShowCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: disabled || loading,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: cropPosition.x,
      posY: cropPosition.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    setCropPosition({
      x: dragStartRef.current.posX + deltaX,
      y: dragStartRef.current.posY + deltaY,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const getCroppedImage = useCallback((): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!imageSrc || !canvasRef.current) {
        reject(new Error('No image source'));
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot get canvas context'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Calculate output size based on aspect ratio
        const baseSize = 256;
        const outputWidth = aspectRatio >= 1 ? baseSize * aspectRatio : baseSize;
        const outputHeight = aspectRatio >= 1 ? baseSize : baseSize / aspectRatio;
        canvas.width = outputWidth;
        canvas.height = outputHeight;

        // Clear canvas
        ctx.clearRect(0, 0, outputWidth, outputHeight);

        // Set up circular clip if shape is circle
        if (shape === 'circle') {
          ctx.beginPath();
          ctx.arc(outputWidth / 2, outputHeight / 2, Math.min(outputWidth, outputHeight) / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
        }

        // Calculate dimensions - use container size for the crop preview
        const containerWidth = aspectRatio >= 1 ? 280 : 200;
        const containerHeight = aspectRatio >= 1 ? 280 / aspectRatio : 200;
        const containerSize = Math.min(containerWidth, containerHeight);
        const scale = (img.width < img.height ? img.width : img.height) / containerSize;
        const scaledWidth = img.width / scale * zoom;
        const scaledHeight = img.height / scale * zoom;

        // Save context
        ctx.save();

        // Move to center
        ctx.translate(outputWidth / 2, outputHeight / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        // Draw image centered with offset
        const scaleX = outputWidth / containerWidth;
        const scaleY = outputHeight / containerHeight;
        const offsetX = cropPosition.x * scaleX;
        const offsetY = cropPosition.y * scaleY;
        ctx.drawImage(
          img,
          -scaledWidth / 2 * scaleX + offsetX,
          -scaledHeight / 2 * scaleY + offsetY,
          scaledWidth * scaleX,
          scaledHeight * scaleY
        );

        ctx.restore();

        // Get data URL
        const dataUrl = canvas.toDataURL('image/png', 0.9);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSrc;
    });
  }, [imageSrc, zoom, rotation, cropPosition, shape, aspectRatio]);

  const handleSaveCrop = async () => {
    setProcessing(true);
    try {
      const croppedImage = await getCroppedImage();
      onChange(croppedImage);
      setShowCropDialog(false);
      setImageSrc(null);
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  const handleCancelCrop = () => {
    setShowCropDialog(false);
    setImageSrc(null);
    setZoom(1);
    setRotation(0);
    setCropPosition({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3">
        <Skeleton className={cn(sizeClasses[size], shape === 'circle' ? 'rounded-full' : 'rounded-lg')} />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        {...getRootProps()}
        className={cn(
          'relative group cursor-pointer transition-all',
          aspectRatio === 1 ? sizeClasses[size] : sizeClasses[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          isDragActive && 'ring-2 ring-primary ring-offset-2',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={getSizeStyle()}
      >
        <input {...getInputProps()} />
        
        {value ? (
          <div 
            className={cn(
              'overflow-hidden w-full h-full',
              shape === 'circle' ? 'rounded-full' : 'rounded-lg'
            )}
          >
            <img src={value} alt={name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div
            className={cn(
              'flex items-center justify-center bg-muted border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 transition-colors w-full h-full',
              shape === 'circle' ? 'rounded-full' : 'rounded-lg'
            )}
          >
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        {/* Overlay on hover */}
        {!disabled && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity',
              shape === 'circle' ? 'rounded-full' : 'rounded-lg'
            )}
          >
            <Upload className="h-6 w-6 text-white" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="text-destructive hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Remove
          </Button>
        )}
        {!value && !disabled && (
          <p className="text-xs text-muted-foreground">Click or drag to upload</p>
        )}
      </div>

      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={(open) => !open && handleCancelCrop()}>
        <DialogContent className={aspectRatio > 2 ? "max-w-2xl" : "max-w-lg"}>
          <DialogHeader>
            <DialogTitle>Crop Logo</DialogTitle>
            <DialogDescription>
              Drag to position, zoom and rotate to adjust your logo
              {aspectRatio !== 1 && ` (${aspectRatio}:1 ratio)`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Crop Preview */}
            <div
              className={cn(
                'relative mx-auto overflow-hidden bg-muted',
                shape === 'circle' ? 'rounded-full' : 'rounded-lg'
              )}
              style={{ 
                width: aspectRatio >= 1 ? Math.min(280 * aspectRatio, 400) : 200, 
                height: aspectRatio >= 1 ? 280 / aspectRatio : 200 
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {imageSrc && (
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  className="absolute cursor-move select-none"
                  style={{
                    transform: `translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                    maxWidth: 'none',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  draggable={false}
                />
              )}
              {/* Crop guide */}
              <div
                className={cn(
                  'absolute inset-0 border-2 border-white/50 pointer-events-none',
                  shape === 'circle' ? 'rounded-full' : 'rounded-lg'
                )}
              />
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[zoom]}
                  onValueChange={(values: number[]) => setZoom(values[0])}
                  min={0.5}
                  max={3}
                  step={0.1}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-12">{Math.round(zoom * 100)}%</span>
              </div>

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRotate}
                >
                  <RotateCw className="h-4 w-4 mr-2" />
                  Rotate
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelCrop} disabled={processing}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSaveCrop} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export skeleton for loading states
export function LogoUploadSkeleton({
  size = 'lg',
  shape = 'circle',
}: {
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
}) {
  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Skeleton className={cn(sizeClasses[size], shape === 'circle' ? 'rounded-full' : 'rounded-lg')} />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

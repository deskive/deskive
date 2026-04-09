/**
 * Image Preview Modal
 * Modal to preview AI-generated images with keep/discard actions
 */

import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Download, Heart, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface GeneratedImage {
  url: string;
  width?: number;
  height?: number;
  format?: string;
  quality?: string;
}

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: GeneratedImage[];
  onKeep: (imageUrl: string, fileName: string) => Promise<void>;
  onDiscard: () => void;
  isKeeping?: boolean;
}

export function ImagePreviewModal({ 
  isOpen, 
  onClose, 
  images, 
  onKeep, 
  onDiscard,
  isKeeping = false 
}: ImagePreviewModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [fileName, setFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedImage = images[selectedImageIndex];

  // Generate default filename when modal opens or image changes
  const generateDefaultFileName = (index: number) => {
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    return `ai-generated-image-${timestamp}-${index + 1}.png`;
  };

  // Update filename when selected image changes
  React.useEffect(() => {
    if (selectedImage && !fileName) {
      setFileName(generateDefaultFileName(selectedImageIndex));
    }
  }, [selectedImageIndex, selectedImage, fileName]);

  const handleKeep = async () => {
    if (!selectedImage || !fileName.trim()) {
      toast.error('Please enter a filename');
      return;
    }

    setIsSaving(true);
    try {
      await onKeep(selectedImage.url, fileName.trim());
      toast.success('Image saved successfully!');
      onClose();
    } catch (error: any) {
      toast.error('Failed to save image', {
        description: error?.message || 'An unexpected error occurred',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    onDiscard();
    onClose();
  };

  const handleDownload = async () => {
    if (!selectedImage) return;

    try {
      const response = await fetch(selectedImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'ai-generated-image.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download image');
    }
  };

  if (!selectedImage) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            AI Generated Image Preview
          </DialogTitle>
          <DialogDescription>
            {images.length > 1 
              ? `Preview and save your generated images (${selectedImageIndex + 1} of ${images.length})`
              : 'Preview and save your generated image'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-center">
                <img
                  src={selectedImage.url}
                  alt="AI Generated"
                  className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg"
                  style={{
                    width: selectedImage.width ? `${Math.min(selectedImage.width, 600)}px` : 'auto',
                    height: 'auto'
                  }}
                />
              </div>
              {selectedImage.width && selectedImage.height && (
                <div className="text-center mt-2 text-sm text-muted-foreground">
                  {selectedImage.width} × {selectedImage.height} pixels
                  {selectedImage.format && ` • ${selectedImage.format.toUpperCase()}`}
                  {selectedImage.quality && ` • ${selectedImage.quality} quality`}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Image Navigation for Multiple Images */}
          {images.length > 1 && (
            <div className="flex justify-center gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === selectedImageIndex
                      ? 'bg-primary'
                      : 'bg-muted hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* File Name Input */}
          <div className="space-y-2">
            <Label htmlFor="filename">Save as</Label>
            <Input
              id="filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter filename..."
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              The image will be saved to your current folder
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          {/* Download button */}
          <Button
            variant="outline"
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>

          {/* Discard button */}
          <Button
            variant="outline"
            onClick={handleDiscard}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Discard
          </Button>

          {/* Keep button */}
          <Button
            onClick={handleKeep}
            disabled={!fileName.trim() || isSaving || isKeeping}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Save className="h-4 w-4" />
            {isSaving || isKeeping ? 'Saving...' : 'Keep & Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
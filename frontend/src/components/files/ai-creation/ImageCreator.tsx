/**
 * Image Creator Component
 * AI-powered image generation interface
 */

import { useState } from 'react';
import { Image, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
// Import types individually to avoid module parsing issues
type ImageType = "logo" | "artwork" | "illustration" | "photo" | "banner" | "social_media" | "product" | "character" | "landscape" | "portrait" | "abstract" | "icon";
type ImageStyle = "natural" | "vivid";
type ImageSize = "256x256" | "512x512" | "1024x1024" | "512x768" | "768x1024" | "768x512" | "1024x768" | "1024x576" | "1344x768";
type ImageQuality = "standard" | "hd";

interface ImageCreatorProps {
  onGenerate: (data: any) => void;
  isGenerating: boolean;
}

export function ImageCreator({ onGenerate, isGenerating }: ImageCreatorProps) {
  const [prompt, setPrompt] = useState('');
  const [imageType, setImageType] = useState<ImageType>('artwork');
  const [style, setStyle] = useState<ImageStyle>('natural');
  const [size, setSize] = useState<ImageSize>('1024x1024');
  const [quality, setQuality] = useState<ImageQuality>('standard');
  const [lighting, setLighting] = useState('natural lighting');
  const [colorPalette, setColorPalette] = useState('warm');
  const [mood, setMood] = useState('professional');

  const imageTypes = [
    { value: 'logo' as const, label: 'Logo' },
    { value: 'artwork' as const, label: 'Artwork' },
    { value: 'illustration' as const, label: 'Illustration' },
    { value: 'photo' as const, label: 'Photo' },
    { value: 'banner' as const, label: 'Banner' },
    { value: 'social_media' as const, label: 'Social Media' },
    { value: 'product' as const, label: 'Product' },
    { value: 'character' as const, label: 'Character' },
    { value: 'landscape' as const, label: 'Landscape' },
    { value: 'portrait' as const, label: 'Portrait' },
    { value: 'abstract' as const, label: 'Abstract' },
    { value: 'icon' as const, label: 'Icon' },
  ];

  const styles = [
    { value: 'natural' as const, label: 'Natural' },
    { value: 'vivid' as const, label: 'Vivid' },
  ];

  const sizes = [
    { value: '256x256' as const, label: 'Small Square (256x256)' },
    { value: '512x512' as const, label: 'Medium Square (512x512)' },
    { value: '1024x1024' as const, label: 'Large Square (1024x1024)' },
    { value: '512x768' as const, label: 'Portrait Small (512x768)' },
    { value: '768x1024' as const, label: 'Portrait Large (768x1024)' },
    { value: '768x512' as const, label: 'Landscape Small (768x512)' },
    { value: '1024x768' as const, label: 'Landscape Large (1024x768)' },
    { value: '1024x576' as const, label: 'Wide (1024x576)' },
    { value: '1344x768' as const, label: 'Ultra Wide (1344x768)' },
  ];

  const qualities = [
    { value: 'standard' as const, label: 'Standard' },
    { value: 'hd' as const, label: 'HD' },
  ];

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    onGenerate({
      prompt,
      image_type: imageType,
      style,
      size,
      quality,
      count: 1,
      color_palette: [colorPalette],
      mood: [mood],
      lighting,
    });
  };

  return (
    <div className="space-y-4">
      {/* Prompt Input */}
      <div className="space-y-2">
        <Label htmlFor="image-prompt">Image Description</Label>
        <Textarea
          id="image-prompt"
          placeholder="Describe the image you want to create... (e.g., 'A professional office workspace with natural lighting')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="resize-none"
        />
        <div className="text-xs text-muted-foreground text-right">
          {prompt.length} / 1000 characters
        </div>
      </div>

      {/* Image Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="image-type">Image Type</Label>
        <Select value={imageType} onValueChange={(value) => setImageType(value as ImageType)}>
          <SelectTrigger id="image-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {imageTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Style Selection */}
      <div className="space-y-2">
        <Label htmlFor="image-style">Style</Label>
        <Select value={style} onValueChange={(value) => setStyle(value as ImageStyle)}>
          <SelectTrigger id="image-style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {styles.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Size and Quality */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="image-size">Size</Label>
          <Select value={size} onValueChange={(value) => setSize(value as ImageSize)}>
            <SelectTrigger id="image-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="image-quality">Quality</Label>
          <Select value={quality} onValueChange={(value) => setQuality(value as ImageQuality)}>
            <SelectTrigger id="image-quality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {qualities.map((q) => (
                <SelectItem key={q.value} value={q.value}>
                  {q.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lighting">Lighting</Label>
          <Select value={lighting} onValueChange={setLighting}>
            <SelectTrigger id="lighting">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="natural lighting">Natural</SelectItem>
              <SelectItem value="studio lighting">Studio</SelectItem>
              <SelectItem value="golden hour lighting">Golden Hour</SelectItem>
              <SelectItem value="dramatic lighting">Dramatic</SelectItem>
              <SelectItem value="soft lighting">Soft</SelectItem>
              <SelectItem value="harsh lighting">Harsh</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color-palette">Color Palette</Label>
          <Select value={colorPalette} onValueChange={setColorPalette}>
            <SelectTrigger id="color-palette">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cool">Cool</SelectItem>
              <SelectItem value="vibrant">Vibrant</SelectItem>
              <SelectItem value="muted">Muted</SelectItem>
              <SelectItem value="monochrome">Monochrome</SelectItem>
              <SelectItem value="sunset colors">Sunset</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mood">Mood</Label>
          <Select value={mood} onValueChange={setMood}>
            <SelectTrigger id="mood">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="peaceful">Peaceful</SelectItem>
              <SelectItem value="serene">Serene</SelectItem>
              <SelectItem value="energetic">Energetic</SelectItem>
              <SelectItem value="mysterious">Mysterious</SelectItem>
              <SelectItem value="playful">Playful</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
      >
        {isGenerating ? (
          <>
            <Wand2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Image
          </>
        )}
      </Button>

      {/* Tips Card */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-2 text-green-900 dark:text-green-100">
            💡 Image Generation Tips
          </h3>
          <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
            <li>• Be specific about subjects, lighting, and composition</li>
            <li>• Include style keywords like "professional", "modern", "minimalist"</li>
            <li>• Mention camera angles or perspectives if needed</li>
            <li>• Higher resolutions take longer but produce better quality</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

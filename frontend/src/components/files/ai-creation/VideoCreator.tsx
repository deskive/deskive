/**
 * Video Creator Component
 * AI-powered video generation interface
 */

import { useState } from 'react';
import { Video, Sparkles, Wand2 } from 'lucide-react';
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

// Local type definitions to match API schema
interface VideoGenerationRequest {
  prompt: string;
  duration: number;
  aspect_ratio: string;
}

interface VideoCreatorProps {
  onCreate: (data: VideoGenerationRequest) => void;
  isCreating: boolean;
}

export function VideoCreator({ onCreate, isCreating }: VideoCreatorProps) {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [duration, setDuration] = useState(4);

  const aspectRatios = [
    { value: '16:9', label: '16:9 (Widescreen)' },
    { value: '9:16', label: '9:16 (Portrait)' },
    { value: '1:1', label: '1:1 (Square)' },
    { value: '4:3', label: '4:3 (Standard)' },
  ];

  const durations = [
    { value: 2, label: '2 seconds' },
    { value: 4, label: '4 seconds' },
    { value: 6, label: '6 seconds' },
    { value: 8, label: '8 seconds' },
    { value: 10, label: '10 seconds' },
  ];

  const handleCreate = () => {
    if (!prompt.trim()) return;

    onCreate({
      prompt,
      duration,
      aspect_ratio: aspectRatio,
    });
  };

  return (
    <div className="space-y-4">
      {/* Prompt Input */}
      <div className="space-y-2">
        <Label htmlFor="video-prompt">Video Description</Label>
        <Textarea
          id="video-prompt"
          placeholder="Describe the video you want to create... (e.g., 'A smooth pan across a modern office space')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="resize-none"
        />
        <div className="text-xs text-muted-foreground text-right">
          {prompt.length} / 1000 characters
        </div>
      </div>

      {/* Aspect Ratio and Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="video-aspect-ratio">Aspect Ratio</Label>
          <Select value={aspectRatio} onValueChange={setAspectRatio}>
            <SelectTrigger id="video-aspect-ratio">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aspectRatios.map((ar) => (
                <SelectItem key={ar.value} value={ar.value}>
                  {ar.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="video-duration">Duration</Label>
          <Select value={duration.toString()} onValueChange={(value) => setDuration(Number(value))}>
            <SelectTrigger id="video-duration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durations.map((d) => (
                <SelectItem key={d.value} value={d.value.toString()}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Create Button */}
      <Button
        onClick={handleCreate}
        disabled={!prompt.trim() || isCreating}
        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white border-0"
      >
        {isCreating ? (
          <>
            <Wand2 className="h-4 w-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Create Video
          </>
        )}
      </Button>

      {/* Tips Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
            💡 Video Creation Tips
          </h3>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Describe scenes with specific details and visual elements</li>
            <li>• Include camera movements, lighting, and atmosphere in your prompt</li>
            <li>• Longer duration videos take significantly more time to generate</li>
            <li>• 16:9 aspect ratio works best for most video content</li>
            <li>• Be specific about what you want to see in the scene</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Audio Creator Component
 * AI-powered audio generation interface
 */

import { useState } from 'react';
import { Music, Sparkles, Wand2 } from 'lucide-react';
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

interface AudioCreatorProps {
  onCreate: (data: any) => void;
  isCreating: boolean;
}

export function AudioCreator({ onCreate, isCreating }: AudioCreatorProps) {
  const [prompt, setPrompt] = useState('');
  const [voice, setVoice] = useState('professional-female');
  const [duration, setDuration] = useState('30');
  const [format, setFormat] = useState('mp3');

  const voices = [
    { value: 'professional-female', label: 'Professional Female' },
    { value: 'professional-male', label: 'Professional Male' },
    { value: 'casual-female', label: 'Casual Female' },
    { value: 'casual-male', label: 'Casual Male' },
    { value: 'narrator', label: 'Narrator' },
  ];

  const durations = [
    { value: '15', label: '15 seconds' },
    { value: '30', label: '30 seconds' },
    { value: '60', label: '1 minute' },
    { value: '120', label: '2 minutes' },
    { value: '300', label: '5 minutes' },
  ];

  const formats = [
    { value: 'mp3', label: 'MP3' },
    { value: 'wav', label: 'WAV' },
    { value: 'ogg', label: 'OGG' },
  ];

  const handleCreate = () => {
    if (!prompt.trim()) return;

    onCreate({
      type: 'audio',
      prompt,
      voice,
      duration,
      format,
    });
  };

  return (
    <div className="space-y-4">
      {/* Prompt Input */}
      <div className="space-y-2">
        <Label htmlFor="audio-prompt">Audio Script</Label>
        <Textarea
          id="audio-prompt"
          placeholder="Enter the text you want to convert to speech... (e.g., 'Welcome to our company presentation')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="resize-none"
        />
        <div className="text-xs text-muted-foreground text-right">
          {prompt.length} / 2000 characters
        </div>
      </div>

      {/* Voice Selection */}
      <div className="space-y-2">
        <Label htmlFor="audio-voice">Voice</Label>
        <Select value={voice} onValueChange={setVoice}>
          <SelectTrigger id="audio-voice">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {voices.map((v) => (
              <SelectItem key={v.value} value={v.value}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Duration and Format */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="audio-duration">Max Duration</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger id="audio-duration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durations.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="audio-format">Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger id="audio-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formats.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
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
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
      >
        {isCreating ? (
          <>
            <Wand2 className="h-4 w-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Create Audio
          </>
        )}
      </Button>

      {/* Tips Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-2 text-purple-900 dark:text-purple-100">
            💡 Audio Creation Tips
          </h3>
          <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
            <li>• Use punctuation for natural pauses and intonation</li>
            <li>• Select voice that matches your content tone</li>
            <li>• Break long scripts into smaller sections for better quality</li>
            <li>• WAV format provides highest quality but larger file size</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

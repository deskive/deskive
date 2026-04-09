/**
 * Document Creator Component
 * AI-powered document generation interface
 */

import { useState } from 'react';
import { FileText, Sparkles, Wand2 } from 'lucide-react';
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

interface DocumentCreatorProps {
  onCreate: (data: any) => void;
  isCreating: boolean;
}

export function DocumentCreator({ onCreate, isCreating }: DocumentCreatorProps) {
  const [prompt, setPrompt] = useState('');
  const [template, setTemplate] = useState('business-proposal');
  const [format, setFormat] = useState('docx');
  const [length, setLength] = useState('medium');

  const templates = [
    { value: 'business-proposal', label: 'Business Proposal' },
    { value: 'project-plan', label: 'Project Plan' },
    { value: 'meeting-notes', label: 'Meeting Notes' },
    { value: 'report', label: 'Report' },
    { value: 'email', label: 'Email' },
    { value: 'memo', label: 'Memo' },
  ];

  const formats = [
    { value: 'docx', label: 'Word Document (.docx)' },
    { value: 'pdf', label: 'PDF Document (.pdf)' },
    { value: 'txt', label: 'Text File (.txt)' },
    { value: 'md', label: 'Markdown (.md)' },
  ];

  const lengths = [
    { value: 'short', label: 'Short (1 page)' },
    { value: 'medium', label: 'Medium (2-3 pages)' },
    { value: 'long', label: 'Long (4-5 pages)' },
  ];

  const handleCreate = () => {
    if (!prompt.trim()) return;

    onCreate({
      type: 'document',
      prompt,
      template,
      format,
      length,
    });
  };

  return (
    <div className="space-y-4">
      {/* Prompt Input */}
      <div className="space-y-2">
        <Label htmlFor="document-prompt">Document Requirements</Label>
        <Textarea
          id="document-prompt"
          placeholder="Describe what you need in the document... (e.g., 'Create a business proposal for a new software product')"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="resize-none"
        />
        <div className="text-xs text-muted-foreground text-right">
          {prompt.length} / 2000 characters
        </div>
      </div>

      {/* Template Selection */}
      <div className="space-y-2">
        <Label htmlFor="document-template">Template</Label>
        <Select value={template} onValueChange={setTemplate}>
          <SelectTrigger id="document-template">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Format and Length */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="document-format">Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger id="document-format">
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

        <div className="space-y-2">
          <Label htmlFor="document-length">Length</Label>
          <Select value={length} onValueChange={setLength}>
            <SelectTrigger id="document-length">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lengths.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
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
        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border-0"
      >
        {isCreating ? (
          <>
            <Wand2 className="h-4 w-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Create Document
          </>
        )}
      </Button>

      {/* Tips Card */}
      <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800">
        <CardContent className="p-4">
          <h3 className="font-medium text-sm mb-2 text-orange-900 dark:text-orange-100">
            💡 Document Creation Tips
          </h3>
          <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
            <li>• Provide key points or sections you want to include</li>
            <li>• Mention tone (formal, casual, technical) if important</li>
            <li>• Templates help maintain consistent formatting</li>
            <li>• PDF format is best for sharing final versions</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

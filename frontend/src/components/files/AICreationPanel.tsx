/**
 * AI Creation Panel
 * Side panel for AI-powered content creation (images, audio, video, documents)
 */

import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  X,
  Image,
  FileText,
  Music,
  Video,
  Sparkles,
  Wand2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { ImageCreator } from './ai-creation/ImageCreator';
import { AudioCreator } from './ai-creation/AudioCreator';
import { VideoCreator } from './ai-creation/VideoCreator';
import { DocumentCreator } from './ai-creation/DocumentCreator';
import { ImagePreviewModal } from './ai-creation/ImagePreviewModal';
import { useGenerateImage, useGenerateVideo } from '@/lib/api/ai-api';
import { useAddFileByUrl } from '@/lib/api/files-api';
import { toast } from 'sonner';

// Import the types from the API
import type { ImageGenerationRequest as APIImageGenerationRequest, VideoGenerationRequest as APIVideoGenerationRequest } from '@/lib/api/ai-api';

// Use API types directly
type ImageGenerationRequest = APIImageGenerationRequest;

type VideoGenerationRequest = APIVideoGenerationRequest;

interface AICreationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: CreationType;
  workspaceId: string;
  currentFolderId?: string | null;
}

type CreationType = 'image' | 'audio' | 'video' | 'document';

export function AICreationPanel({ isOpen, onClose, initialType = 'image', workspaceId, currentFolderId }: AICreationPanelProps) {
  const intl = useIntl();
  const [selectedType, setSelectedType] = useState<CreationType>(initialType);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; width?: number; height?: number; format?: string; quality?: string }>>([]);

  const generateImageMutation = useGenerateImage();
  const generateVideoMutation = useGenerateVideo();
  const addFileByUrlMutation = useAddFileByUrl();

  // Update selected type when initialType changes
  useEffect(() => {
    setSelectedType(initialType);
  }, [initialType]);

  const creationTypes = [
    {
      id: 'image' as const,
      name: intl.formatMessage({ id: 'modules.files.ai.image', defaultMessage: 'AI Image' }),
      icon: Image,
      description: intl.formatMessage({ id: 'modules.files.ai.imageDesc', defaultMessage: 'Generate professional images for presentations and content' }),
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    {
      id: 'audio' as const,
      name: intl.formatMessage({ id: 'modules.files.ai.audio', defaultMessage: 'AI Audio' }),
      icon: Music,
      description: intl.formatMessage({ id: 'modules.files.ai.audioDesc', defaultMessage: 'Create voice recordings and audio content' }),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      borderColor: 'border-purple-200 dark:border-purple-800',
    },
    {
      id: 'video' as const,
      name: intl.formatMessage({ id: 'modules.files.ai.video', defaultMessage: 'AI Video' }),
      icon: Video,
      description: intl.formatMessage({ id: 'modules.files.ai.videoDesc', defaultMessage: 'Generate and edit video content' }),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
    {
      id: 'document' as const,
      name: intl.formatMessage({ id: 'modules.files.ai.document', defaultMessage: 'AI Documents' }),
      icon: FileText,
      description: intl.formatMessage({ id: 'modules.files.ai.documentDesc', defaultMessage: 'Generate documents from templates and prompts' }),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      borderColor: 'border-orange-200 dark:border-orange-800',
    },
  ];

  const selectedTypeInfo = creationTypes.find(type => type.id === selectedType);

  const handleGenerate = async (data: any) => {
    if (selectedType === 'image') {
      await handleImageGeneration(data as ImageGenerationRequest);
    } else if (selectedType === 'video') {
      await handleVideoGeneration(data as VideoGenerationRequest);
    } else {
      // For other types, keep the simulation for now
      await handleOtherGeneration(data);
    }
  };

  const handleImageGeneration = async (data: ImageGenerationRequest) => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Preparing image generation...');

    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return 80;
          }
          return prev + 20;
        });
      }, 1000);

      setGenerationStatus('Generating your image...');

      console.log('🚀 Starting image generation with data:', data);
      const result = await generateImageMutation.mutateAsync(data);
      console.log('✅ Image generation result:', result);

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStatus('Image generated successfully!');

      // Prepare images for preview modal
      // image_urls can be either strings or objects with url property
      const images = result.image_urls.map((item: string | { url: string }) => ({
        url: typeof item === 'string' ? item : item.url,
        width: result.specifications?.width,
        height: result.specifications?.height,
        format: result.specifications?.format,
        quality: result.specifications?.quality,
      }));

      setGeneratedImages(images);
      
      // Reset generation state
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');

      // Show preview modal
      setShowImagePreview(true);

      toast.success('Image generated successfully!', {
        description: `Generated ${result.image_urls.length} image(s). Choose to keep or discard.`,
      });

    } catch (error: any) {
      console.error('❌ Image generation error:', error);
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
      
      // Check if it's a network/API error
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        toast.error('Backend server not running', {
          description: 'The API server at localhost:3002 is not available. Please start the backend server.',
        });
      } else {
        toast.error('Failed to generate image', {
          description: error?.message || 'An unexpected error occurred',
        });
      }
    }
  };

  const handleVideoGeneration = async (data: VideoGenerationRequest) => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Preparing video generation...');

    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return 80;
          }
          return prev + 15;
        });
      }, 1500);

      setGenerationStatus('Generating your video...');

      console.log('🎬 Starting video generation with data:', data);
      const result = await generateVideoMutation.mutateAsync(data);
      console.log('✅ Video generation result:', result);

      clearInterval(progressInterval);
      setGenerationProgress(100);
      setGenerationStatus('Video generated successfully!');

      // Save video directly to files
      try {
        await addFileByUrlMutation.mutateAsync({
          workspaceId,
          data: {
            url: result.video_url,
            name: `AI-Video-${Date.now()}.mp4`,
            workspace_id: workspaceId,
            folder_id: currentFolderId || undefined,
            mime_type: 'video/mp4',
            is_ai_generated: true,
            description: `AI-generated video: ${data.prompt.substring(0, 100)}...`,
            metadata: {
              ai_generated: true,
              generated_at: new Date().toISOString(),
              prompt: data.prompt,
              duration: result.specifications?.duration,
              quality: result.specifications?.quality,
              aspect_ratio: result.specifications?.aspect_ratio,
            }
          }
        });

        toast.success('Video generated and saved successfully!', {
          description: `Video saved with ${result.specifications?.duration}s duration`,
        });
      } catch (saveError) {
        console.error('Failed to save video:', saveError);
        toast.error('Video generated but failed to save', {
          description: 'Please try generating again',
        });
      }

      // Reset generation state
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');

    } catch (error: any) {
      console.error('❌ Video generation error:', error);
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
      
      // Check if it's a network/API error
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        toast.error('Backend server not running', {
          description: 'The API server is not available. Please start the backend server.',
        });
      } else {
        toast.error('Failed to generate video', {
          description: error?.message || 'An unexpected error occurred',
        });
      }
    }
  };

  const handleOtherGeneration = async (data: any) => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Initializing...');

    // Simulate generation progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 3000));

    clearInterval(progressInterval);
    setGenerationProgress(100);
    setGenerationStatus('Complete!');

    setTimeout(() => {
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStatus('');
    }, 1000);
  };

  const handleKeepImage = async (imageUrl: string, fileName: string) => {
    try {
      await addFileByUrlMutation.mutateAsync({
        workspaceId,
        data: {
          url: imageUrl,
          name: fileName,
          workspace_id: workspaceId,
          folder_id: currentFolderId || undefined,
          mime_type: 'image/png',
          is_ai_generated: true,
          description: 'AI-generated image',
          metadata: {
            ai_generated: true,
            generated_at: new Date().toISOString(),
          }
        }
      });
    } catch (error) {
      console.error('Failed to save image:', error);
      throw error;
    }
  };

  const handleDiscardImage = () => {
    setGeneratedImages([]);
    setShowImagePreview(false);
    toast.info('Images discarded');
  };

  const handleClosePreview = () => {
    setShowImagePreview(false);
    setGeneratedImages([]);
  };

  return (
    <>
      <ImagePreviewModal
        isOpen={showImagePreview}
        onClose={handleClosePreview}
        images={generatedImages}
        onKeep={handleKeepImage}
        onDiscard={handleDiscardImage}
        isKeeping={addFileByUrlMutation.isPending}
      />
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <SheetTitle className="text-xl">AI Content Creation</SheetTitle>
              <SheetDescription>
                Generate professional content with AI-powered tools
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Creation Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            {creationTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;

              return (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? `bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-500 dark:border-blue-600 border-2`
                      : 'hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/50 dark:hover:from-blue-950/50 dark:hover:to-indigo-950/50 hover:border-primary/20'
                  }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-white dark:bg-gray-800' : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${isSelected ? type.color : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm mb-1">{type.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Wand2 className="h-5 w-5 text-primary animate-pulse" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Creating {selectedTypeInfo?.name}</div>
                    <div className="text-xs text-muted-foreground">{generationStatus}</div>
                  </div>
                </div>
                <Progress value={generationProgress} className="h-2" />
                <div className="text-xs text-muted-foreground mt-2">
                  {generationProgress}% complete
                </div>
              </CardContent>
            </Card>
          )}

          {/* Creation Interface */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                {selectedTypeInfo && <selectedTypeInfo.icon className={`h-5 w-5 ${selectedTypeInfo.color}`} />}
                {selectedTypeInfo?.name} Creator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedType === 'image' && (
                <ImageCreator
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                />
              )}

              {selectedType === 'audio' && (
                <AudioCreator
                  onCreate={handleGenerate}
                  isCreating={isGenerating}
                />
              )}

              {selectedType === 'video' && (
                <VideoCreator
                  onCreate={handleGenerate}
                  isCreating={isGenerating}
                />
              )}

              {selectedType === 'document' && (
                <DocumentCreator
                  onCreate={handleGenerate}
                  isCreating={isGenerating}
                />
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <h3 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">
                💡 AI Creation Tips
              </h3>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Be specific in your prompts for better results</li>
                <li>• Use templates as starting points for consistency</li>
                <li>• Generated content is automatically saved to your files</li>
                <li>• Higher quality settings use more credits but produce better results</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}

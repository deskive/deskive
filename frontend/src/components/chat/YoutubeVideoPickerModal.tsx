import React, { useState } from 'react';
import { Search, Play, X, ExternalLink, ThumbsUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import youtubeApi, { type YoutubeVideo } from '../../lib/api/youtube-api';
import { toast } from 'sonner';

interface YoutubeVideoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (videoUrl: string, videoData: any) => void;
}

export const YoutubeVideoPickerModal: React.FC<YoutubeVideoPickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const { currentWorkspace } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<YoutubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  React.useEffect(() => {
    if (isOpen && currentWorkspace) {
      checkConnection();
    }
  }, [isOpen, currentWorkspace]);

  const checkConnection = async () => {
    if (!currentWorkspace) return;

    try {
      setIsCheckingConnection(true);
      const status = await youtubeApi.getStatus(currentWorkspace.id);
      setIsConnected(status.connected);

      if (status.connected) {
        // Load initial videos (trending or recent)
        handleSearch('');
      }
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleConnect = async () => {
    if (!currentWorkspace) return;

    try {
      const { authUrl } = await youtubeApi.getAuthUrl(currentWorkspace.id, window.location.href);
      window.location.href = authUrl;
    } catch (error) {
      toast.error('Failed to connect YouTube');
    }
  };

  const handleSearch = async (query: string = searchQuery) => {
    if (!currentWorkspace) return;

    try {
      setIsSearching(true);
      const result = await youtubeApi.searchVideos(currentWorkspace.id, query, { limit: 12 });
      setVideos(result.items || []);
    } catch (error) {
      toast.error('Failed to search videos');
      setVideos([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectVideo = (video: YoutubeVideo) => {
    const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
    onSelect(videoUrl, {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails?.default?.url || video.snippet.thumbnails?.medium?.url,
      channelTitle: video.snippet.channelTitle,
    });
    onClose();
  };

  const formatViewCount = (count: string) => {
    const num = parseInt(count);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return count;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-red-600" />
            Share YouTube Video
          </DialogTitle>
        </DialogHeader>

        {isCheckingConnection ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : !isConnected ? (
          <div className="text-center py-12">
            <Play className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h3 className="text-lg font-semibold mb-2">Connect YouTube</h3>
            <p className="text-gray-600 mb-6">Connect your YouTube account to search and share videos in chat</p>
            <Button onClick={handleConnect} className="bg-red-600 hover:bg-red-700">
              Connect YouTube
            </Button>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="flex gap-2 pb-4 border-b">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search YouTube videos..."
                className="flex-1"
              />
              <Button onClick={() => handleSearch()} disabled={isSearching}>
                <Search className="w-4 h-4 mr-2" />
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            {/* Video Grid */}
            <div className="flex-1 overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No videos found. Try searching for something!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                  {videos.map((video) => (
                    <Card
                      key={video.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleSelectVideo(video)}
                    >
                      {/* Thumbnail */}
                      <div className="relative">
                        <img
                          src={video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url}
                          alt={video.snippet.title}
                          className="w-full h-32 object-cover rounded-t-lg"
                        />
                        <div className="absolute bottom-2 right-2">
                          <Badge className="bg-red-600 text-white">
                            <Play className="w-3 h-3" />
                          </Badge>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <h4 className="font-medium text-sm line-clamp-2 mb-1">{video.snippet.title}</h4>
                        <p className="text-xs text-gray-600 line-clamp-1">{video.snippet.channelTitle}</p>
                        {video.statistics && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <span>{formatViewCount(video.statistics.viewCount)} views</span>
                            {video.statistics.likeCount && (
                              <span className="flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3" />
                                {formatViewCount(video.statistics.likeCount)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

import { useState } from "react";
import { Link } from "wouter";
import {
  Plus,
  Settings2,
  Trash2,
  Edit,
  Tv,
  ChevronRight,
  Video as VideoIcon,
  GripVertical,
  Copy,
  Check,
  Info,
  ExternalLink,
  CloudDownload,
  Loader2,
  FileCheck,
  AlertTriangle,
  Clock
} from "lucide-react";
import { useChannels, useDeleteChannel } from "@/hooks/use-channels";
import { useDeleteVideo } from "@/hooks/use-videos";
import { ChannelForm } from "@/components/ChannelForm";
import { VideoForm } from "@/components/VideoForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { ChannelWithVideos, Video } from "@shared/schema";

export default function Admin() {
  const { data: channels, isLoading } = useChannels();
  const deleteChannel = useDeleteChannel();
  const deleteVideo = useDeleteVideo();
  const { toast } = useToast();

  const [selectedChannel, setSelectedChannel] = useState<ChannelWithVideos | null>(null);
  const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});

  // Dialog states
  const [isChannelFormOpen, setIsChannelFormOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelWithVideos | null>(null);

  const [isVideoFormOpen, setIsVideoFormOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const activeChannel = channels?.find(c => c.id === selectedChannel?.id) || channels?.[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(prev => ({ ...prev, [id]: true }));
    toast({
      title: "Copiado al portapapeles",
      description: `Enlace copiado: ${text}`,
    });
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const handleEditChannel = (channel: ChannelWithVideos) => {
    setEditingChannel(channel);
    setIsChannelFormOpen(true);
  };

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video);
    setIsVideoFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">

      {/* Left Sidebar - Channels */}
      <div className="w-full md:w-80 border-r border-white/5 bg-black/20 flex flex-col h-[40vh] md:h-screen shrink-0">
        <div className="p-6 border-b border-white/5 flex items-center justify-between glass-panel z-10 relative">
          <div>
            <h1 className="text-2xl font-display font-bold text-glow text-primary flex items-center gap-2">
              <Settings2 className="w-6 h-6" />
              Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage IPTV Channels</p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <Button
            onClick={() => { setEditingChannel(null); setIsChannelFormOpen(true); }}
            className="w-full bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/50 text-white transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> New Channel
          </Button>

          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary tracking-wider uppercase">Suscripción M3U</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-primary hover:bg-primary/10"
                onClick={() => handleCopy(`${window.location.origin}/api/m3u`, 'master')}
              >
                {copyStatus['master'] ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground break-all font-mono bg-black/40 p-1.5 rounded border border-white/5">
              {window.location.origin}/api/m3u
            </p>
          </div>

          <Link href="/" className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 border border-white/10 text-white hover:bg-white/5">
            <Tv className="w-4 h-4 mr-2 text-accent" /> Volver al Simulador
          </Link>
        </div>

        <ScrollArea className="flex-1 px-4 pb-4">
          <div className="space-y-2">
            {channels?.map(channel => (
              <div
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className={`
                  p-3 rounded-xl cursor-pointer transition-all duration-300 border flex items-center gap-3 group
                  ${activeChannel?.id === channel.id
                    ? 'bg-primary/10 border-primary/30 shadow-[0_0_15px_rgba(0,255,255,0.1)]'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'}
                `}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center shrink-0">
                  {channel.logoUrl ? (
                    <img src={channel.logoUrl} alt={channel.name} className="w-full h-full object-cover" />
                  ) : (
                    <Tv className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{channel.name}</h3>
                  <p className="text-xs text-muted-foreground">{channel.videos.length} videos</p>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${activeChannel?.id === channel.id ? 'text-primary translate-x-1' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`} />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content - Videos */}
      <div className="flex-1 flex flex-col h-[60vh] md:h-screen bg-gradient-to-br from-background to-black/40">
        {activeChannel ? (
          <>
            <div className="p-6 md:p-8 border-b border-white/5 flex flex-col gap-6 glass-panel z-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/50 border border-white/10 shadow-lg flex items-center justify-center">
                    {activeChannel.logoUrl ? (
                      <img src={activeChannel.logoUrl} alt={activeChannel.name} className="w-full h-full object-cover" />
                    ) : (
                      <Tv className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-3xl font-display font-bold">{activeChannel.name}</h2>
                    <p className="text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                      Channel ID: {activeChannel.id}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(`${window.location.origin}/api/channels/${activeChannel.id}/stream.ts`, `stream-${activeChannel.id}`)}
                    className="bg-primary/10 border-primary/30 hover:bg-primary/20 text-primary"
                  >
                    {copyStatus[`stream-${activeChannel.id}`] ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    Copia Stream .ts
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(window.location.origin, '_blank')}
                    className="bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" /> View Live
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditChannel(activeChannel)}
                    className="bg-white/5 border-white/10 hover:bg-white/10"
                  >
                    <Edit className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this channel?')) {
                        deleteChannel.mutate(activeChannel.id);
                        setSelectedChannel(null);
                      }
                    }}
                    className="bg-destructive/20 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>

              <Alert className="bg-primary/5 border-primary/20 text-primary-foreground">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary font-bold">Pro Tip: No Ads</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  To ensure a 100% ad-free experience without commercials or external content,
                  use <strong>direct video URLs</strong> (ending in .mp4, .m3u8, etc.) from private hosting
                  instead of platforms like YouTube or Dailymotion.
                </AlertDescription>
              </Alert>
            </div>

            <div className="p-6 md:p-8 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium flex items-center gap-2">
                  <VideoIcon className="w-5 h-5 text-accent" />
                  Playlist
                </h3>
                <Button
                  onClick={() => { setEditingVideo(null); setIsVideoFormOpen(true); }}
                  className="bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Video
                </Button>
              </div>

              <ScrollArea className="flex-1 -mx-4 px-4 custom-scrollbar">
                {activeChannel.videos.length === 0 ? (
                  <div className="h-40 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-muted-foreground">
                    <VideoIcon className="w-8 h-8 mb-2 opacity-50" />
                    <p>No videos in this channel yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-8">
                    {[...activeChannel.videos]
                      .sort((a, b) => a.order - b.order)
                      .map((video, idx) => (
                        <div
                          key={video.id}
                          className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all flex items-center gap-4 group hover:bg-white/10"
                        >
                          <div className="text-muted-foreground opacity-50 hidden sm:flex">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <div className="w-8 h-8 rounded bg-black/40 flex items-center justify-center text-xs font-mono border border-white/10 shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{video.title}</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground truncate max-w-md">{video.url}</p>
                              {video.downloadStatus === "downloading" && (
                                <span className="flex items-center gap-1 text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Descargando
                                </span>
                              )}
                              {video.downloadStatus === "completed" && (
                                <span className="flex items-center gap-1 text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">
                                  <FileCheck className="w-3 h-3" /> Local
                                </span>
                              )}
                              {video.downloadStatus === "failed" && (
                                <span className="flex items-center gap-1 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">
                                  <AlertTriangle className="w-3 h-3" /> Error
                                </span>
                              )}
                              {video.downloadStatus === "pending" && (
                                <span className="flex items-center gap-1 text-[10px] bg-white/5 text-muted-foreground px-1.5 py-0.5 rounded border border-white/10">
                                  <Clock className="w-3 h-3" /> Pendiente
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditVideo(video)}
                              className="h-8 w-8 hover:bg-white/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Delete this video?')) {
                                  deleteVideo.mutate(video.id);
                                }
                              }}
                              className="h-8 w-8 text-destructive hover:bg-destructive/20 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
            <div className="w-24 h-24 mb-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl">
              <Tv className="w-10 h-10 text-white/20" />
            </div>
            <h2 className="text-2xl font-display font-medium text-white/80 mb-2">No Channel Selected</h2>
            <p className="max-w-md">Select a channel from the sidebar to manage its programming, or create a new one to get started.</p>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <Dialog open={isChannelFormOpen} onOpenChange={setIsChannelFormOpen}>
        <DialogContent className="glass-panel border-white/10 text-foreground sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">
              {editingChannel ? 'Edit Channel' : 'New Channel'}
            </DialogTitle>
          </DialogHeader>
          <ChannelForm
            initialData={editingChannel || undefined}
            onSuccess={() => setIsChannelFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isVideoFormOpen} onOpenChange={setIsVideoFormOpen}>
        <DialogContent className="glass-panel border-white/10 text-foreground sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">
              {editingVideo ? 'Edit Video' : 'Add Video'}
            </DialogTitle>
          </DialogHeader>
          {activeChannel && (
            <VideoForm
              channelId={activeChannel.id}
              initialData={editingVideo || undefined}
              onSuccess={() => setIsVideoFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

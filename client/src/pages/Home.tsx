import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import ReactPlayer from "react-player";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Tv, 
  Settings, 
  Shuffle, 
  SkipForward, 
  ListVideo, 
  Power,
  VolumeX,
  Volume2
} from "lucide-react";
import { useChannels } from "@/hooks/use-channels";
import type { ChannelWithVideos, Video } from "@shared/schema";

export default function Home() {
  const { data: channels, isLoading } = useChannels();
  
  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  
  const [isShuffle, setIsShuffle] = useState(false);
  const [isEpgOpen, setIsEpgOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // UI auto-hide timeout
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeChannel = channels?.find(c => c.id === activeChannelId);
  
  // Sort videos by order
  const sortedVideos = activeChannel?.videos 
    ? [...activeChannel.videos].sort((a, b) => a.order - b.order) 
    : [];
    
  const activeVideo = sortedVideos[activeVideoIndex];

  // Initialize active channel on load
  useEffect(() => {
    if (channels?.length && !activeChannelId) {
      setActiveChannelId(channels[0].id);
      setActiveVideoIndex(0);
    }
  }, [channels, activeChannelId]);

  // Mouse move handler for controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (!isEpgOpen) setShowControls(false);
      }, 4000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isEpgOpen]);

  const handleVideoEnded = () => {
    if (!activeChannel || sortedVideos.length === 0) return;
    
    if (isShuffle) {
      const nextIndex = Math.floor(Math.random() * sortedVideos.length);
      setActiveVideoIndex(nextIndex);
    } else {
      setActiveVideoIndex((prev) => (prev + 1) % sortedVideos.length);
    }
  };

  const handleVideoError = () => {
    console.warn("Video failed to load. Skipping to next in 3 seconds...");
    setTimeout(() => {
      handleVideoEnded();
    }, 3000);
  };

  const switchChannel = (channelId: number) => {
    setActiveChannelId(channelId);
    setActiveVideoIndex(0);
  };

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-white/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!channels || channels.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
          <Tv className="w-32 h-32 text-primary relative z-10" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-4 text-glow text-center">NO SIGNAL</h1>
        <p className="text-white/60 mb-8 max-w-md text-center">The TV system is currently offline. Please access the studio dashboard to configure your channels and broadcast content.</p>
        <Link href="/admin" className="px-8 py-4 bg-primary text-black font-bold rounded-full hover:scale-105 transition-transform flex items-center gap-2 box-glow">
          <Settings className="w-5 h-5" /> Open Studio
        </Link>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative select-none">
      
      {/* Video Player Background */}
      <div className="absolute inset-0 pointer-events-none">
        {activeVideo && hasStarted ? (
          <ReactPlayer
            url={activeVideo.url}
            playing={true}
            muted={isMuted}
            controls={false}
            width="100%"
            height="100%"
            onEnded={handleVideoEnded}
            onError={handleVideoError}
            config={{
              youtube: { playerVars: { origin: window.location.origin } }
            }}
            style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
          />
        ) : (
          <div className="w-full h-full bg-black flex items-center justify-center">
            {!hasStarted ? (
              <Button 
                onClick={() => setHasStarted(true)}
                className="w-32 h-32 rounded-full bg-primary/20 hover:bg-primary border border-primary/50 text-white flex flex-col items-center justify-center transition-all duration-500 box-glow group pointer-events-auto"
              >
                <Power className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-display font-bold">POWER</span>
              </Button>
            ) : (
              <div className="text-white/20 animate-pulse font-mono tracking-widest">NO VIDEO SOURCE</div>
            )}
          </div>
        )}
      </div>

      {/* Vignette overlay for depth */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/80 z-0"></div>

      {/* Top Controls UI */}
      <AnimatePresence>
        {showControls && hasStarted && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 bg-gradient-to-b from-black/80 to-transparent"
          >
            {/* Channel Info Bug */}
            <div className="flex items-center gap-4 glass-panel rounded-2xl p-3 pr-6 pointer-events-auto">
              <div className="w-14 h-14 rounded-xl bg-black border border-white/20 flex items-center justify-center overflow-hidden">
                {activeChannel?.logoUrl ? (
                  <img src={activeChannel.logoUrl} alt={activeChannel.name} className="w-full h-full object-cover" />
                ) : (
                  <Tv className="w-6 h-6 text-white/50" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-white text-glow">{activeChannel?.name || "Loading..."}</h2>
                <p className="text-xs text-white/60 truncate max-w-[200px]">{activeVideo?.title || "No current program"}</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 pointer-events-auto">
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="w-12 h-12 rounded-xl glass-button flex items-center justify-center"
              >
                {isMuted ? <VolumeX className="w-5 h-5 text-destructive" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button 
                onClick={() => setIsShuffle(!isShuffle)}
                className={`w-12 h-12 rounded-xl glass-button flex items-center justify-center transition-all ${isShuffle ? 'bg-primary/20 text-primary border-primary/50 box-glow' : ''}`}
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <button 
                onClick={handleVideoEnded}
                className="w-12 h-12 rounded-xl glass-button flex items-center justify-center"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <Link href="/admin" className="w-12 h-12 rounded-xl glass-button flex items-center justify-center ml-2 border-accent/30 text-accent hover:bg-accent/20">
                <Settings className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom EPG Trigger */}
      <AnimatePresence>
        {showControls && hasStarted && !isEpgOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
          >
            <Button 
              onClick={() => setIsEpgOpen(true)}
              className="bg-black/60 backdrop-blur-xl border border-white/20 text-white hover:bg-white/10 hover:border-white/40 rounded-full px-8 py-6 shadow-2xl transition-all"
            >
              <ListVideo className="w-5 h-5 mr-3" />
              <span className="font-display font-medium tracking-wide">TV GUIDE</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EPG Overlay (Bottom Drawer) */}
      <AnimatePresence>
        {isEpgOpen && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 h-[45vh] bg-black/80 backdrop-blur-2xl border-t border-white/10 z-30 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.5)] pointer-events-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <ListVideo className="w-5 h-5 text-primary" /> Guide
              </h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEpgOpen(false)}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                Close
              </Button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Channel List (Vertical) */}
              <div className="w-64 border-r border-white/10 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {channels.map(channel => (
                  <button
                    key={channel.id}
                    onClick={() => switchChannel(channel.id)}
                    className={`
                      w-full p-3 flex items-center gap-3 rounded-xl transition-all text-left
                      ${activeChannelId === channel.id 
                        ? 'bg-primary border border-primary text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]' 
                        : 'bg-transparent border border-transparent text-white/70 hover:bg-white/10 hover:text-white'}
                    `}
                  >
                    <div className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center ${activeChannelId === channel.id ? 'bg-black/20' : 'bg-black/50 border border-white/10'}`}>
                       {channel.logoUrl ? (
                        <img src={channel.logoUrl} alt={channel.name} className="w-full h-full object-cover" />
                      ) : (
                        <Tv className="w-5 h-5" />
                      )}
                    </div>
                    <span className="font-semibold truncate">{channel.name}</span>
                  </button>
                ))}
              </div>

              {/* Video List for Selected Channel (Horizontal Grid) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {sortedVideos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {sortedVideos.map((video, idx) => {
                      const isPlaying = activeVideoIndex === idx;
                      return (
                        <button
                          key={video.id}
                          onClick={() => {
                            setActiveVideoIndex(idx);
                            setIsEpgOpen(false); // Auto close EPG on selection
                          }}
                          className={`
                            group text-left rounded-2xl overflow-hidden border transition-all aspect-video relative flex flex-col justify-end p-4
                            ${isPlaying 
                              ? 'border-accent bg-accent/20 shadow-[0_0_20px_rgba(150,50,255,0.2)]' 
                              : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30'}
                          `}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-0"></div>
                          
                          {isPlaying && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce"></span>
                              <span className="w-1.5 h-3 bg-accent rounded-full animate-pulse delay-75"></span>
                              <span className="w-1.5 h-2 bg-accent rounded-full animate-pulse delay-150"></span>
                            </div>
                          )}

                          <div className="relative z-10">
                            <span className="text-xs font-mono text-white/50 block mb-1">CH {idx + 1}</span>
                            <h4 className={`font-medium line-clamp-2 ${isPlaying ? 'text-white' : 'text-white/80 group-hover:text-white'}`}>
                              {video.title}
                            </h4>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-white/30">
                    <ListVideo className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg">No programming available</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

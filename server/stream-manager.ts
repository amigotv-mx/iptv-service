import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import type { Response } from "express";
import { log } from "./index";
import { storage } from "./storage";
import { execSync } from "child_process";

interface StreamInstance {
    process: ChildProcessWithoutNullStreams;
    subscribers: Set<Response>;
    channelId: number;
    lastActivity: number;
    bufferCache: Buffer[];
    bufferCacheSize: number;
}

interface CachedUrl {
    url: string;
    expiry: number;
}

class StreamManager {
    private instances: Map<number, StreamInstance> = new Map();
    private pendingInstances: Map<number, Promise<StreamInstance | null>> = new Map();
    private urlCache: Map<number, CachedUrl> = new Map();
    private shutdownTimeout = 30000; // 30 seconds grace period
    private maxCacheSizeBytes = 5 * 1024 * 1024; // 5MB cache per stream (~5-10s)

    async subscribe(channelId: number, res: Response) {
        let instance = this.instances.get(channelId);

        if (!instance) {
            // Check if there's already a pending start for this channel
            let pending = this.pendingInstances.get(channelId);
            if (!pending) {
                log(`Starting new stream instance for channel ${channelId}`, "stream-manager");
                pending = this.startInstance(channelId);
                this.pendingInstances.set(channelId, pending);
            }

            const newInstance = await pending;
            this.pendingInstances.delete(channelId);

            if (!newInstance) {
                res.status(500).send("Failed to start stream");
                return;
            }
            instance = newInstance;
            this.instances.set(channelId, instance);
        }

        // Set headers for MPEG-TS
        res.setHeader("Content-Type", "video/mp2t");

        // Instant Start: Send cached buffer first
        if (instance.bufferCache.length > 0) {
            log(`Channel ${channelId}: Serving ${Math.round(instance.bufferCacheSize / 1024)}KB from cache for new subscriber`, "stream-manager");
            for (const chunk of instance.bufferCache) {
                res.write(chunk);
            }
        }

        instance.subscribers.add(res);
        instance.lastActivity = Date.now();

        log(`Channel ${channelId}: New subscriber added. Total: ${instance.subscribers.size}`, "stream-manager");

        res.on("close", () => {
            if (instance) {
                instance.subscribers.delete(res);
                log(`Channel ${channelId}: Subscriber left. Total: ${instance.subscribers.size}`, "stream-manager");

                if (instance.subscribers.size === 0) {
                    this.planShutdown(channelId);
                }
            }
        });
    }

    private async startInstance(channelId: number): Promise<StreamInstance | null> {
        const channels = await storage.getChannels();
        const channel = channels.find(c => c.id === channelId);

        if (!channel || channel.videos.length === 0) {
            return null;
        }

        // Live Logic (copied from routes.ts)
        const videoDurationMinutes = 10;
        const now = Math.floor(Date.now() / (1000 * 60 * videoDurationMinutes));
        const activeIndex = now % channel.videos.length;
        const activeVideo = channel.videos[activeIndex];

        let streamUrl = activeVideo.url;
        if (activeVideo.downloadStatus === "completed" && activeVideo.localPath) {
            streamUrl = activeVideo.localPath;
        } else if (streamUrl.includes("youtube.com") || streamUrl.includes("youtu.be")) {
            // Check URL Cache
            const cached = this.urlCache.get(activeVideo.id);
            if (cached && cached.expiry > Date.now()) {
                log(`Using cached URL for video ${activeVideo.id}`, "stream-manager");
                streamUrl = cached.url;
            } else {
                try {
                    log(`Resolving URL for video ${activeVideo.id} with yt-dlp...`, "stream-manager");
                    const resolvedUrl = execSync(`yt-dlp -g "${streamUrl}" | head -n 1`, { encoding: 'utf8' }).trim();
                    if (resolvedUrl) {
                        streamUrl = resolvedUrl;
                        // Cache for 1 hour
                        this.urlCache.set(activeVideo.id, {
                            url: streamUrl,
                            expiry: Date.now() + 60 * 60 * 1000
                        });
                    }
                } catch (e) {
                    log(`Failed to resolve YouTube URL for channel ${channelId}: ${e}`, "stream-manager");
                }
            }
        }

        // Tuned FFmpeg command:
        // -g 30: Frequent keyframes for faster player sync
        // -preset ultrafast -tune zerolatency: minimize delay
        const ffmpeg = spawn("ffmpeg", [
            "-re",
            "-i", streamUrl,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
            "-g", "30",
            "-c:a", "aac",
            "-ar", "44100",
            "-f", "mpegts",
            "pipe:1"
        ]);

        const instance: StreamInstance = {
            process: ffmpeg,
            subscribers: new Set(),
            channelId,
            lastActivity: Date.now(),
            bufferCache: [],
            bufferCacheSize: 0
        };

        ffmpeg.stdout.on("data", (chunk: Buffer) => {
            // Add to circular buffer cache
            instance.bufferCache.push(chunk);
            instance.bufferCacheSize += chunk.length;

            // Maintain cache size limit
            while (instance.bufferCacheSize > this.maxCacheSizeBytes && instance.bufferCache.length > 1) {
                const removed = instance.bufferCache.shift();
                if (removed) instance.bufferCacheSize -= removed.length;
            }

            instance.subscribers.forEach(res => {
                try {
                    res.write(chunk);
                } catch (e) {
                    // Subscriber likely disconnected but event hasn't fired yet
                }
            });
        });

        ffmpeg.on("close", (code) => {
            log(`FFmpeg process for channel ${channelId} exited with code ${code}`, "stream-manager");
            this.instances.delete(channelId);
            instance.subscribers.forEach(res => res.end());
            instance.subscribers.clear();
            instance.bufferCache = [];
            instance.bufferCacheSize = 0;
        });

        return instance;
    }

    private planShutdown(channelId: number) {
        setTimeout(() => {
            const instance = this.instances.get(channelId);
            if (instance && instance.subscribers.size === 0) {
                log(`Shutting down idle stream for channel ${channelId}`, "stream-manager");
                instance.process.kill("SIGKILL");
                this.instances.delete(channelId);
            }
        }, this.shutdownTimeout);
    }

    shutdownAll() {
        log("Shutting down all active streams", "stream-manager");
        this.instances.forEach(instance => {
            instance.process.kill("SIGKILL");
        });
        this.instances.clear();
    }
}

export const streamManager = new StreamManager();

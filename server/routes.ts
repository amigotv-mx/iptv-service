import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { downloadVideo } from "./downloader";
import { streamManager } from "./stream-manager";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.channels.list.path, async (req, res) => {
    const channels = await storage.getChannels();
    res.json(channels);
  });

  app.post(api.channels.create.path, async (req, res) => {
    try {
      const input = api.channels.create.input.parse(req.body);
      const channel = await storage.createChannel(input);
      res.status(201).json(channel);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.channels.update.path, async (req, res) => {
    try {
      const input = api.channels.update.input.parse(req.body);
      const id = Number(req.params.id);
      const channel = await storage.updateChannel(id, input);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }
      res.status(200).json(channel);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.channels.delete.path, async (req, res) => {
    await storage.deleteChannel(Number(req.params.id));
    res.status(204).end();
  });

  app.post(api.videos.create.path, async (req, res) => {
    try {
      const input = api.videos.create.input.parse(req.body);
      const video = await storage.createVideo(input);
      // Trigger background download
      downloadVideo(video.id, video.url);
      res.status(201).json(video);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.videos.update.path, async (req, res) => {
    try {
      const input = api.videos.update.input.parse(req.body);
      const id = Number(req.params.id);
      const video = await storage.updateVideo(id, input);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      res.status(200).json(video);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.videos.delete.path, async (req, res) => {
    await storage.deleteVideo(Number(req.params.id));
    res.status(204).end();
  });

  // Master M3U Endpoint (Pointing to .ts streams)
  app.get("/api/m3u", async (req, res) => {
    const channels = await storage.getChannels();
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;

    let m3u = "#EXTM3U\n";
    for (const channel of channels) {
      m3u += `#EXTINF:-1 tvg-id=\"channel-${channel.id}\" tvg-logo=\"${channel.logoUrl}\",${channel.name}\n`;
      m3u += `${baseUrl}/api/channels/${channel.id}/stream.ts\n`;
    }

    res.setHeader("Content-Type", "application/x-mpegurl");
    res.setHeader("Content-Disposition", 'attachment; filename="playlist.m3u"');
    res.send(m3u);
  });

  // Direct MPEG-TS Stream endpoint using FFmpeg
  app.get("/api/channels/:id/stream.ts", async (req, res) => {
    const id = Number(req.params.id);
    await streamManager.subscribe(id, res);
  });

  // Static M3U for a channel (Playlist of original URLs)
  app.get("/api/channels/:id/m3u", async (req, res) => {
    const id = Number(req.params.id);
    const channels = await storage.getChannels();
    const channel = channels.find(c => c.id === id);

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    let m3u = "#EXTM3U\n";
    for (const video of channel.videos) {
      m3u += `#EXTINF:-1,${video.title}\n`;
      m3u += `${video.url}\n`;
    }

    res.setHeader("Content-Type", "application/x-mpegurl");
    res.setHeader("Content-Disposition", `attachment; filename="channel-${id}.m3u"`);
    res.send(m3u);
  });

  // Seed data function to populate with example IPTV channels on startup
  // We don't call it here directly to avoid initialization issues if registerRoutes is called early
  // Instead, it's better to call it from index.ts after everything is registered.
  // seedDatabase().catch(console.error);

  return httpServer;
}

export async function seedDatabase() {
  try {
    const existingChannels = await storage.getChannels();
    if (existingChannels.length === 0) {
      // Seed Movie Channel
      const movieChannel = await storage.createChannel({
        name: "Classic Movies TV",
        logoUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=200&h=200&fit=crop",
      });

      await storage.createVideo({
        channelId: movieChannel.id,
        title: "Big Buck Bunny",
        url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        order: 0,
      });

      await storage.createVideo({
        channelId: movieChannel.id,
        title: "Elephants Dream",
        url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        order: 1,
      });

      // Seed Music Channel
      const musicChannel = await storage.createChannel({
        name: "Music Hits VEVO",
        logoUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&h=200&fit=crop",
      });

      await storage.createVideo({
        channelId: musicChannel.id,
        title: "Big Buck Bunny (Direct)",
        url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        order: 0,
      });

      await storage.createVideo({
        channelId: musicChannel.id,
        title: "Elephants Dream (Direct)",
        url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        order: 1,
      });
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

import { db } from "./db";
import {
  channels,
  videos,
  type InsertChannel,
  type InsertVideo,
  type Channel,
  type Video,
  type ChannelWithVideos,
  type UpdateChannelRequest,
  type UpdateVideoRequest
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { deleteLocalVideo } from "./downloader";

export interface IStorage {
  getChannels(): Promise<ChannelWithVideos[]>;
  createChannel(channel: InsertChannel): Promise<Channel>;
  updateChannel(id: number, updates: UpdateChannelRequest): Promise<Channel>;
  deleteChannel(id: number): Promise<void>;

  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, updates: UpdateVideoRequest): Promise<Video>;
  deleteVideo(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getChannels(): Promise<ChannelWithVideos[]> {
    const allChannels = await db.select().from(channels);
    const allVideos = await db.select().from(videos);

    return allChannels.map(channel => ({
      ...channel,
      videos: allVideos.filter(v => v.channelId === channel.id).sort((a, b) => a.order - b.order)
    }));
  }

  async createChannel(channel: InsertChannel): Promise<Channel> {
    const [newChannel] = await db.insert(channels).values(channel).returning();
    return newChannel;
  }

  async updateChannel(id: number, updates: UpdateChannelRequest): Promise<Channel> {
    const [updatedChannel] = await db.update(channels)
      .set(updates)
      .where(eq(channels.id, id))
      .returning();
    return updatedChannel;
  }

  async deleteChannel(id: number): Promise<void> {
    const channelVideos = await db.select().from(videos).where(eq(videos.channelId, id));
    for (const video of channelVideos) {
      if (video.localPath) {
        deleteLocalVideo(video.localPath);
      }
    }
    await db.delete(videos).where(eq(videos.channelId, id));
    await db.delete(channels).where(eq(channels.id, id));
  }

  async createVideo(video: InsertVideo): Promise<Video> {
    const [newVideo] = await db.insert(videos).values(video).returning();
    return newVideo;
  }

  async updateVideo(id: number, updates: UpdateVideoRequest): Promise<Video> {
    const [updatedVideo] = await db.update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();
    return updatedVideo;
  }

  async deleteVideo(id: number): Promise<void> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    if (video?.localPath) {
      deleteLocalVideo(video.localPath);
    }
    await db.delete(videos).where(eq(videos.id, id));
  }
}

export const storage = new DatabaseStorage();

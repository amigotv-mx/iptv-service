import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logoUrl: text("logo_url").notNull(),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  localPath: text("local_path"),
  downloadStatus: text("download_status").notNull().default("pending"),
  order: integer("order").notNull().default(0),
});

export const channelsRelations = relations(channels, ({ many }) => ({
  videos: many(videos),
}));

export const videosRelations = relations(videos, ({ one }) => ({
  channel: one(channels, {
    fields: [videos.channelId],
    references: [channels.id],
  }),
}));

export const insertChannelSchema = createInsertSchema(channels).omit({ id: true });
export const insertVideoSchema = createInsertSchema(videos).omit({ id: true });

export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;

export type ChannelWithVideos = Channel & { videos: Video[] };

export type CreateChannelRequest = InsertChannel;
export type UpdateChannelRequest = Partial<InsertChannel>;
export type CreateVideoRequest = InsertVideo;
export type UpdateVideoRequest = Partial<InsertVideo>;
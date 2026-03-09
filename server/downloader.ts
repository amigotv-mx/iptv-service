import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { log } from "./index";

const DOWNLOAD_DIR = path.join(process.cwd(), "storage", "downloads");

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

export async function downloadVideo(videoId: number, url: string) {
    try {
        log(`Starting download for video ${videoId}: ${url}`, "downloader");
        await storage.updateVideo(videoId, { downloadStatus: "downloading" });

        const fileName = `video-${videoId}.mp4`;
        const outputPath = path.join(DOWNLOAD_DIR, fileName);

        // Use yt-dlp to download the video
        // -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ensures we get mp4 if possible
        const downloader = spawn("yt-dlp", [
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "-o", outputPath,
            url
        ]);

        downloader.stderr.on("data", (data) => {
            // Just log errors for debugging
            // console.error(`[downloader] yt-dlp stderr: ${data}`);
        });

        downloader.on("close", async (code) => {
            if (code === 0 && fs.existsSync(outputPath)) {
                log(`Download completed for video ${videoId}`, "downloader");
                await storage.updateVideo(videoId, {
                    downloadStatus: "completed",
                    localPath: outputPath
                });
            } else {
                log(`Download failed for video ${videoId} with code ${code}`, "downloader");
                await storage.updateVideo(videoId, { downloadStatus: "failed" });
            }
        });

    } catch (error) {
        log(`Error in downloadVideo for ${videoId}: ${error}`, "downloader");
        await storage.updateVideo(videoId, { downloadStatus: "failed" });
    }
}

export function deleteLocalVideo(localPath: string) {
    if (localPath && fs.existsSync(localPath)) {
        try {
            fs.unlinkSync(localPath);
            log(`Deleted local file: ${localPath}`, "downloader");
        } catch (e) {
            log(`Failed to delete local file ${localPath}: ${e}`, "downloader");
        }
    }
}

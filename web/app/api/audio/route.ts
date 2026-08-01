/**
 * @purpose Gestiona solicitudes GET para obtener metadata de audio asociadas a un ID específico de instrumento, filtrando y analizando formatos de archivo utilizando la biblioteca music-metadata.
 * @purpose_en Manages GET requests to retrieve metadata for audio tracks associated with a specific instrument ID, filtering and analyzing file formats using the music-metadata library.
 * @refactorable false
 * @classification Business Service
 * @complexity Medium
 * @fingerprint exports:1,imports:4,sig:1d2fgwu
 * @lastUpdated 2026-06-15T17:04:00.763Z
 */

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import * as musicMetadata from "music-metadata";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const instrumentId = searchParams.get("id");

  if (!instrumentId) {
    return NextResponse.json({ error: "Missing instrument ID" }, { status: 400 });
  }

  if (!/^[\w-]+$/.test(instrumentId)) {
    return NextResponse.json({ error: "Invalid instrument ID" }, { status: 400 });
  }

  const audioDir = path.join(process.cwd(), "public", "audio", instrumentId);

  try {
    if (!fs.existsSync(audioDir)) {
      return NextResponse.json({ tracks: [] });
    }

    const files = fs.readdirSync(audioDir).filter((file) => 
      [".mp3", ".wav", ".aac", ".m4a", ".ogg"].some(ext => file.toLowerCase().endsWith(ext))
    );

    const tracks = await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(audioDir, file);
        let metadata = null;
        let cover = null;

        try {
          metadata = await musicMetadata.parseFile(filePath);
          
          // Extract cover art if available
          if (metadata.common.picture && metadata.common.picture.length > 0) {
            const pic = metadata.common.picture[0];
            cover = `data:${pic.format};base64,${Buffer.from(pic.data).toString('base64')}`;
          }
        } catch (e) {
          console.error(`Error parsing metadata for ${file}:`, e);
        }

        return {
          name: metadata?.common.title || file.replace(/\.[^/.]+$/, "").replace(/_/g, " ").toUpperCase(),
          url: `/audio/${instrumentId}/${file}`,
          artist: metadata?.common.artist || "Unknown Artist",
          album: metadata?.common.album || "Unknown Album",
          duration: metadata?.format.duration || 0,
          sampleRate: metadata?.format.sampleRate ? `${(metadata.format.sampleRate / 1000).toFixed(1)} kHz` : "N/A",
          bitrate: metadata?.format.bitrate ? `${Math.round(metadata.format.bitrate / 1000)} kbps` : "N/A",
          channels: metadata?.format.numberOfChannels === 2 ? "Stereo" : "Mono",
          format: metadata?.format.container || "Unknown",
          cover: cover
        };
      })
    );

    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Error reading audio directory:", error);
    return NextResponse.json({ tracks: [] });
  }
}

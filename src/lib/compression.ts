/**
 * Response Compression Middleware
 * 
 * Adds gzip/brotli compression to API responses for better performance.
 * For Next.js, this is handled by the framework, but we can add
 * manual compression for streaming responses.
 */

import { NextRequest, NextResponse } from "next/server";

// Check if client accepts compression
export function acceptsCompression(req: NextRequest): "gzip" | "br" | "deflate" | null {
  const acceptEncoding = req.headers.get("accept-encoding") || "";
  
  if (acceptEncoding.includes("br")) return "br";
  if (acceptEncoding.includes("gzip")) return "gzip";
  if (acceptEncoding.includes("deflate")) return "deflate";
  
  return null;
}

// Add compression headers to response
export function addCompressionHeaders(
  response: NextResponse,
  encoding: "gzip" | "br" | "deflate"
): NextResponse {
  response.headers.set("Content-Encoding", encoding);
  response.headers.set("Vary", "Accept-Encoding");
  return response;
}

/**
 * For streaming responses (SSE), compression is handled by the framework.
 * This utility helps track compressed bytes for monitoring.
 */
export class CompressionTracker {
  private originalSize = 0;
  private compressedSize = 0;

  trackWrite(chunk: string | Uint8Array) {
    this.originalSize += typeof chunk === "string" ? chunk.length : chunk.length;
  }

  trackCompressed(bytes: number) {
    this.compressedSize += bytes;
  }

  getStats() {
    const ratio = this.originalSize > 0 
      ? ((1 - this.compressedSize / this.originalSize) * 100).toFixed(1)
      : "0";
    
    return {
      originalBytes: this.originalSize,
      compressedBytes: this.compressedSize,
      compressionRatio: `${ratio}%`,
    };
  }
}

export interface PinImageVariants {
  small: string | null;
  medium: string | null;
  large: string | null;
  original: string | null;
}

export interface VideoQualityDetail {
  url: string;
  width: number;
  height: number;
  duration: number;
  thumbnail?: string;
}

export interface PinVideoVariants {
  low?: VideoQualityDetail;
  medium?: VideoQualityDetail;
  high?: VideoQualityDetail;
  [key: string]: VideoQualityDetail | undefined;
}

export interface PinAuthor {
  username: string;
  fullName: string;
  profileUrl: string;
  avatarUrl?: string;
}

export interface PinBoard {
  id?: string;
  name: string;
  url: string;
}

export interface PinMetadata {
  pinner: PinAuthor;
  board: PinBoard;
  saves: number;
  comments: number;
  domain?: string;
  createdAt?: string;
  dominantColor?: string;
}

export interface Pin {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video';
  link: string;
  images: PinImageVariants;
  videos?: PinVideoVariants;
  metadata: PinMetadata;
}

export interface SearchOptions {
  limit?: number;
  type?: 'all' | 'images' | 'videos';
  scope?: 'pins' | 'boards' | 'videos';
  bookmark?: string | null;
}

export interface SearchResult {
  pins: Pin[];
  bookmark: string | null;
}

export interface DownloadOptions {
  quality?: 'original' | 'high' | 'medium' | 'low';
  preferType?: 'auto' | 'image' | 'video';
  overwrite?: boolean;
  filename?: string;
  outputDir?: string;
  output?: string;
  onProgress?: (downloadedBytes: number, totalBytes: number) => void;
}

export interface DownloadResult {
  path: string;
  size: number;
  sizeFormatted: string;
  type: 'image' | 'video';
  url: string;
  filename: string;
}

/**
 * Search Pinterest for pins matching a search query.
 */
export function search(query: string, options?: SearchOptions): Promise<SearchResult>;

/**
 * Fetch detailed metadata for a pin using its URL, short URL (pin.it), or ID.
 */
export function getPin(urlOrId: string): Promise<Pin>;

/**
 * Download pin media (image or video) directly to disk.
 */
export function download(
  url: string,
  outputDir?: string | DownloadOptions,
  options?: DownloadOptions
): Promise<DownloadResult>;

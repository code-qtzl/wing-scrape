import Parser from 'rss-parser';
import chalk from 'chalk';

// Brand colors (matching hot-ones-scraper.ts)
const colors = {
	black: '#000000',
	white: '#FFFFFF',
	yellow: '#FED204',
	red: '#DA1F27',
};

const brand = {
	title: chalk.hex(colors.red).bold,
	highlight: chalk.hex(colors.yellow).bold,
	success: chalk.hex(colors.yellow),
	error: chalk.hex(colors.red),
	info: chalk.hex(colors.white),
	dim: chalk.hex(colors.white).dim,
};

export interface YouTubeVideoData {
	title: string;
	youtube_url: string;
	video_id: string;
	published_date: string;
	description: string;
	view_count: number;
	duration?: string;
}

interface CustomRSSItem {
	title: string;
	link: string;
	pubDate: string;
	contentSnippet?: string;
	'yt:videoId'?: string;
	'media:group'?: {
		'media:description'?: string;
		'media:community'?: {
			'media:statistics'?: {
				$: {
					views: string;
				};
			};
		};
	};
}

export class YouTubeRSSEnhancer {
	private rssUrl =
		'https://www.youtube.com/feeds/videos.xml?channel_id=UCPD_bxCRGpmmeQcbe2kpPaA'; // Hot Ones channel
	private parser: Parser<any, CustomRSSItem>;

	constructor() {
		this.parser = new Parser({
			customFields: {
				item: [
					['yt:videoId', 'videoId'],
					['media:group', 'mediaGroup'],
					['media:community', 'community'],
				],
			},
		});
	}

	async fetchYouTubeData(): Promise<Map<string, YouTubeVideoData>> {
		console.log(brand.info('📺 Fetching Hot Ones YouTube RSS feed...'));

		try {
			const feed = await this.parser.parseURL(this.rssUrl);
			const videoMap = new Map<string, YouTubeVideoData>();

			console.log(
				brand.dim(`Found ${feed.items.length} videos in RSS feed`),
			);

			for (const item of feed.items) {
				const videoData = this.parseVideoItem(item);
				if (videoData) {
					// Create multiple keys for matching episodes to YouTube videos
					const keys = this.generateMatchingKeys(videoData.title);
					keys.forEach((key) => {
						if (!videoMap.has(key)) {
							// Don't overwrite existing matches
							videoMap.set(key, videoData);
						}
					});
				}
			}

			console.log(
				brand.success(
					`✅ Processed ${videoMap.size} unique video entries`,
				),
			);
			return videoMap;
		} catch (error) {
			console.error(brand.error('❌ Error fetching YouTube RSS:'), error);
			return new Map();
		}
	}

	private parseVideoItem(item: CustomRSSItem): YouTubeVideoData | null {
		try {
			// Extract video ID from the link or custom field
			const videoId =
				this.extractVideoId(item.link) || item['yt:videoId'] || '';

			// Get view count from media:community if available
			let viewCount = 0;
			if (
				item['media:group']?.['media:community']?.['media:statistics']
					?.$?.views
			) {
				viewCount = parseInt(
					item['media:group']['media:community']['media:statistics'].$
						.views,
					10,
				);
			}

			// Get description
			const description =
				item['media:group']?.['media:description'] ||
				item.contentSnippet ||
				'';

			return {
				title: item.title,
				youtube_url: item.link,
				video_id: videoId,
				published_date: new Date(item.pubDate)
					.toISOString()
					.split('T')[0],
				description,
				view_count: viewCount,
			};
		} catch (error) {
			console.warn(
				brand.dim(`Failed to parse video item: ${item.title}`),
				error,
			);
			return null;
		}
	}

	private extractVideoId(url: string): string {
		const match = url.match(/[?&]v=([^&]+)/);
		return match ? match[1] : '';
	}

	private generateMatchingKeys(title: string): string[] {
		const keys = [];
		const normalized = title.toLowerCase().trim();

		// Add the full title
		keys.push(normalized);

		// Remove "Hot Ones" prefix variations
		const hotOnesVariations = [
			/^hot ones[:\-\s]*(.+)/i,
			/^first we feast[:\-\s]*(.+)/i,
		];

		for (const regex of hotOnesVariations) {
			const match = normalized.match(regex);
			if (match && match[1]) {
				keys.push(match[1].trim());
			}
		}

		// Extract guest name patterns (before | or – separators)
		const separators = ['|', '–', '-', ':', 'eats'];
		for (const sep of separators) {
			const parts = normalized.split(sep);
			if (parts.length > 1) {
				const guestPart = parts[0].trim();
				if (guestPart && guestPart !== normalized) {
					keys.push(guestPart);
				}
			}
		}

		// Remove common words and clean up
		const cleanedKeys = keys
			.map((key) =>
				key
					.replace(
						/\b(the|a|an|and|or|but|with|hot ones|first we feast)\b/gi,
						'',
					)
					.replace(/\s+/g, ' ')
					.trim(),
			)
			.filter((key) => key.length > 2); // Only keep meaningful keys

		return [...new Set([...keys, ...cleanedKeys])]; // Remove duplicates
	}

	/**
	 * Generate a YouTube search URL for episodes not found in RSS feed
	 */
	generateYouTubeSearchUrl(
		episodeTitle: string,
		seasonNumber?: number,
		episodeNumber?: number,
	): string {
		// Create a comprehensive search query
		let searchTerms = [];

		// Add the main title (cleaned up)
		const cleanTitle = episodeTitle
			.replace(/^hot ones[:\-\s]*/i, '') // Remove "Hot Ones" prefix
			.replace(/\s*\|\s*.*$/, '') // Remove everything after | separator
			.replace(/\s*–\s*.*$/, '') // Remove everything after – separator
			.replace(/\s*-\s*.*$/, '') // Remove everything after - separator
			.trim();

		if (cleanTitle) {
			searchTerms.push(`"${cleanTitle}"`);
		}

		// Add Hot Ones branding
		searchTerms.push('Hot Ones');

		// Add season/episode if available
		if (seasonNumber && episodeNumber) {
			searchTerms.push(`season ${seasonNumber}`);
			searchTerms.push(`episode ${episodeNumber}`);
		}

		// Add "spicy wings" to help narrow it down
		searchTerms.push('spicy wings');

		const query = encodeURIComponent(searchTerms.join(' '));
		return `https://www.youtube.com/results?search_query=${query}`;
	}

	/**
	 * Generate a direct YouTube video URL attempt based on common patterns
	 */
	generatePotentialYouTubeUrls(
		episodeTitle: string,
		seasonNumber?: number,
		episodeNumber?: number,
	): string[] {
		const urls = [];

		// Try common URL patterns that Hot Ones might use
		const cleanTitle = episodeTitle
			.replace(/^hot ones[:\-\s]*/i, '')
			.replace(/[^a-zA-Z0-9\s]/g, '')
			.replace(/\s+/g, '-')
			.toLowerCase();

		// These are potential patterns - in a real implementation you might
		// analyze existing Hot Ones URLs to find the actual pattern
		if (seasonNumber && episodeNumber) {
			urls.push(
				`https://www.youtube.com/watch?v=hot-ones-s${seasonNumber}e${episodeNumber}-${cleanTitle}`,
			);
		}

		return urls;
	}

	// Helper method to get video statistics separately if needed
	async getVideoStats(
		videoId: string,
	): Promise<{ views: number; likes?: number } | null> {
		// This would require YouTube Data API v3 key for more detailed stats
		// For now, we rely on what's available in the RSS feed
		return null;
	}
}

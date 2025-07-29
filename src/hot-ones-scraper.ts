import { JSDOM } from 'jsdom';
import { HotOnesEpisode, EpisodeTag, PROFESSION_TAXONOMY } from './types';

export class HotOnesScraper {
	private baseURL = 'https://thetvdb.com/series/hot-ones/allseasons/official';

	async scrapeAllEpisodes(): Promise<HotOnesEpisode[]> {
		// Add cache-busting parameter
		const cacheBustingUrl = `${this.baseURL}?t=${Date.now()}`;
		console.log(`🔥 Scraping Hot Ones episodes from: ${this.baseURL}`);
		
		try {
			console.log('📡 Fetching page...');
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 15000);
			
			const response = await fetch(this.baseURL, {
				signal: controller.signal,
				headers: {
					'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
					'Cache-Control': 'no-cache',
					'Pragma': 'no-cache',
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.5',
					'Accept-Encoding': 'gzip, deflate, br',
					'DNT': '1',
					'Connection': 'keep-alive',
					'Upgrade-Insecure-Requests': '1'
				}
			});
			
			clearTimeout(timeoutId);
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			console.log('✅ Page fetched successfully');
			const html = await response.text();
			console.log(`📄 HTML parsed (${html.length} characters)`);
			
			const dom = new JSDOM(html);
			const document = dom.window.document;

			console.log('🔍 Extracting episodes...');
			const episodes = this.extractEpisodes(document);
			console.log(`✅ Successfully scraped ${episodes.length} episodes`);
			
			return episodes;
		} catch (error) {
			console.error('❌ Error scraping Hot Ones episodes:', error);
			throw error;
		}
	}

	private extractEpisodes(document: Document): HotOnesEpisode[] {
		const episodes: HotOnesEpisode[] = [];
		
		console.log('🔍 Looking for season containers...');
		// Find all season containers
		const seasonHeaders = document.querySelectorAll('h3 a[href*="/seasons/official/"]');
		console.log(`Found ${seasonHeaders.length} seasons`);

		console.log(`📺 Parsing through Seasons`);
		for (const seasonHeader of seasonHeaders) {
			const seasonText = seasonHeader.textContent?.trim() || '';
			const seasonMatch = seasonText.match(/Season (\d+)/);
			const seasonNumber = seasonMatch ? parseInt(seasonMatch[1], 10) : 0;
			
			// console.log(`📺 Processing Season ${seasonNumber}...`);  // Show how many seasons found
			
			// Find the episode list for this season
			const seasonContainer = seasonHeader.closest('h3')?.nextElementSibling;
			if (seasonContainer?.classList.contains('list-group')) {
				const episodeItems = seasonContainer.querySelectorAll('.list-group-item');
				// console.log(`  Found ${episodeItems.length} episodes in Season ${seasonNumber}`); // Show how many episodes in this season found
				
				for (const episodeItem of episodeItems) {
					const episode = this.extractEpisodeFromItem(episodeItem as Element, seasonNumber);
					if (episode) {
						episodes.push(episode);
					}
				}
			} else {
				console.warn(`  No episode list found for Season ${seasonNumber}`);
			}
		}
		
		console.log(`✅ Extracted ${episodes.length} total episodes`);
		return episodes;
	}

	private extractEpisodeFromItem(episodeItem: Element, seasonNumber: number): HotOnesEpisode | null {
		try {
			// Extract episode number from span with class "episode-label"
			const episodeLabel = episodeItem.querySelector('.episode-label')?.textContent?.trim() || '';
			const episodeMatch = episodeLabel.match(/S\d+E(\d+)/);
			const episodeNumber = episodeMatch ? parseInt(episodeMatch[1], 10) : 0;

			// Extract title from the episode link
			const titleElement = episodeItem.querySelector('h4.list-group-item-heading a');
			const title = titleElement?.textContent?.trim() || '';

			// Extract air date from list-inline items
			const dateElements = episodeItem.querySelectorAll('.list-inline li');
			let airDate = '';
			for (const dateElement of dateElements) {
				const text = dateElement.textContent?.trim() || '';
				// Look for date pattern (Month Day, Year)
				if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(text)) {
					airDate = this.parseAirDate(text);
					break;
				}
			}

			// Extract description from the episode text
			const descriptionElement = episodeItem.querySelector('.list-group-item-text p');
			const description = descriptionElement?.textContent?.trim() || '';

			// Generate tags based on title and description
			const tags = this.categorizeProfession(title, description);

			if (!title) {
				console.warn(`Skipping episode with missing title in season ${seasonNumber}`);
				return null;
			}

			return {
				season_number: seasonNumber,
				episode_number: episodeNumber,
				title,
				air_date: airDate,
				description,
				tags
			};
		} catch (error) {
			console.error('Error extracting episode data:', error);
			return null;
		}
	}

	private parseAirDate(dateString: string): string {
		try {
			const date = new Date(dateString);
			return date.toISOString().split('T')[0]; // YYYY-MM-DD format
		} catch (error) {
			console.warn(`Failed to parse date: ${dateString}`);
			return dateString; // Return original if parsing fails
		}
	}

	private categorizeProfession(title: string, description: string): EpisodeTag[] {
		const combinedText = `${title} ${description}`.toLowerCase();
		const tags: EpisodeTag[] = [];

		// Keywords for each category
		const categoryKeywords = {
			"Movie/TV": [
				"actor", "actress", "acting", "film", "movie", "director", "producer", 
				"television", "tv show", "series", "hollywood", "cinema", "screenwriter"
			],
			"Music": [
				"singer", "rapper", "musician", "album", "song", "music", "band", 
				"artist", "grammy", "billboard", "record", "songwriter", "dj"
			],
			"Comedy": [
				"comedian", "comedy", "stand-up", "standup", "sketch", "funny", 
				"humor", "snl", "saturday night live", "comic"
			],
			"Sports": [
				"player", "athlete", "sports", "basketball", "football", "baseball", 
				"soccer", "tennis", "olympics", "nba", "nfl", "mlb", "championship"
			],
			"Food/Culinary": [
				"chef", "cook", "restaurant", "culinary", "food", "kitchen", 
				"cuisine", "michelin", "cookbook"
			],
			"Internet/Social Media": [
				"youtuber", "youtube", "tiktoker", "tiktok", "streamer", "twitch", 
				"influencer", "social media", "viral", "content creator"
			]
		};

		// Check each category
		for (const [category, keywords] of Object.entries(categoryKeywords)) {
			const matchedKeywords = keywords.filter(keyword => 
				combinedText.includes(keyword)
			);

			if (matchedKeywords.length > 0) {
				// Determine sub-categories based on matched keywords
				const subCategories = this.determineSubCategories(category, matchedKeywords, combinedText);
				
				tags.push({
					category,
					sub_categories: subCategories
				});
			}
		}

		// If no categories matched, use "Other"
		if (tags.length === 0) {
			tags.push({
				category: "Other",
				sub_categories: ["Unknown"]
			});
		}

		return tags;
	}

	private determineSubCategories(category: string, matchedKeywords: string[], text: string): string[] {
		const subCategories: string[] = [];
		const taxonomySubCategories = PROFESSION_TAXONOMY[category] || [];

		// More specific keyword matching for sub-categories
		const subCategoryKeywords = {
			"Actor": ["actor", "acting"],
			"Actress": ["actress"],
			"Director": ["director", "directing"],
			"Producer": ["producer", "producing"],
			"Rapper": ["rapper", "rap", "hip hop", "hip-hop"],
			"Singer": ["singer", "singing", "vocalist"],
			"Musician": ["musician", "music"],
			"Stand-up Comedian": ["stand-up", "standup"],
			"Basketball Player": ["basketball", "nba"],
			"Football Player": ["football", "nfl"],
			"Chef": ["chef", "cook"],
			"YouTuber": ["youtube", "youtuber"],
			"TikToker": ["tiktok", "tiktoker"],
			"Streamer": ["streamer", "twitch"]
		};

		// Check for specific sub-category matches
		for (const [subCategory, keywords] of Object.entries(subCategoryKeywords)) {
			if (taxonomySubCategories.includes(subCategory)) {
				const hasMatch = keywords.some(keyword => text.includes(keyword));
				if (hasMatch) {
					subCategories.push(subCategory);
				}
			}
		}

		// If no specific sub-categories found, use generic ones from taxonomy
		if (subCategories.length === 0 && taxonomySubCategories.length > 0) {
			subCategories.push(taxonomySubCategories[0]);
		}

		return subCategories;
	}
}

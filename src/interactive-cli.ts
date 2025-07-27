import { HotOnesScraper } from './hot-ones-scraper';
import { HotOnesEpisode } from './types';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

export class HotOnesInteractiveCLI {
	private episodes: HotOnesEpisode[] = [];
	private rl: readline.Interface;

	constructor() {
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});
	}

	async start(): Promise<void> {
		console.log('🔥 (Unofficial) Hot Ones Interactive CLI\n');
		
		// Check if we have cached episodes
		const cachePath = path.join(process.cwd(), 'hot-ones-report.json');
		
		if (fs.existsSync(cachePath)) {
			console.log('📂 Loading episodes from cache...');
			try {
				const cachedData = fs.readFileSync(cachePath, 'utf-8');
				this.episodes = JSON.parse(cachedData);
				console.log(`✅ Loaded ${this.episodes.length} episodes from cache\n`);
			} catch (error) {
				console.log('⚠️  Cache file corrupted, scraping fresh data...');
				await this.scrapeEpisodes();
			}
		} else {
			console.log('🕷️ No cache found, scraping episodes...');
			await this.scrapeEpisodes();
		}

		if (this.episodes.length === 0) {
			console.log('❌ No episodes available. Exiting...');
			this.close();
			return;
		}

		this.showWelcomeMessage();
		this.startInteractiveSession();
	}

	private async scrapeEpisodes(): Promise<void> {
		const scraper = new HotOnesScraper();
		this.episodes = await scraper.scrapeAllEpisodes();
		
		// Save to cache
		const cachePath = path.join(process.cwd(), 'hot-ones-report.json');
		fs.writeFileSync(cachePath, JSON.stringify(this.episodes, null, 2));
		console.log(`💾 Episodes cached to: ${cachePath}\n`);
	}

	private showWelcomeMessage(): void {
		console.log('🌶️  Welcome to the (Unofficial) Hot Ones CLI! 🌶️');
		console.log(`📺 ${this.episodes.length} episodes available (1-${this.episodes.length})`);
		console.log('\n📋 Commands:');
		console.log('  • Enter episode number (1-554) to view episode details');
		console.log('  • "random" or "r" - Show a random episode');
		console.log('  • "stats" or "s" - Show episode statistics');
		console.log('  • "search [term]" - Search episodes by title or guest name');
		console.log('  • "season [number]" - List all episodes from a specific season');
		console.log('  • "help" or "h" - Show this help message');
		console.log('  • "quit" or "q" - Exit the browser');
		console.log('\n' + '='.repeat(60) + '\n');
	}

	private startInteractiveSession(): void {
		this.promptUser();
	}

	private promptUser(): void {
		this.rl.question('🍗 Enter command or episode number: ', (input) => {
			this.handleUserInput(input.trim());
		});
	}

	private handleUserInput(input: string): void {
		const lowerInput = input.toLowerCase();

		// Handle quit commands
		if (lowerInput === 'quit' || lowerInput === 'q' || lowerInput === 'exit') {
			console.log('\n👋 Thanks for stopping by! Stay spicy! 🌶️');
			this.close();
			return;
		}

		// Handle help commands
		if (lowerInput === 'help' || lowerInput === 'h') {
			this.showWelcomeMessage();
			this.promptUser();
			return;
		}

		// Handle random episode
		if (lowerInput === 'random' || lowerInput === 'r') {
			const randomIndex = Math.floor(Math.random() * this.episodes.length);
			this.displayEpisode(randomIndex + 1);
			this.promptUser();
			return;
		}

		// Handle stats
		if (lowerInput === 'stats' || lowerInput === 's') {
			this.showStats();
			this.promptUser();
			return;
		}

		// Handle search
		if (lowerInput.startsWith('search ')) {
			const searchTerm = input.substring(7).trim();
			this.searchEpisodes(searchTerm);
			this.promptUser();
			return;
		}

		// Handle season listing
		if (lowerInput.startsWith('season ')) {
			const seasonStr = input.substring(7).trim();
			const seasonNumber = parseInt(seasonStr);
			if (!isNaN(seasonNumber)) {
				this.listSeasonEpisodes(seasonNumber);
			} else {
				console.log('❌ Invalid season number. Please enter a valid number.');
			}
			this.promptUser();
			return;
		}

		// Handle episode number
		const episodeNumber = parseInt(input);
		if (!isNaN(episodeNumber)) {
			if (episodeNumber >= 1 && episodeNumber <= this.episodes.length) {
				this.displayEpisode(episodeNumber);
			} else {
				console.log(`❌ Episode number must be between 1 and ${this.episodes.length}`);
			}
		} else {
			console.log('❌ Invalid input. Type "help" for available commands.');
		}

		this.promptUser();
	}

	private displayEpisode(episodeNumber: number): void {
		const episode = this.episodes[episodeNumber - 1];
		
		console.log('\n' + '='.repeat(80));
		console.log(`🍗 ${episodeNumber}. ${episode.title}`);
		console.log(`   Season ${episode.season_number}, Episode ${episode.episode_number}`);
		console.log(`   Air Date: ${episode.air_date}`);
		console.log(`   Categories: ${episode.tags.map(t => t.category).join(', ')}`);
		if (episode.tags.length > 0) {
			console.log(`   Sub-categories: ${episode.tags.flatMap(t => t.sub_categories).join(', ')}`);
		}
		if (episode.description) {
			console.log(`   Description: ${episode.description}`);
		}
		console.log('='.repeat(80) + '\n');
	}

	private showStats(): void {
		const seasonCounts = this.episodes.reduce((acc, episode) => {
			acc[episode.season_number] = (acc[episode.season_number] || 0) + 1;
			return acc;
		}, {} as Record<number, number>);

		const categoryDistribution = this.episodes.reduce((acc, episode) => {
			episode.tags.forEach(tag => {
				acc[tag.category] = (acc[tag.category] || 0) + 1;
			});
			return acc;
		}, {} as Record<string, number>);

		console.log('\n📊 Hot Ones Episode Statistics:');
		console.log(`Total Episodes: ${this.episodes.length}`);
		console.log(`Total Seasons: ${Object.keys(seasonCounts).length}`);
		
		console.log('\n🎬 Episodes per Season:');
		Object.entries(seasonCounts)
			.sort(([a], [b]) => parseInt(a) - parseInt(b))
			.forEach(([season, count]) => {
				console.log(`  Season ${season}: ${count} episodes`);
			});
		
    console.log(`\nTotal Seasons: ${Object.keys(seasonCounts).length}`);
    console.log(`Total Episodes: ${this.episodes.length}`);

		console.log('\n🏷️  Category Distribution:');
		Object.entries(categoryDistribution)
			.sort(([, a], [, b]) => b - a)
			.forEach(([category, count]) => {
				console.log(`  ${category}: ${count} episodes`);
			});
		console.log('');
	}

	private searchEpisodes(searchTerm: string): void {
		const results = this.episodes.filter((episode, index) => 
			episode.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
			episode.description.toLowerCase().includes(searchTerm.toLowerCase())
		).map((episode, _, array) => {
			const originalIndex = this.episodes.indexOf(episode);
			return { episode, number: originalIndex + 1 };
		});

		console.log(`\n🔍 Search results for "${searchTerm}" (${results.length} found):`);
		
		if (results.length === 0) {
			console.log('No episodes found matching your search term.');
		} else {
			results.slice(0, 10).forEach(({ episode, number }) => {
				console.log(`  ${number}. ${episode.title} (S${episode.season_number}E${episode.episode_number})`);
			});
			
			if (results.length > 10) {
				console.log(`  ... and ${results.length - 10} more results`);
			}
		}
		console.log('');
	}

	private listSeasonEpisodes(seasonNumber: number): void {
		const seasonEpisodes = this.episodes
			.map((episode, index) => ({ episode, number: index + 1 }))
			.filter(({ episode }) => episode.season_number === seasonNumber);

		console.log(`\n📺 Season ${seasonNumber} Episodes (${seasonEpisodes.length} episodes):`);
		
		if (seasonEpisodes.length === 0) {
			console.log(`No episodes found for Season ${seasonNumber}.`);
		} else {
			seasonEpisodes.forEach(({ episode, number }) => {
				console.log(`  ${number}. ${episode.title} (${episode.air_date})`);
			});
		}
		console.log('');
	}

	private close(): void {
		this.rl.close();
	}
}

// Main function for the interactive CLI
async function main(): Promise<void> {
	const cli = new HotOnesInteractiveCLI();
	await cli.start();
}

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

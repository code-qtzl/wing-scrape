import { HotOnesScraper } from './hot-ones-scraper';
import { HotOnesEpisode } from './types';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';

// Brand colors
const colors = {
	black: '#000000',
	white: '#FFFFFF', 
	yellow: '#FED204',
	red: '#DA1F27'
};

// Styled chalk functions
const brand = {
	title: chalk.hex(colors.red).bold,
	highlight: chalk.hex(colors.yellow).bold,
	success: chalk.hex(colors.yellow),
	error: chalk.hex(colors.red),
	info: chalk.hex(colors.white),
	dim: chalk.hex(colors.white).dim
};

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
		console.log(brand.title('🔥 (Unofficial) Hot Ones Interactive CLI\n'));
		
		// Check if we have cached episodes
		const cachePath = path.join(process.cwd(), 'hot-ones-report.json');
		
		if (fs.existsSync(cachePath)) {
			console.log(brand.info('📂 Loading episodes from cache...'));
			try {
				const cachedData = fs.readFileSync(cachePath, 'utf-8');
				this.episodes = JSON.parse(cachedData);
				console.log(brand.success(`✅ Loaded ${this.episodes.length} episodes from cache\n`));
			} catch (error) {
				console.log(brand.error('⚠️  Cache file corrupted, scraping fresh data...'));
				await this.scrapeEpisodes();
			}
		} else {
			console.log(brand.info('🕷️ No cache found, scraping episodes...'));
			await this.scrapeEpisodes();
		}

		if (this.episodes.length === 0) {
			console.log(brand.error('❌ No episodes available. Exiting...'));
			this.close();
			return;
		}

		this.showWelcomeMessage();
		this.startInteractiveSession();
	}

	private async scrapeEpisodes(): Promise<void> {
		const scraper = new HotOnesScraper();
		
		// Add loading animation
		const loadingChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
		let i = 0;
		const loadingInterval = setInterval(() => {
			process.stdout.write(`\r${brand.highlight(loadingChars[i++ % loadingChars.length] + ' Scraping episodes...')}`);
		}, 100);

		try {
			this.episodes = await scraper.scrapeAllEpisodes();
			clearInterval(loadingInterval);
			process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear loading line
			
			// Save to cache
			const cachePath = path.join(process.cwd(), 'hot-ones-report.json');
			fs.writeFileSync(cachePath, JSON.stringify(this.episodes, null, 2));
			console.log(brand.success(`💾 Episodes cached to: ${cachePath}\n`));
		} catch (error) {
			clearInterval(loadingInterval);
			process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear loading line
			throw error;
		}
	}

	private showWelcomeMessage(): void {
		console.log(brand.title('🌶️  Welcome to the (Unofficial) Hot Ones CLI! 🌶️'));
		console.log(brand.info(`📺 ${this.episodes.length} episodes available (1-${this.episodes.length})`));
		
		// Commands table
		const commandsTable = new Table({
			head: [brand.highlight('Type Command'), brand.highlight('What Command Does')],
			style: { 
				head: [],
				border: ['dim']
			},
			colWidths: [20, 50]
		});

		commandsTable.push(
			[brand.success('1-554'), brand.info('View episode details by number')],
			[brand.success('random, r'), brand.info('Show a random episode')],
			[brand.success('stats, s'), brand.info('Show episode statistics')],
			[brand.success('search [term]'), brand.info('Search episodes by title or guest name')],
			[brand.success('season [number]'), brand.info('List all episodes from a specific season')],
			[brand.success('help, h'), brand.info('Show this help message')],
			[brand.success('quit, q'), brand.info('Exit the CLI')]
		);

		console.log(brand.highlight('\n📋 Available Commands:'));
		console.log(commandsTable.toString());
		console.log('\n' + brand.dim('='.repeat(60)) + '\n');
	}

	private startInteractiveSession(): void {
		this.promptUser();
	}

	private promptUser(): void {
		this.rl.question(brand.highlight('🍗 Enter command or episode number: '), (input) => {
			this.handleUserInput(input.trim());
		});
	}

	private handleUserInput(input: string): void {
		const lowerInput = input.toLowerCase();

		// Handle quit commands
		if (lowerInput === 'quit' || lowerInput === 'q' || lowerInput === 'exit') {
			console.log(brand.success('\n👋 Thanks for stopping by! Stay spicy! 🌶️'));
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
				console.log(brand.error('❌ Invalid season number. Please enter a valid number.'));
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
				console.log(brand.error(`❌ Episode number must be between 1 and ${this.episodes.length}`));
			}
		} else {
			console.log(brand.error('❌ Invalid input. Type "help" for available commands.'));
		}

		this.promptUser();
	}

	private displayEpisode(episodeNumber: number): void {
		const episode = this.episodes[episodeNumber - 1];
		
		console.log('\n' + brand.dim('='.repeat(80)));
		console.log(brand.title(`🍗 Episode ${episodeNumber}: ${episode.title}`));
		console.log(brand.dim('='.repeat(80)));
		
		// Episode details table
		const detailsTable = new Table({
			style: { 
				head: [],
				border: ['dim']
			},
			colWidths: [20, 55]
		});

		detailsTable.push(
			[brand.highlight('Season'), brand.info(`${episode.season_number}`)],
			[brand.highlight('Episode'), brand.info(`${episode.episode_number}`)],
			[brand.highlight('Air Date'), brand.success(`${episode.air_date}`)],
			[brand.highlight('Categories'), brand.info(`${episode.tags.map(t => t.category).join(', ')}`)],
		);

		if (episode.tags.length > 0 && episode.tags.flatMap(t => t.sub_categories).length > 0) {
			detailsTable.push([brand.highlight('Sub-categories'), brand.dim(`${episode.tags.flatMap(t => t.sub_categories).join(', ')}`)]);
		}

		console.log(detailsTable.toString());

		// Description section
		if (episode.description && episode.description.trim() !== '') {
			console.log(brand.highlight('\n📝 Episode Description:'));
			
			// Format description with better text wrapping
			const maxWidth = 75;
			const words = episode.description.split(' ');
			let lines = [];
			let currentLine = '';
			
			words.forEach(word => {
				if ((currentLine + word).length <= maxWidth) {
					currentLine += (currentLine ? ' ' : '') + word;
				} else {
					if (currentLine) lines.push(currentLine);
					currentLine = word;
				}
			});
			if (currentLine) lines.push(currentLine);
			
			lines.forEach(line => {
				console.log(brand.info(`   ${line}`));
			});
		}
		
		console.log('\n' + brand.dim('='.repeat(80)) + '\n');
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

		console.log(brand.title('\n📊 Hot Ones Episode Statistics'));
		console.log(brand.info(`Total Episodes: ${this.episodes.length}`));
		console.log(brand.info(`Total Seasons: ${Object.keys(seasonCounts).length}\n`));
		
		// Season table
		const seasonTable = new Table({
			head: [brand.highlight('Season'), brand.highlight('Episodes')],
			style: { 
				head: [],
				border: ['dim'],
				'padding-left': 1,
				'padding-right': 1
			},
			chars: {
				'mid': '',
				'left-mid': '',
				'mid-mid': '',
				'right-mid': ''
			}
		});

		Object.entries(seasonCounts)
			.sort(([a], [b]) => parseInt(a) - parseInt(b))
			.forEach(([season, count]) => {
				seasonTable.push([brand.info(`${season}`), brand.success(count.toString())]);
			});

		console.log(brand.highlight('🎬 Episodes per Season:'));
		console.log(seasonTable.toString());

		// Category table
		const categoryTable = new Table({
			head: [brand.highlight('Category'), brand.highlight('Episodes')],
			style: { 
				head: [],
				border: ['dim'],
				'padding-left': 1,
				'padding-right': 1
			},
			chars: {
				'mid': '',
				'left-mid': '',
				'mid-mid': '',
				'right-mid': ''
			}
		});

		Object.entries(categoryDistribution)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10) // Show top 10 categories
			.forEach(([category, count]) => {
				categoryTable.push([brand.info(category), brand.success(count.toString())]);
			});

		console.log(brand.highlight('\n🏷️  Top Categories:'));
		console.log(categoryTable.toString());
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

		console.log(brand.highlight(`\n🔍 Search results for "${searchTerm}" (${results.length} found):`));
		
		if (results.length === 0) {
			console.log(brand.dim('No episodes found matching your search term.'));
		} else {
			// Use a table for better formatting
			const searchTable = new Table({
				head: [brand.highlight('#'), brand.highlight('Title'), brand.highlight('Season/Episode')],
				style: { 
					head: [],
					border: ['dim']
				},
				colWidths: [5, 50, 15]
			});

			results.slice(0, 10).forEach(({ episode, number }) => {
				searchTable.push([
					brand.success(number.toString()),
					brand.info(episode.title.length > 45 ? episode.title.substring(0, 45) + '...' : episode.title),
					brand.dim(`S${episode.season_number}E${episode.episode_number}`)
				]);
			});

			console.log(searchTable.toString());
			
			if (results.length > 10) {
				console.log(brand.dim(`... and ${results.length - 10} more results`));
			}
		}
		console.log('');
	}

	private listSeasonEpisodes(seasonNumber: number): void {
		const seasonEpisodes = this.episodes
			.map((episode, index) => ({ episode, number: index + 1 }))
			.filter(({ episode }) => episode.season_number === seasonNumber);

		console.log(brand.highlight(`\n📺 Season ${seasonNumber} Episodes (${seasonEpisodes.length} episodes):`));
		
		if (seasonEpisodes.length === 0) {
			console.log(brand.dim(`No episodes found for Season ${seasonNumber}.`));
		} else {
			// Use a table for better formatting
			const seasonTable = new Table({
				head: [brand.highlight('#'), brand.highlight('Title'), brand.highlight('Air Date')],
				style: { 
					head: [],
					border: ['dim']
				},
				colWidths: [5, 50, 15]
			});

			seasonEpisodes.forEach(({ episode, number }) => {
				seasonTable.push([
					brand.success(number.toString()),
					brand.info(episode.title.length > 45 ? episode.title.substring(0, 45) + '...' : episode.title),
					brand.dim(episode.air_date)
				]);
			});

			console.log(seasonTable.toString());
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

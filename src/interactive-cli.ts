import { HotOnesScraper } from './hot-ones-scraper';
import { HotOnesEpisode } from './types';
import { TerminalImageRenderer } from './terminal-image-renderer';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import chalk from 'chalk';
import Table from 'cli-table3';

// Brand colors
const colors = {
	black: '#000000',
	white: '#FFFFFF',
	yellow: '#FED204',
	red: '#DA1F27',
};

// Styled chalk functions
const brand = {
	title: chalk.hex(colors.red).bold,
	highlight: chalk.hex(colors.yellow).bold,
	success: chalk.hex(colors.yellow),
	error: chalk.hex(colors.red),
	info: chalk.hex(colors.white),
	dim: chalk.hex(colors.white).dim,
};

export class HotOnesInteractiveCLI {
	private episodes: HotOnesEpisode[] = [];
	private rl: readline.Interface;

	constructor() {
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
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
				console.log(
					brand.success(
						`✅ Loaded ${this.episodes.length} episodes from cache\n`,
					),
				);
			} catch (error) {
				console.log(
					brand.error(
						'⚠️  Cache file corrupted, scraping fresh data...',
					),
				);
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
			process.stdout.write(
				`\r${brand.highlight(
					loadingChars[i++ % loadingChars.length] +
						' Scraping episodes...',
				)}`,
			);
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
		console.log(
			brand.title('🌶️  Welcome to the (Unofficial) Hot Ones CLI! 🌶️'),
		);
		console.log(
			brand.info(
				`📺 ${this.episodes.length} episodes available (1-${this.episodes.length})`,
			),
		);

		// Commands table
		const commandsTable = new Table({
			head: [
				brand.highlight('Type Command'),
				brand.highlight('What Command Does'),
			],
			style: {
				head: [],
				border: ['dim'],
			},
			colWidths: [20, 50],
		});

		commandsTable.push(
			[
				brand.success(`1-${this.episodes.length}`),
				brand.info(
					'View episode details by number (with YouTube link)',
				),
			],
			[brand.success('random, r'), brand.info('Show a random episode')],
			[brand.success('stats, s'), brand.info('Show episode statistics')],
			[
				brand.success('search [term]'),
				brand.info('Search episodes by title or guest name'),
			],
			[
				brand.success('season [number]'),
				brand.info('List all episodes from a specific season'),
			],
			[brand.success('help, h'), brand.info('Show this help message')],
			[brand.success('quit, q'), brand.info('Exit the CLI')],
		);

		console.log(brand.highlight('\n📋 Available Commands:'));
		console.log(commandsTable.toString());
		console.log('\n' + brand.dim('='.repeat(60)) + '\n');
	}

	private startInteractiveSession(): void {
		this.promptUser();
	}

	private promptUser(): void {
		this.rl.question(
			brand.highlight('🍗 Enter command or episode number: '),
			(input) => {
				this.handleUserInput(input.trim());
			},
		);
	}

	private handleUserInput(input: string): void {
		const lowerInput = input.toLowerCase();

		// Handle quit commands
		if (
			lowerInput === 'quit' ||
			lowerInput === 'q' ||
			lowerInput === 'exit'
		) {
			console.log(
				brand.success('\n👋 Thanks for stopping by! Stay spicy! 🌶️'),
			);
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
			const randomIndex = Math.floor(
				Math.random() * this.episodes.length,
			);
			this.displayEpisode(randomIndex + 1).then(() => this.promptUser());
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
				console.log(
					brand.error(
						'❌ Invalid season number. Please enter a valid number.',
					),
				);
			}
			this.promptUser();
			return;
		}

		// Handle episode number
		const episodeNumber = parseInt(input);
		if (!isNaN(episodeNumber)) {
			if (episodeNumber >= 1 && episodeNumber <= this.episodes.length) {
				this.displayEpisode(episodeNumber).then(() =>
					this.promptUser(),
				);
			} else {
				console.log(
					brand.error(
						`❌ Episode number must be between 1 and ${this.episodes.length}`,
					),
				);
			}
		} else {
			console.log(
				brand.error(
					'❌ Invalid input. Type "help" for available commands.',
				),
			);
		}

		this.promptUser();
	}

	private async displayEpisode(episodeNumber: number): Promise<void> {
		const episode = this.episodes[episodeNumber - 1];

		// Create a more stylized header
		console.log('\n' + brand.error('🔥'.repeat(20)));
		console.log(brand.title(`🌶️  HOT ONES - EPISODE ${episodeNumber} 🌶️`));
		console.log(brand.highlight(`🐔  ${episode.title.toUpperCase()}`));

		// Show thumbnail if available and terminal supports it
		if (
			episode.youtube_thumbnail &&
			TerminalImageRenderer.supportsImages()
		) {
			console.log(brand.highlight('📺 YouTube Thumbnail:'));
			await TerminalImageRenderer.displayThumbnail(
				episode.youtube_thumbnail,
				300,
			);
		}

		// Episode details table with enhanced styling
		const detailsTable = new Table({
			style: {
				head: [],
				border: ['red'],
			},
			chars: {
				top: '═',
				'top-mid': '╤',
				'top-left': '╔',
				'top-right': '╗',
				bottom: '═',
				'bottom-mid': '╧',
				'bottom-left': '╚',
				'bottom-right': '╝',
				left: '║',
				'left-mid': '',
				mid: '',
				'mid-mid': '',
				right: '║',
				'right-mid': '',
			},
			colWidths: [20, 55],
		});

		detailsTable.push(
			[brand.highlight('Season'), brand.info(`${episode.season_number}`)],
			[
				brand.highlight('Episode'),
				brand.info(`${episode.episode_number}`),
			],
			[brand.highlight('Air Date'), brand.success(`${episode.air_date}`)],
			[
				brand.highlight('Categories'),
				brand.info(`${episode.tags.map((t) => t.category).join(', ')}`),
			],
		);

		if (
			episode.tags.length > 0 &&
			episode.tags.flatMap((t) => t.sub_categories).length > 0
		) {
			detailsTable.push([
				brand.highlight('Sub-categories'),
				brand.dim(
					`${episode.tags
						.flatMap((t) => t.sub_categories)
						.join(', ')}`,
				),
			]);
		}

		// Add YouTube data if available
		if (episode.youtube_url) {
			detailsTable.push([
				brand.highlight('YouTube'),
				brand.success('✅ Direct Link'),
			]);
		} else if (episode.youtube_search_url) {
			detailsTable.push([
				brand.highlight('YouTube'),
				brand.dim('🔍 Search Available'),
			]);
		}

		if (episode.youtube_views && episode.youtube_views > 0) {
			detailsTable.push([
				brand.highlight('Views'),
				brand.info(`${episode.youtube_views.toLocaleString()}`),
			]);
		}

		if (episode.youtube_published_date) {
			detailsTable.push([
				brand.highlight('YT Published'),
				brand.dim(`${episode.youtube_published_date}`),
			]);
		}

		console.log(detailsTable.toString());

		// Description section with better visual separation
		if (episode.description && episode.description.trim() !== '') {
			// console.log(brand.error('\n' + '🌶️ '.repeat(20)));
			console.log(brand.highlight('📝 EPISODE DESCRIPTION'));

			// Format description with better text wrapping
			const maxWidth = 75;
			const words = episode.description.split(' ');
			let lines = [];
			let currentLine = '';

			words.forEach((word) => {
				if ((currentLine + word).length <= maxWidth) {
					currentLine += (currentLine ? ' ' : '') + word;
				} else {
					if (currentLine) lines.push(currentLine);
					currentLine = word;
				}
			});
			if (currentLine) lines.push(currentLine);

			lines.forEach((line) => {
				console.log(brand.info(`   ${line}`));
			});
		}

		// YouTube actions with enhanced styling
		if (episode.youtube_url) {
			console.log(brand.title('🎥 YOUTUBE VIDEO (DIRECT LINK)'));
			console.log(brand.info(`🔗 ${episode.youtube_url}`));

			if (
				!episode.youtube_thumbnail ||
				!TerminalImageRenderer.supportsImages()
			) {
				console.log(
					brand.dim(
						`🖼️  Thumbnail: ${
							episode.youtube_thumbnail || 'Not available'
						}`,
					),
				);
			}

			console.log(
				brand.highlight(
					'🔥 Type [Y] and press Enter to open video, [C] to copy link, or just press Enter to continue... 🔥',
				),
			);

			// Handle user input for YouTube actions
			await this.handleYouTubeActions(episode.youtube_url);
		} else if (episode.youtube_search_url) {
			console.log(brand.error('\n' + '🔍 '.repeat(10)));
			console.log(
				brand.title('🔍 YOUTUBE SEARCH (EPISODE NOT IN RECENT FEED)'),
			);
			console.log(brand.error('🔍 '.repeat(10)));
			console.log(brand.info(`🔗 ${episode.youtube_search_url}`));
			console.log(
				brand.dim('This will search YouTube for the specific episode'),
			);

			console.log(
				brand.highlight(
					'🔥 Type [Y] and press Enter to open search, [C] to copy search link, or just press Enter to continue... 🔥',
				),
			);

			// Handle user input for YouTube search actions
			await this.handleYouTubeActions(episode.youtube_search_url);
		} else {
			console.log(brand.error('\n' + '❌ '.repeat(20)));
			console.log(
				brand.dim(
					'❌ NO YOUTUBE LINK OR SEARCH AVAILABLE FOR THIS EPISODE',
				),
			);
			console.log(brand.error('❌ '.repeat(20)));
		}

		console.log('\n' + brand.error('🔥'.repeat(20)) + '\n');
	}

	private showStats(): void {
		const seasonCounts = this.episodes.reduce((acc, episode) => {
			acc[episode.season_number] = (acc[episode.season_number] || 0) + 1;
			return acc;
		}, {} as Record<number, number>);

		const categoryDistribution = this.episodes.reduce((acc, episode) => {
			episode.tags.forEach((tag) => {
				acc[tag.category] = (acc[tag.category] || 0) + 1;
			});
			return acc;
		}, {} as Record<string, number>);

		console.log(brand.title('\n📊 Hot Ones Episode Statistics'));
		console.log(brand.info(`Total Episodes: ${this.episodes.length}`));
		console.log(
			brand.info(`Total Seasons: ${Object.keys(seasonCounts).length}\n`),
		);

		// Season table
		const seasonTable = new Table({
			head: [brand.highlight('Season'), brand.highlight('Episodes')],
			style: {
				head: [],
				border: ['dim'],
				'padding-left': 1,
				'padding-right': 1,
			},
			chars: {
				mid: '',
				'left-mid': '',
				'mid-mid': '',
				'right-mid': '',
			},
		});

		Object.entries(seasonCounts)
			.sort(([a], [b]) => parseInt(a) - parseInt(b))
			.forEach(([season, count]) => {
				seasonTable.push([
					brand.info(`${season}`),
					brand.success(count.toString()),
				]);
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
				'padding-right': 1,
			},
			chars: {
				mid: '',
				'left-mid': '',
				'mid-mid': '',
				'right-mid': '',
			},
		});

		Object.entries(categoryDistribution)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10) // Show top 10 categories
			.forEach(([category, count]) => {
				categoryTable.push([
					brand.info(category),
					brand.success(count.toString()),
				]);
			});

		console.log(brand.highlight('\n🏷️  Top Categories:'));
		console.log(categoryTable.toString());
		console.log('');
	}

	private searchEpisodes(searchTerm: string): void {
		const results = this.episodes
			.filter(
				(episode, index) =>
					episode.title
						.toLowerCase()
						.includes(searchTerm.toLowerCase()) ||
					episode.description
						.toLowerCase()
						.includes(searchTerm.toLowerCase()),
			)
			.map((episode, _, array) => {
				const originalIndex = this.episodes.indexOf(episode);
				return { episode, number: originalIndex + 1 };
			});

		console.log(
			brand.highlight(
				`\n🔍 Search results for "${searchTerm}" (${results.length} found):`,
			),
		);

		if (results.length === 0) {
			console.log(
				brand.dim('No episodes found matching your search term.'),
			);
		} else {
			// Use a table for better formatting
			const searchTable = new Table({
				head: [
					brand.highlight('#'),
					brand.highlight('Title'),
					brand.highlight('Season/Episode'),
				],
				style: {
					head: [],
					border: ['dim'],
				},
				colWidths: [5, 50, 15],
			});

			results.slice(0, 10).forEach(({ episode, number }) => {
				searchTable.push([
					brand.success(number.toString()),
					brand.info(
						episode.title.length > 45
							? episode.title.substring(0, 45) + '...'
							: episode.title,
					),
					brand.dim(
						`S${episode.season_number}E${episode.episode_number}`,
					),
				]);
			});

			console.log(searchTable.toString());

			if (results.length > 10) {
				console.log(
					brand.dim(`... and ${results.length - 10} more results`),
				);
			}
		}
		console.log('');
	}

	private listSeasonEpisodes(seasonNumber: number): void {
		const seasonEpisodes = this.episodes
			.map((episode, index) => ({ episode, number: index + 1 }))
			.filter(({ episode }) => episode.season_number === seasonNumber);

		console.log(
			brand.highlight(
				`\n📺 Season ${seasonNumber} Episodes (${seasonEpisodes.length} episodes):`,
			),
		);

		if (seasonEpisodes.length === 0) {
			console.log(
				brand.dim(`No episodes found for Season ${seasonNumber}.`),
			);
		} else {
			// Use a table for better formatting
			const seasonTable = new Table({
				head: [
					brand.highlight('#'),
					brand.highlight('Title'),
					brand.highlight('Air Date'),
				],
				style: {
					head: [],
					border: ['dim'],
				},
				colWidths: [5, 50, 15],
			});

			seasonEpisodes.forEach(({ episode, number }) => {
				seasonTable.push([
					brand.success(number.toString()),
					brand.info(
						episode.title.length > 45
							? episode.title.substring(0, 45) + '...'
							: episode.title,
					),
					brand.dim(episode.air_date),
				]);
			});

			console.log(seasonTable.toString());
		}
		console.log('');
	}

	private async handleYouTubeActions(youtubeUrl: string): Promise<void> {
		return new Promise((resolve) => {
			// Use readline for input instead of raw mode to avoid conflicts
			this.rl.question('', (input) => {
				const key = input.trim().toLowerCase();

				switch (key) {
					case 'y':
						this.openYouTubeVideo(youtubeUrl);
						break;
					case 'c':
						this.copyToClipboard(youtubeUrl);
						break;
					case '': // Enter key (empty input)
						// Just continue
						break;
					default:
						console.log(brand.dim(`Unknown action: ${key}`));
				}
				resolve();
			});
		});
	}

	private openYouTubeVideo(url: string): void {
		console.log(brand.success('\n🚀 Opening YouTube video...'));

		try {
			const platform = process.platform;
			let command = '';

			switch (platform) {
				case 'darwin': // macOS
					command = `open "${url}"`;
					break;
				case 'win32': // Windows
					command = `start "${url}"`;
					break;
				default: // Linux and others
					command = `xdg-open "${url}"`;
					break;
			}

			exec(command, (error) => {
				if (error) {
					console.error(
						brand.error('❌ Could not open YouTube link:'),
						error.message,
					);
					console.log(brand.info(`🔗 Manual link: ${url}`));
				} else {
					console.log(
						brand.success(
							'✅ YouTube video opened in default browser',
						),
					);
				}
			});
		} catch (error) {
			console.error(brand.error('❌ Error opening YouTube link:'), error);
			console.log(brand.info(`🔗 Manual link: ${url}`));
		}
	}

	private copyToClipboard(text: string): void {
		try {
			const platform = process.platform;
			let command = '';

			switch (platform) {
				case 'darwin': // macOS
					command = `echo "${text}" | pbcopy`;
					break;
				case 'win32': // Windows
					command = `echo ${text} | clip`;
					break;
				default: // Linux
					command = `echo "${text}" | xclip -selection clipboard`;
					break;
			}

			exec(command, (error) => {
				if (error) {
					console.log(
						brand.error('❌ Could not copy to clipboard:'),
						error.message,
					);
					console.log(brand.info(`🔗 Manual copy: ${text}`));
				} else {
					console.log(
						brand.success('📋 YouTube link copied to clipboard!'),
					);
				}
			});
		} catch (error) {
			console.log(brand.error('❌ Error copying to clipboard:'), error);
			console.log(brand.info(`🔗 Manual copy: ${text}`));
		}
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

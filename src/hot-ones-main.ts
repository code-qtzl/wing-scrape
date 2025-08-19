import { HotOnesScraper } from './hot-ones-scraper';
import { HotOnesEpisode } from './types';
import * as fs from 'fs';
import * as path from 'path';
import Table from 'cli-table3';
import chalk from 'chalk';
import { ASCIIArt } from './ascii-art';

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

async function main(): Promise<void> {
	try {
		// Import chalk-animation with require to avoid TypeScript issues
		const chalkAnimation = require('chalk-animation');

		// Check if chalk-animation is properly loaded and has the functions we need
		let titleAnimation;
		let successAnimation;

		try {
			if (chalkAnimation && typeof chalkAnimation.pulse === 'function') {
				// Animated title
				titleAnimation = chalkAnimation.pulse(
					'🔥 Hot Ones Episode Scraper 🔥',
				);
				await new Promise((resolve) => setTimeout(resolve, 2000));
				titleAnimation.stop();
			} else {
				// Fallback if animation doesn't work
				console.log(brand.title('🔥 Hot Ones Episode Scraper 🔥'));
			}
		} catch (animationError) {
			// Fallback if animation doesn't work
			console.log(brand.title('🔥 Hot Ones Episode Scraper 🔥'));
		}

		console.log(
			brand.title('\n🌶️  Starting Hot Ones Episode Scraper 🌶️\n'),
		);

		// Loading animation
		const loadingChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
		let i = 0;
		const loadingInterval = setInterval(() => {
			process.stdout.write(
				`\r${brand.highlight(
					loadingChars[i++ % loadingChars.length] +
						' Initializing scraper...',
				)}`,
			);
		}, 100);

		const scraper = new HotOnesScraper();

		setTimeout(() => {
			clearInterval(loadingInterval);
			process.stdout.write('\r' + ' '.repeat(50) + '\r');
		}, 1500);

		await new Promise((resolve) => setTimeout(resolve, 1600));

		console.log(brand.info('🚀 Scraper initialized successfully\n'));

		const episodes = await scraper.scrapeAllEpisodes();

		if (episodes.length === 0) {
			console.log(
				brand.error('⚠️  No episodes found. Check the scraper logic.'),
			);
			return;
		}

		// Save to JSON file
		const outputPath = path.join(process.cwd(), 'hot-ones-report.json');
		fs.writeFileSync(outputPath, JSON.stringify(episodes, null, 2));
		console.log(brand.success(`\n💾 Episodes saved to: ${outputPath}`));

		// Data quality check with themed table
		console.log(brand.highlight('\n🔍 Data Quality Analysis:'));
		const missingTitles = episodes.filter((ep) => !ep.title).length;
		const missingDates = episodes.filter((ep) => !ep.air_date).length;
		const missingDescriptions = episodes.filter(
			(ep) => !ep.description,
		).length;
		const uncategorized = episodes.filter(
			(ep) =>
				ep.tags.length === 1 &&
				ep.tags[0].category === 'Other' &&
				ep.tags[0].sub_categories.includes('Unknown'),
		).length;

		// Quality check table with brand theme
		const qualityTable = new Table({
			head: [
				brand.highlight('Data Quality Metric'),
				brand.highlight('Count'),
				brand.highlight('Status'),
			],
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
			colWidths: [25, 8, 12],
		});

		const getStatus = (count: number) =>
			count === 0 ? brand.success('✅ Good') : brand.error('⚠️  Issues');

		qualityTable.push(
			[
				brand.info('Missing Titles'),
				brand.dim(missingTitles.toString()),
				getStatus(missingTitles),
			],
			[
				brand.info('Missing Air Dates'),
				brand.dim(missingDates.toString()),
				getStatus(missingDates),
			],
			[
				brand.info('Missing Descriptions'),
				brand.dim(missingDescriptions.toString()),
				getStatus(missingDescriptions),
			],
			[
				brand.info('Uncategorized Episodes'),
				brand.dim(uncategorized.toString()),
				getStatus(uncategorized),
			],
		);

		console.log(qualityTable.toString());

		// Summary statistics table
		const summaryTable = new Table({
			head: [
				brand.highlight('Summary Statistics'),
				brand.highlight('Value'),
			],
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
			colWidths: [25, 15],
		});

		const seasons = [...new Set(episodes.map((ep) => ep.season_number))]
			.length;
		const categories = [
			...new Set(
				episodes.flatMap((ep) => ep.tags.map((tag) => tag.category)),
			),
		].length;

		summaryTable.push(
			[
				brand.info('Total Episodes'),
				brand.success(episodes.length.toString()),
			],
			[brand.info('Total Seasons'), brand.success(seasons.toString())],
			[
				brand.info('Unique Categories'),
				brand.success(categories.toString()),
			],
			[
				brand.info('Data Completeness'),
				brand.success(
					`${(
						((episodes.length - missingTitles - missingDates) /
							episodes.length) *
						100
					).toFixed(1)}%`,
				),
			],
		);

		console.log('\n' + summaryTable.toString());

		// Success animation
		try {
			// Display the Hot Ones banner first
			console.log(
				brand.success('\n🎉 Scraping completed successfully! 🎉'),
			);

			const banner = await ASCIIArt.getHotOnesBanner();
			console.log(banner);

			// Add animated rainbow effect if available
			if (
				chalkAnimation &&
				typeof chalkAnimation.rainbow === 'function'
			) {
				successAnimation = chalkAnimation.rainbow(
					'🔥 CHALLENGE COMPLETED! DATA SCRAPED! 🔥',
				);
				await new Promise((resolve) => setTimeout(resolve, 2000));
				successAnimation.stop();
			}

			// Show victory banner
			console.log(ASCIIArt.getVictoryBanner());
		} catch (animationError) {
			// Fallback if figlet or animation fails
			console.log(
				brand.success('\n🎉 Scraping completed successfully! 🎉'),
			);
			console.log(ASCIIArt.getSimpleBanner());
			console.log(ASCIIArt.getVictoryBanner());
			console.log(
				brand.dim(
					'(Figlet/animation error:',
					String(animationError) + ')',
				),
			);
		}

		console.log(brand.success('\n✅ All done! Ready to use with the CLI.'));

		console.log(brand.success("\n Get started with: 'npm run cli'"));
	} catch (error) {
		console.error(brand.error('\n❌ Error during scraping:'), error);
		process.exit(1);
	}
}

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

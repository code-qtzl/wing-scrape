import { HotOnesScraper } from './hot-ones-scraper';
import { HotOnesEpisode } from './types';
import * as fs from 'fs';
import * as path from 'path';

async function main(): Promise<void> {
	try {
		console.log('🔥 Starting Hot Ones Episode Scraper...\n');
		
		const scraper = new HotOnesScraper();
		const episodes = await scraper.scrapeAllEpisodes();
		
		if (episodes.length === 0) {
			console.log('⚠️  No episodes found. Check the scraper logic.');
			return;
		}

		// Save to JSON file
		const outputPath = path.join(process.cwd(), 'hot-ones-report.json');
		fs.writeFileSync(outputPath, JSON.stringify(episodes, null, 2));
		console.log(`\n💾 Episodes saved to: ${outputPath}`);

		// Validate data quality
		console.log('\n🔍 Data Quality Check:');
		const missingTitles = episodes.filter(ep => !ep.title).length;
		const missingDates = episodes.filter(ep => !ep.air_date).length;
		const missingDescriptions = episodes.filter(ep => !ep.description).length;
		const uncategorized = episodes.filter(ep => 
			ep.tags.length === 1 && ep.tags[0].category === 'Other' && ep.tags[0].sub_categories.includes('Unknown')
		).length;

		console.log(`Missing titles: ${missingTitles}`);
		console.log(`Missing air dates: ${missingDates}`);
		console.log(`Missing descriptions: ${missingDescriptions}`);
		console.log(`Uncategorized episodes: ${uncategorized}`);

		console.log('\n✅ Scraping completed successfully!');

	} catch (error) {
		console.error('❌ Error during scraping:', error);
		process.exit(1);
	}
}

if (require.main === module) {
	main().catch((error) => {
		console.error('Fatal error:', error);
		process.exit(1);
	});
}

export interface HotOnesEpisode {
	season_number: number;
	episode_number: number;
	title: string;
	air_date: string;
	description: string;
	tags: EpisodeTag[];
}

export interface EpisodeTag {
	category: string;
	sub_categories: string[];
}

export interface ProfessionTaxonomy {
	[category: string]: string[];
}

export const PROFESSION_TAXONOMY: ProfessionTaxonomy = {
	'Movie/TV': [
		'Actor',
		'Actress',
		'Director',
		'Producer',
		'Screenwriter',
		'TV Personality',
	],
	Music: ['Rapper', 'Singer', 'Musician', 'Songwriter', 'DJ'],
	Comedy: ['Stand-up Comedian', 'Sketch Comedian', 'Comedy Actor'],
	Sports: ['Basketball Player', 'Football Player', 'Olympian', 'Athlete'],
	'Food/Culinary': ['Chef', 'Food Critic', 'Restaurateur'],
	'Internet/Social Media': ['YouTuber', 'TikToker', 'Streamer', 'Influencer'],
	Other: ['Author', 'Scientist', 'Politician', 'Journalist'],
};

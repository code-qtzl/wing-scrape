import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

export class TerminalImageRenderer {
	/**
	 * Display thumbnail in terminal if supported
	 * Works with iTerm2, Kitty, and other compatible terminals
	 */
	static async displayThumbnail(
		thumbnailUrl: string,
		width: number = 200,
	): Promise<void> {
		try {
			if (process.env.TERM_PROGRAM === 'iTerm.app') {
				await this.displayITermImage(thumbnailUrl, width);
			} else if (process.env.TERM === 'xterm-kitty') {
				await this.displayKittyImage(thumbnailUrl, width);
			} else {
				// Fallback: just show the URL
				console.log(chalk.dim(`🖼️  Thumbnail: ${thumbnailUrl}`));
			}
		} catch (error) {
			// Silent fallback to URL display
			console.log(chalk.dim(`🖼️  Thumbnail: ${thumbnailUrl}`));
		}
	}

	/**
	 * Display image using iTerm2's inline image protocol
	 */
	private static async displayITermImage(
		url: string,
		width: number,
	): Promise<void> {
		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error('Failed to fetch image');

			const buffer = await response.arrayBuffer();
			const base64 = Buffer.from(buffer).toString('base64');

			// iTerm2 image protocol
			const imageCode = `\x1b]1337;File=inline=1;width=${width}px:${base64}\x07`;
			process.stdout.write(imageCode);
			process.stdout.write('\n');
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Display image using Kitty terminal's graphics protocol
	 */
	private static async displayKittyImage(
		url: string,
		width: number,
	): Promise<void> {
		try {
			// Download image to temp location and use kitty's icat
			const tempFile = `/tmp/thumb_${Date.now()}.jpg`;
			await execAsync(`curl -s "${url}" -o "${tempFile}"`);
			await execAsync(
				`kitty +kitten icat --align=left --width=${Math.floor(
					width / 10,
				)} "${tempFile}"`,
			);
			await execAsync(`rm "${tempFile}"`); // Clean up
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Generate ASCII art representation of the image (fallback)
	 */
	static async displayASCIIThumbnail(thumbnailUrl: string): Promise<void> {
		try {
			// This would require image-to-ascii conversion
			// For now, just display a placeholder
			console.log(chalk.dim('┌─────────────────┐'));
			console.log(chalk.dim('│   🎬 THUMBNAIL   │'));
			console.log(chalk.dim('│                 │'));
			console.log(chalk.dim('│   Hot Ones      │'));
			console.log(chalk.dim('│   Episode       │'));
			console.log(chalk.dim('└─────────────────┘'));
			console.log(chalk.dim(`🔗 ${thumbnailUrl}`));
		} catch (error) {
			console.log(chalk.dim(`🖼️  Thumbnail: ${thumbnailUrl}`));
		}
	}

	/**
	 * Check if terminal supports images
	 */
	static supportsImages(): boolean {
		return (
			process.env.TERM_PROGRAM === 'iTerm.app' ||
			process.env.TERM === 'xterm-kitty' ||
			process.env.TERM_PROGRAM === 'WezTerm'
		);
	}

	/**
	 * Get terminal capabilities info
	 */
	static getTerminalInfo(): string {
		const term = process.env.TERM_PROGRAM || process.env.TERM || 'unknown';
		const supportsImages = this.supportsImages();

		return `Terminal: ${term} (Images: ${supportsImages ? '✅' : '❌'})`;
	}
}

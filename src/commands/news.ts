/**
 * News Command - Personalized news digest and research
 *
 * Main command for news aggregation and research functionality.
 * Includes subcommands for feeds, research, and perspective analysis.
 */

import { Command } from 'commander';
import { colors } from '../lib/cli/formatting';
import { isInitialized } from '../lib/context-loader';
import {
	type SourceCategory,
	analyzePerspectiveBalance,
	analyzePerspectives,
	feedFetcher,
	formatDigestForTerminal,
	formatPerspectiveAnalysis,
	generateNewsDigest,
	generatePerspectiveWarnings,
	generateQuickDigest,
} from '../lib/research';

// ============================================
// Main News Command
// ============================================

export const newsCommand = new Command('news')
	.description('Get personalized news digest')
	.option('-c, --category <name>', 'Filter by specific category')
	.option('-q, --quick', 'Quick mode without AI summaries')
	.option('-n, --max <number>', 'Maximum items per category', '10')
	.option('--compact', 'Compact output format')
	.option('--no-goals', 'Hide goal-relevant section')
	.action(async (options) => {
		// Check initialization
		if (!(await isInitialized())) {
			console.log(
				`${colors.red}Error: Yxhyx not initialized. Run 'yxhyx init' first.${colors.reset}`
			);
			return;
		}

		console.log(`${colors.dim}Fetching news feeds...${colors.reset}\n`);

		try {
			const categories = options.category ? [options.category] : undefined;
			const maxItems = Number.parseInt(options.max, 10) || 10;

			// Generate digest
			const digest = options.quick
				? await generateQuickDigest({ categories, maxItemsPerCategory: maxItems })
				: await generateNewsDigest({
						categories,
						maxItemsPerCategory: maxItems,
						generateHighlights: true,
					});

			// Handle empty results
			if (digest.stats.totalItems === 0) {
				console.log(`${colors.yellow}No news items found.${colors.reset}`);
				console.log('\nThis could mean:');
				console.log('  - No feeds configured (run: yxhyx news feeds list)');
				console.log('  - Feeds are temporarily unavailable');
				console.log('  - All items are older than 48 hours');
				return;
			}

			// Format and display
			const output = formatDigestForTerminal(digest, {
				showSummaries: !options.compact,
				showGoalRelevant: options.goals !== false,
				compact: options.compact,
			});

			console.log(output);

			// Check perspective balance
			const allSources = digest.categories.flatMap((c) =>
				c.items.map((i) => ({
					name: i.source,
				}))
			);

			if (allSources.length > 5) {
				const balance = analyzePerspectiveBalance(allSources);
				const warnings = generatePerspectiveWarnings(balance);

				if (warnings.length > 0) {
					console.log(`\n${colors.yellow}Perspective Warnings:${colors.reset}`);
					for (const warning of warnings) {
						console.log(`  ${warning}`);
					}
				}
			}
		} catch (error) {
			console.error(`${colors.red}Error fetching news:${colors.reset}`, error);
		}
	});

// ============================================
// Research Subcommand
// ============================================

newsCommand
	.command('research <query>')
	.description('Research a topic')
	.option('-d, --deep', 'Use multi-model deep research')
	.option('--no-verify', 'Skip URL verification')
	.action(async (query, options) => {
		try {
			if (options.deep) {
				console.log(`${colors.dim}Running multi-model deep research...${colors.reset}\n`);

				const { standardResearch, formatStandardResearchResult } = await import(
					'../lib/research/standard-research'
				);

				const result = await standardResearch(query, {
					verifyUrls: options.verify !== false,
				});

				console.log(formatStandardResearchResult(result));
			} else {
				console.log(`${colors.dim}Running quick research...${colors.reset}\n`);

				const { quickResearch, formatQuickResearchResult } = await import(
					'../lib/research/quick-research'
				);

				const result = await quickResearch(query, {
					verifyUrls: options.verify !== false,
				});

				console.log(formatQuickResearchResult(result));
			}
		} catch (error) {
			console.error(`${colors.red}Research failed:${colors.reset}`, error);
		}
	});

// ============================================
// Define Subcommand
// ============================================

newsCommand
	.command('define <term>')
	.description('Get a quick definition of a term')
	.action(async (term) => {
		try {
			console.log(`${colors.dim}Looking up definition...${colors.reset}\n`);

			const { quickDefine } = await import('../lib/research/quick-research');

			const result = await quickDefine(term);

			console.log(`${colors.bold}${result.term}${colors.reset}`);
			console.log('');
			console.log(result.definition);

			if (result.relatedTerms.length > 0) {
				console.log(`\n${colors.dim}Related:${colors.reset} ${result.relatedTerms.join(', ')}`);
			}

			console.log(`\n${colors.dim}Cost: $${result.cost.toFixed(4)}${colors.reset}`);
		} catch (error) {
			console.error(`${colors.red}Definition lookup failed:${colors.reset}`, error);
		}
	});

// ============================================
// Fact-Check Subcommand
// ============================================

newsCommand
	.command('check <claim>')
	.description('Fact-check a claim')
	.action(async (claim) => {
		try {
			console.log(`${colors.dim}Fact-checking claim...${colors.reset}\n`);

			const { quickFactCheck } = await import('../lib/research/quick-research');

			const result = await quickFactCheck(claim);

			const assessmentColors: Record<string, string> = {
				likely_true: colors.green,
				likely_false: colors.red,
				uncertain: colors.yellow,
				needs_context: colors.cyan,
			};

			const color = assessmentColors[result.assessment] || colors.reset;

			console.log(`Claim: "${result.claim}"\n`);
			console.log(`Assessment: ${color}${result.assessment.toUpperCase()}${colors.reset}`);
			console.log(`\n${result.explanation}`);

			if (result.sources.length > 0) {
				console.log('\nSources:');
				for (const source of result.sources) {
					const icon = source.verified ? '' : '';
					console.log(`  ${icon} ${source.title}: ${source.url}`);
				}
			}

			console.log(`\n${colors.dim}Cost: $${result.cost.toFixed(4)}${colors.reset}`);
		} catch (error) {
			console.error(`${colors.red}Fact-check failed:${colors.reset}`, error);
		}
	});

// ============================================
// Compare Subcommand
// ============================================

newsCommand
	.command('compare <topicA> <topicB>')
	.description('Compare two topics or options')
	.action(async (topicA, topicB) => {
		try {
			console.log(`${colors.dim}Comparing "${topicA}" vs "${topicB}"...${colors.reset}\n`);

			const { compareResearch } = await import('../lib/research/standard-research');

			const result = await compareResearch(topicA, topicB);

			// Display Topic A
			console.log(`${colors.bold}${result.topicA.topic}${colors.reset}`);
			console.log(result.topicA.summary);

			if (result.topicA.pros.length > 0) {
				console.log(`\n${colors.green}Pros:${colors.reset}`);
				for (const pro of result.topicA.pros) {
					console.log(`  + ${pro}`);
				}
			}

			if (result.topicA.cons.length > 0) {
				console.log(`\n${colors.red}Cons:${colors.reset}`);
				for (const con of result.topicA.cons) {
					console.log(`  - ${con}`);
				}
			}

			console.log(`\n${'='.repeat(40)}\n`);

			// Display Topic B
			console.log(`${colors.bold}${result.topicB.topic}${colors.reset}`);
			console.log(result.topicB.summary);

			if (result.topicB.pros.length > 0) {
				console.log(`\n${colors.green}Pros:${colors.reset}`);
				for (const pro of result.topicB.pros) {
					console.log(`  + ${pro}`);
				}
			}

			if (result.topicB.cons.length > 0) {
				console.log(`\n${colors.red}Cons:${colors.reset}`);
				for (const con of result.topicB.cons) {
					console.log(`  - ${con}`);
				}
			}

			// Comparison
			if (result.comparison) {
				console.log(`\n${colors.bold}Direct Comparison:${colors.reset}`);
				console.log(result.comparison);
			}

			if (result.recommendation) {
				console.log(`\n${colors.bold}Recommendation:${colors.reset}`);
				console.log(result.recommendation);
			}

			console.log(`\n${colors.dim}Cost: $${result.cost.toFixed(4)}${colors.reset}`);
		} catch (error) {
			console.error(`${colors.red}Comparison failed:${colors.reset}`, error);
		}
	});

// ============================================
// Feeds Subcommand
// ============================================

const feedsCommand = newsCommand.command('feeds').description('Manage RSS feeds');

feedsCommand
	.command('list')
	.description('List configured feeds')
	.action(async () => {
		try {
			const stats = await feedFetcher.getStats();
			const config = await feedFetcher.loadConfig();

			console.log(`\n${colors.bold}Configured RSS Feeds${colors.reset}`);
			console.log(`Total: ${stats.totalFeeds} feeds in ${stats.categories} categories\n`);

			for (const [category, feeds] of Object.entries(config.feeds)) {
				console.log(`${colors.cyan}${category}${colors.reset} (${feeds.length} feeds)`);

				for (const feed of feeds) {
					const priority = feed.priority === 'high' ? '' : feed.priority === 'low' ? '' : '';
					console.log(`  ${priority} ${feed.name}`);
					console.log(`     ${colors.dim}${feed.url}${colors.reset}`);
					console.log(`     Type: ${feed.type} | Priority: ${feed.priority}`);
				}

				console.log('');
			}
		} catch (error) {
			console.error(`${colors.red}Error listing feeds:${colors.reset}`, error);
		}
	});

feedsCommand
	.command('add <url>')
	.description('Add a custom RSS feed')
	.option('-n, --name <name>', 'Feed name')
	.option('-c, --category <category>', 'Category to add to', 'custom')
	.option('-t, --type <type>', 'Source type', 'newsletter')
	.option('-p, --priority <priority>', 'Priority level', 'medium')
	.action(async (url, options) => {
		try {
			const name = options.name || new URL(url).hostname;

			await feedFetcher.addFeed(options.category, {
				name,
				url,
				type: options.type as SourceCategory,
				priority: options.priority,
			});

			console.log(`${colors.green}Added feed:${colors.reset} ${name}`);
			console.log(`  URL: ${url}`);
			console.log(`  Category: ${options.category}`);
		} catch (error) {
			console.error(`${colors.red}Error adding feed:${colors.reset}`, error);
		}
	});

feedsCommand
	.command('remove <url>')
	.description('Remove a feed by URL')
	.option('-c, --category <category>', 'Category to remove from')
	.action(async (url, options) => {
		try {
			const config = await feedFetcher.loadConfig();
			const categories = options.category ? [options.category] : Object.keys(config.feeds);

			let removed = false;

			for (const category of categories) {
				if (await feedFetcher.removeFeed(category, url)) {
					console.log(`${colors.green}Removed feed from ${category}${colors.reset}`);
					removed = true;
					break;
				}
			}

			if (!removed) {
				console.log(`${colors.yellow}Feed not found: ${url}${colors.reset}`);
			}
		} catch (error) {
			console.error(`${colors.red}Error removing feed:${colors.reset}`, error);
		}
	});

feedsCommand
	.command('refresh')
	.description('Clear feed cache and refresh')
	.action(async () => {
		try {
			await feedFetcher.clearCache();
			console.log(`${colors.green}Feed cache cleared.${colors.reset}`);
			console.log('Run `yxhyx news` to fetch fresh content.');
		} catch (error) {
			console.error(`${colors.red}Error clearing cache:${colors.reset}`, error);
		}
	});

// ============================================
// Perspective Subcommand
// ============================================

newsCommand
	.command('perspective')
	.description('Analyze source perspective diversity')
	.action(async () => {
		try {
			console.log(`${colors.dim}Analyzing source diversity...${colors.reset}\n`);

			// Fetch all feeds
			const allFeeds = await feedFetcher.fetchAllCategories();
			const allItems = Object.values(allFeeds).flat();

			if (allItems.length === 0) {
				console.log(`${colors.yellow}No items to analyze. Run 'yxhyx news' first.${colors.reset}`);
				return;
			}

			// Extract unique sources
			const sources = [...new Set(allItems.map((i) => i.source))].map((name) => ({
				name,
			}));

			// Analyze
			const analysis = analyzePerspectives(sources);

			console.log(formatPerspectiveAnalysis(analysis));
		} catch (error) {
			console.error(`${colors.red}Perspective analysis failed:${colors.reset}`, error);
		}
	});

// ============================================
// Categories Subcommand
// ============================================

newsCommand
	.command('categories')
	.description('List available news categories')
	.action(async () => {
		try {
			const categories = await feedFetcher.getCategories();

			if (categories.length === 0) {
				console.log(`${colors.yellow}No categories configured.${colors.reset}`);
				console.log('Add feeds with: yxhyx news feeds add <url>');
				return;
			}

			console.log(`\n${colors.bold}Available Categories:${colors.reset}\n`);

			for (const category of categories) {
				console.log(`  - ${category}`);
			}

			console.log('\nUse: yxhyx news -c <category> to filter by category');
		} catch (error) {
			console.error(`${colors.red}Error listing categories:${colors.reset}`, error);
		}
	});

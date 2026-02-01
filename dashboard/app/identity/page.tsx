import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { isInitialized, loadIdentity } from '@/lib/data';
import { formatDate } from '@/lib/utils';
import {
	AlertTriangle,
	Book,
	Clock,
	Heart,
	Lightbulb,
	MapPin,
	Settings,
	Sparkles,
	User,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function IdentityPage() {
	const initialized = await isInitialized();

	if (!initialized) {
		return (
			<div className="min-h-[80vh] flex items-center justify-center">
				<EmptyState
					icon={Sparkles}
					title="Identity Not Found"
					description="Yxhyx hasn't been initialized yet. Run 'yxhyx init' in your terminal to create your identity."
				/>
			</div>
		);
	}

	const identity = await loadIdentity();

	if (!identity) {
		return (
			<div className="min-h-[80vh] flex items-center justify-center">
				<EmptyState
					icon={User}
					title="Could Not Load Identity"
					description="There was an error loading your identity file. Check that ~/.yxhyx/identity/identity.yaml exists and is valid."
				/>
			</div>
		);
	}

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">Identity</h1>
					<p className="text-foreground-muted mt-2">Your personal context and preferences</p>
				</div>
				<div className="text-sm text-foreground-muted">
					Last updated: {formatDate(identity.last_updated)}
				</div>
			</div>

			{/* About Section */}
			<Card>
				<CardHeader>
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent-hover flex items-center justify-center">
							<User className="w-6 h-6 text-white" />
						</div>
						<div>
							<CardTitle>{identity.about.name}</CardTitle>
							<CardDescription className="flex items-center gap-4 mt-1">
								{identity.about.location && (
									<span className="flex items-center gap-1">
										<MapPin className="w-4 h-4" />
										{identity.about.location}
									</span>
								)}
								<span className="flex items-center gap-1">
									<Clock className="w-4 h-4" />
									{identity.about.timezone}
								</span>
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					{identity.about.background && (
						<div>
							<h4 className="text-sm font-medium text-foreground-muted mb-2">Background</h4>
							<p className="text-foreground">{identity.about.background}</p>
						</div>
					)}
					{identity.about.expertise.length > 0 && (
						<div>
							<h4 className="text-sm font-medium text-foreground-muted mb-2">Expertise</h4>
							<div className="flex flex-wrap gap-2">
								{identity.about.expertise.map((skill, idx) => (
									<Badge key={idx} variant="info">
										{skill}
									</Badge>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Mission */}
			{identity.mission && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Sparkles className="w-5 h-5 text-primary" />
							Mission
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-foreground text-lg italic">"{identity.mission}"</p>
					</CardContent>
				</Card>
			)}

			{/* Two Column Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Beliefs */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Heart className="w-5 h-5 text-accent-red" />
							Beliefs
						</CardTitle>
						<Badge variant="default">{identity.beliefs.length}</Badge>
					</CardHeader>
					<CardContent>
						{identity.beliefs.length > 0 ? (
							<div className="space-y-3">
								{identity.beliefs.map((belief, idx) => (
									<div
										key={idx}
										className="p-4 rounded-xl bg-background-light/50 border border-border/50"
									>
										<p className="text-foreground">{belief.statement}</p>
										<div className="flex items-center gap-4 mt-2">
											<span className="text-xs text-foreground-muted">
												Confidence: {Math.round(belief.confidence * 100)}%
											</span>
											<span className="text-xs text-foreground-dimmed">
												Added: {formatDate(belief.added)}
											</span>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-foreground-muted text-center py-4">No beliefs recorded yet</p>
						)}
					</CardContent>
				</Card>

				{/* Challenges */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<AlertTriangle className="w-5 h-5 text-accent-orange" />
							Challenges
						</CardTitle>
						<Badge variant="warning">
							{identity.challenges.filter((c) => c.status === 'active').length} active
						</Badge>
					</CardHeader>
					<CardContent>
						{identity.challenges.length > 0 ? (
							<div className="space-y-3">
								{identity.challenges.map((challenge) => (
									<div
										key={challenge.id}
										className="p-4 rounded-xl bg-background-light/50 border border-border/50"
									>
										<div className="flex items-start justify-between mb-2">
											<h4 className="font-medium text-foreground">{challenge.title}</h4>
											<Badge
												variant={
													challenge.status === 'active'
														? 'warning'
														: challenge.status === 'resolved'
															? 'success'
															: 'default'
												}
												size="sm"
											>
												{challenge.status}
											</Badge>
										</div>
										<p className="text-sm text-foreground-muted">{challenge.description}</p>
									</div>
								))}
							</div>
						) : (
							<p className="text-foreground-muted text-center py-4">No challenges recorded</p>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Interests */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Lightbulb className="w-5 h-5 text-accent-yellow" />
						Interests
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* High Priority */}
						<div>
							<h4 className="text-sm font-medium text-accent-red mb-3 flex items-center gap-2">
								<span className="w-2 h-2 rounded-full bg-accent-red" />
								High Priority
							</h4>
							<div className="space-y-2">
								{identity.interests.high_priority.map((interest, idx) => (
									<div key={idx} className="p-3 rounded-xl bg-background-light/50">
										<p className="font-medium text-foreground">{interest.topic}</p>
										{interest.subtopics.length > 0 && (
											<div className="flex flex-wrap gap-1 mt-2">
												{interest.subtopics.map((sub, subIdx) => (
													<Badge key={subIdx} variant="default" size="sm">
														{sub}
													</Badge>
												))}
											</div>
										)}
									</div>
								))}
								{identity.interests.high_priority.length === 0 && (
									<p className="text-sm text-foreground-muted">None set</p>
								)}
							</div>
						</div>

						{/* Medium Priority */}
						<div>
							<h4 className="text-sm font-medium text-accent-yellow mb-3 flex items-center gap-2">
								<span className="w-2 h-2 rounded-full bg-accent-yellow" />
								Medium Priority
							</h4>
							<div className="space-y-2">
								{identity.interests.medium_priority.map((interest, idx) => (
									<div key={idx} className="p-3 rounded-xl bg-background-light/50">
										<p className="font-medium text-foreground">{interest.topic}</p>
										{interest.subtopics.length > 0 && (
											<div className="flex flex-wrap gap-1 mt-2">
												{interest.subtopics.map((sub, subIdx) => (
													<Badge key={subIdx} variant="default" size="sm">
														{sub}
													</Badge>
												))}
											</div>
										)}
									</div>
								))}
								{identity.interests.medium_priority.length === 0 && (
									<p className="text-sm text-foreground-muted">None set</p>
								)}
							</div>
						</div>

						{/* Low Priority */}
						<div>
							<h4 className="text-sm font-medium text-accent-cyan mb-3 flex items-center gap-2">
								<span className="w-2 h-2 rounded-full bg-accent-cyan" />
								Low Priority
							</h4>
							<div className="space-y-2">
								{identity.interests.low_priority.map((interest, idx) => (
									<div key={idx} className="p-3 rounded-xl bg-background-light/50">
										<p className="font-medium text-foreground">{interest.topic}</p>
										{interest.subtopics.length > 0 && (
											<div className="flex flex-wrap gap-1 mt-2">
												{interest.subtopics.map((sub, subIdx) => (
													<Badge key={subIdx} variant="default" size="sm">
														{sub}
													</Badge>
												))}
											</div>
										)}
									</div>
								))}
								{identity.interests.low_priority.length === 0 && (
									<p className="text-sm text-foreground-muted">None set</p>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Preferences */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Settings className="w-5 h-5 text-foreground-muted" />
						Preferences
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Communication */}
						<div className="p-4 rounded-xl bg-background-light/50">
							<h4 className="font-medium text-foreground mb-3">Communication</h4>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-foreground-muted">Style</span>
									<span className="text-foreground capitalize">
										{identity.preferences.communication.style}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-foreground-muted">Length</span>
									<span className="text-foreground capitalize">
										{identity.preferences.communication.length}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-foreground-muted">Formality</span>
									<span className="text-foreground capitalize">
										{identity.preferences.communication.formality}
									</span>
								</div>
							</div>
						</div>

						{/* Tech Stack */}
						<div className="p-4 rounded-xl bg-background-light/50">
							<h4 className="font-medium text-foreground mb-3">Tech Stack</h4>
							<div className="space-y-2 text-sm">
								<div>
									<span className="text-foreground-muted">Languages</span>
									<div className="flex flex-wrap gap-1 mt-1">
										{identity.preferences.tech_stack.languages.map((lang, idx) => (
											<Badge key={idx} variant="info" size="sm">
												{lang}
											</Badge>
										))}
									</div>
								</div>
								<div className="flex justify-between">
									<span className="text-foreground-muted">Package Manager</span>
									<span className="text-foreground">
										{identity.preferences.tech_stack.package_manager}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-foreground-muted">Testing</span>
									<span className="text-foreground">{identity.preferences.tech_stack.testing}</span>
								</div>
							</div>
						</div>

						{/* News */}
						<div className="p-4 rounded-xl bg-background-light/50">
							<h4 className="font-medium text-foreground mb-3">News</h4>
							<div className="space-y-2 text-sm">
								<div className="flex justify-between">
									<span className="text-foreground-muted">Format</span>
									<span className="text-foreground capitalize">
										{identity.preferences.news.format.replace(/_/g, ' ')}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-foreground-muted">Max Items</span>
									<span className="text-foreground">{identity.preferences.news.max_items}</span>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Recent Lessons */}
			{identity.learned.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Book className="w-5 h-5 text-accent-green" />
							Recent Lessons
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{identity.learned
								.slice(-5)
								.reverse()
								.map((lesson, idx) => (
									<div
										key={idx}
										className="p-4 rounded-xl bg-background-light/50 border border-border/50"
									>
										<p className="text-foreground">{lesson.lesson}</p>
										<div className="flex items-center gap-4 mt-2">
											{lesson.context && (
												<span className="text-xs text-foreground-muted">
													Context: {lesson.context}
												</span>
											)}
											<span className="text-xs text-foreground-dimmed">
												{formatDate(lesson.date)}
											</span>
										</div>
									</div>
								))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Edit Notice */}
			<div className="glass-panel rounded-xl p-4 flex items-center gap-4">
				<div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
					<Settings className="w-5 h-5 text-primary" />
				</div>
				<div>
					<p className="text-sm text-foreground">
						To edit your identity, use the CLI commands or edit{' '}
						<code className="px-2 py-0.5 rounded bg-background-lighter text-primary font-mono text-xs">
							~/.yxhyx/identity/identity.yaml
						</code>{' '}
						directly.
					</p>
				</div>
			</div>
		</div>
	);
}

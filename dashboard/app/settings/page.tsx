import { homedir } from 'os';
import { join } from 'path';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { isInitialized, loadIdentity } from '@/lib/data';
import { ExternalLink, FileCode, Folder, Settings, Sparkles, Terminal } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
	const initialized = await isInitialized();
	const identity = initialized ? await loadIdentity() : null;
	const yxhyxDir = join(homedir(), '.yxhyx');

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-foreground">Settings</h1>
				<p className="text-foreground-muted mt-2">Dashboard configuration and system information</p>
			</div>

			{/* System Status */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Sparkles className="w-5 h-5 text-primary" />
						System Status
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div className="p-4 rounded-xl bg-background-light/50">
							<div className="flex items-center justify-between">
								<span className="text-foreground-muted">Yxhyx Status</span>
								<Badge variant={initialized ? 'success' : 'error'}>
									{initialized ? 'Initialized' : 'Not Initialized'}
								</Badge>
							</div>
						</div>
						<div className="p-4 rounded-xl bg-background-light/50">
							<div className="flex items-center justify-between">
								<span className="text-foreground-muted">Identity Version</span>
								<span className="text-foreground font-mono">{identity?.version || '-'}</span>
							</div>
						</div>
						<div className="p-4 rounded-xl bg-background-light/50">
							<div className="flex items-center justify-between">
								<span className="text-foreground-muted">User</span>
								<span className="text-foreground">{identity?.about.name || '-'}</span>
							</div>
						</div>
						<div className="p-4 rounded-xl bg-background-light/50">
							<div className="flex items-center justify-between">
								<span className="text-foreground-muted">Timezone</span>
								<span className="text-foreground">{identity?.about.timezone || '-'}</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* File Paths */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Folder className="w-5 h-5 text-accent-yellow" />
						Data Locations
					</CardTitle>
					<CardDescription>Where Yxhyx stores your data</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<div className="flex items-center gap-4 p-4 rounded-xl bg-background-light/50">
							<FileCode className="w-5 h-5 text-foreground-muted" />
							<div className="flex-1">
								<p className="text-sm font-medium text-foreground">Yxhyx Directory</p>
								<code className="text-xs text-foreground-muted font-mono">{yxhyxDir}</code>
							</div>
						</div>
						<div className="flex items-center gap-4 p-4 rounded-xl bg-background-light/50">
							<FileCode className="w-5 h-5 text-foreground-muted" />
							<div className="flex-1">
								<p className="text-sm font-medium text-foreground">Identity File</p>
								<code className="text-xs text-foreground-muted font-mono">
									{join(yxhyxDir, 'identity/identity.yaml')}
								</code>
							</div>
						</div>
						<div className="flex items-center gap-4 p-4 rounded-xl bg-background-light/50">
							<FileCode className="w-5 h-5 text-foreground-muted" />
							<div className="flex-1">
								<p className="text-sm font-medium text-foreground">Memory Directory</p>
								<code className="text-xs text-foreground-muted font-mono">
									{join(yxhyxDir, 'memory/')}
								</code>
							</div>
						</div>
						<div className="flex items-center gap-4 p-4 rounded-xl bg-background-light/50">
							<FileCode className="w-5 h-5 text-foreground-muted" />
							<div className="flex-1">
								<p className="text-sm font-medium text-foreground">Config Directory</p>
								<code className="text-xs text-foreground-muted font-mono">
									{join(yxhyxDir, 'config/')}
								</code>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* CLI Commands */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Terminal className="w-5 h-5 text-accent-cyan" />
						Quick Commands
					</CardTitle>
					<CardDescription>Common CLI commands for managing Yxhyx</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="p-4 rounded-xl bg-background-light/50">
							<p className="text-sm font-medium text-foreground mb-2">Initialize</p>
							<code className="text-sm text-accent-cyan font-mono bg-background-lighter px-3 py-2 rounded-lg block">
								yxhyx init
							</code>
						</div>
						<div className="p-4 rounded-xl bg-background-light/50">
							<p className="text-sm font-medium text-foreground mb-2">Check Status</p>
							<code className="text-sm text-accent-cyan font-mono bg-background-lighter px-3 py-2 rounded-lg block">
								yxhyx status
							</code>
						</div>
						<div className="p-4 rounded-xl bg-background-light/50">
							<p className="text-sm font-medium text-foreground mb-2">Morning Check-in</p>
							<code className="text-sm text-accent-cyan font-mono bg-background-lighter px-3 py-2 rounded-lg block">
								yxhyx checkin morning
							</code>
						</div>
						<div className="p-4 rounded-xl bg-background-light/50">
							<p className="text-sm font-medium text-foreground mb-2">View Identity</p>
							<code className="text-sm text-accent-cyan font-mono bg-background-lighter px-3 py-2 rounded-lg block">
								yxhyx identity show
							</code>
						</div>
						<div className="p-4 rounded-xl bg-background-light/50">
							<p className="text-sm font-medium text-foreground mb-2">Add Goal</p>
							<code className="text-sm text-accent-cyan font-mono bg-background-lighter px-3 py-2 rounded-lg block">
								yxhyx identity add-goal "Goal" -t short
							</code>
						</div>
						<div className="p-4 rounded-xl bg-background-light/50">
							<p className="text-sm font-medium text-foreground mb-2">View Costs</p>
							<code className="text-sm text-accent-cyan font-mono bg-background-lighter px-3 py-2 rounded-lg block">
								yxhyx cost -d
							</code>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Dashboard Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Settings className="w-5 h-5 text-foreground-muted" />
						Dashboard Info
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<div className="flex items-center justify-between p-4 rounded-xl bg-background-light/50">
							<span className="text-foreground-muted">Dashboard Version</span>
							<span className="text-foreground font-mono">0.1.0</span>
						</div>
						<div className="flex items-center justify-between p-4 rounded-xl bg-background-light/50">
							<span className="text-foreground-muted">Framework</span>
							<span className="text-foreground">Next.js 14</span>
						</div>
						<div className="flex items-center justify-between p-4 rounded-xl bg-background-light/50">
							<span className="text-foreground-muted">Data Refresh</span>
							<span className="text-foreground">On page load (server components)</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Links */}
			<div className="glass-panel rounded-xl p-4 flex items-center gap-4">
				<div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
					<ExternalLink className="w-5 h-5 text-primary" />
				</div>
				<div className="flex-1">
					<p className="text-sm text-foreground">
						This dashboard is read-only. To modify your identity or settings, use the CLI or edit
						the YAML files directly.
					</p>
				</div>
			</div>
		</div>
	);
}

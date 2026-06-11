import { useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react'
import {
	analyse,
	fetchReport,
	type AnalyseResponse,
	type ReportResponse,
	type SpellInfo,
	type Suggestion,
	type SuggestionCategory,
	type SuggestionDetail,
} from './api.js'

const mmss = (ms: number) => {
	const s = Math.max(0, Math.round(ms / 1000))
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
const pad6 = (n: number) => String(n).padStart(6, '0')
const iconUrl = (n: number) => `https://xivapi.com/i/${pad6(Math.floor(n / 1000) * 1000)}/${pad6(n)}.png`

const JOB_FR: Record<string, { fr: string; icon: string }> = { Warrior: { fr: 'Guerrier', icon: 'ti-axe' } }
const jobFr = (job: string) => JOB_FR[job] ?? { fr: job, icon: 'ti-sword' }

const CAT: Record<SuggestionCategory, { label: string; icon: string }> = {
	big: { label: 'Gros gain', icon: 'ti-sparkles' },
	small: { label: 'Petit gain', icon: 'ti-arrow-up-right' },
	strong: { label: 'Points forts', icon: 'ti-check' },
}
const CAT_ORDER: SuggestionCategory[] = ['big', 'small', 'strong']

function gradeLetter(suggestions: Suggestion[]): string {
	if (suggestions.length === 0) return '—'
	const big = suggestions.filter((s) => s.category === 'big').length
	const small = suggestions.filter((s) => s.category === 'small').length
	if (big === 0 && small === 0) return 'S'
	if (big === 0) return 'A'
	if (big <= 1) return 'B'
	return 'C'
}

export function App() {
	const [code, setCode] = useState('')
	const [report, setReport] = useState<ReportResponse | null>(null)
	const [actorId, setActorId] = useState<number | null>(null)
	const [result, setResult] = useState<AnalyseResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function loadReport(input: string) {
		setError(null); setLoading(true)
		try {
			const r = await fetchReport(input)
			setReport(r); setActorId(r.actors.find((a) => a.supported)?.id ?? null); setResult(null)
		} catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setLoading(false) }
	}

	async function runAnalyse(fightId: number) {
		if (actorId == null || !report) return
		setError(null); setLoading(true)
		try { setResult(await analyse(report.code, fightId, actorId)) }
		catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setLoading(false) }
	}

	if (result) return <Breakdown result={result} onBack={() => setResult(null)} />

	return (
		<div className="wrap">
			{!report ? (
				<Intro onSubmit={loadReport} loading={loading} error={error} value={code} setValue={setCode} />
			) : (
				<Picker report={report} actorId={actorId} setActorId={setActorId} onPick={runAnalyse} onReset={() => setReport(null)} loading={loading} error={error} />
			)}
		</div>
	)
}

function Intro(props: { onSubmit: (code: string) => void; loading: boolean; error: string | null; value: string; setValue: (v: string) => void }) {
	return (
		<div className="panel intro-card">
			<div className="tag">analyse synchronisée au niveau</div>
			<h1>xiv-mil-analysis</h1>
			<p>Colle le lien d'un report FFLogs (ou son code) pour analyser tes pulls — l'analyse s'adapte au niveau auquel tu étais synchronisé·e.</p>
			<div className="intro-row">
				<input type="text" placeholder="https://www.fflogs.com/reports/… ou le code" value={props.value}
					onChange={(e) => props.setValue(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && props.value && props.onSubmit(props.value)} />
				<button className="btn" disabled={props.loading || !props.value} onClick={() => props.onSubmit(props.value)}>
					{props.loading ? '…' : 'Analyser'}
				</button>
			</div>
			{props.error && <div className="err">{props.error}</div>}
		</div>
	)
}

function Picker(props: {
	report: ReportResponse; actorId: number | null; setActorId: (id: number) => void
	onPick: (fightId: number) => void; onReset: () => void; loading: boolean; error: string | null
}) {
	const { report } = props
	return (
		<>
			<div className="topbar">
				<div className="enc">
					<div className="enc-sigil"><i className="ti ti-list-details" /></div>
					<div>
						<h1 style={{ fontFamily: 'Cinzel', fontSize: 22, color: '#fff' }}>Choisis ton perso et un pull</h1>
						<div className="sub">{report.pulls.length} pulls · niveau {report.level ?? '?'}</div>
					</div>
				</div>
				<button className="btn btn-ghost" onClick={props.onReset}><i className="ti ti-arrow-left" /> Autre report</button>
			</div>

			<div className="section-title">Ton personnage</div>
			<div className="chips">
				{report.actors.map((a) => (
					<button key={a.id} className={`chip-actor ${a.id === props.actorId ? 'on' : ''} ${a.supported ? '' : 'off'}`}
						disabled={!a.supported} title={a.supported ? '' : 'Job pas encore supporté'} onClick={() => props.setActorId(a.id)}>
						<span className="jb">{jobFr(a.job).fr.slice(0, 3).toUpperCase()}</span>
						{a.name}
						{!a.supported && <span style={{ color: 'var(--txt-dim)', fontSize: 11 }}>· à venir</span>}
					</button>
				))}
			</div>

			<div className="section-title">Tes pulls</div>
			<div className="pull-list">
				{report.pulls.map((p) => (
					<div key={p.id} className={`pull ${props.actorId == null ? 'disabled' : ''}`} onClick={() => props.actorId != null && props.onPick(p.id)}>
						<i className="ti ti-swords" style={{ color: 'var(--war)', fontSize: 18 }} />
						<span className="nm">{p.encounterName}</span>
						<span className="dur">{mmss(p.durationMs)}</span>
						<i className="ti ti-chevron-right" style={{ color: 'var(--txt-dim)' }} />
					</div>
				))}
			</div>

			{props.loading && <div className="loading"><i className="ti ti-loader-2" />Analyse en cours…</div>}
			{props.error && <div className="err">{props.error}</div>}
		</>
	)
}

function Spell({ info }: { info: SpellInfo }) {
	return (
		<span className={`spell ${info.locked ? 'locked' : ''}`} data-spell={info.id}>
			{info.locked ? <i className="ti ti-lock" /> : <img className="sp-ic" src={iconUrl(info.icon)} alt="" />}
			{info.name}
		</span>
	)
}

function SpellText({ text, spells }: { text: string; spells: Map<number, SpellInfo> }) {
	const parts = text.split(/(\{\{\d+\}\})/g)
	return (
		<>
			{parts.map((p, i) => {
				const m = p.match(/^\{\{(\d+)\}\}$/)
				if (m) {
					const info = spells.get(Number(m[1]))
					return info ? <Spell key={i} info={info} /> : <span key={i}>?</span>
				}
				return <span key={i}>{p}</span>
			})}
		</>
	)
}

function BuffTimeline({ d }: { d: Extract<SuggestionDetail, { kind: 'buff-timeline' }> }) {
	const dur = d.fightEndMs - d.fightStartMs || 1
	const pct = (t: number) => ((t - d.fightStartMs) / dur) * 100
	const rel = (t: number) => mmss(t - d.fightStartMs)
	return (
		<div>
			<div className="dlabel">Buff actif (or) vs tombé (rouge) sur le combat</div>
			<div className="tl-track">
				{d.windows.map((w, i) => (
					<span key={i} className="tl-down" style={{ left: `${pct(w.startMs)}%`, width: `${Math.max(0.4, pct(w.endMs) - pct(w.startMs))}%` }} />
				))}
			</div>
			<div className="tl-axis"><span>0:00</span><span>{mmss(dur)}</span></div>
			{d.windows.length > 0 ? (
				<ul className="downlist">
					{d.windows.map((w, i) => (
						<li key={i}><b>{rel(w.startMs)} – {rel(w.endMs)}</b><span>{Math.round((w.endMs - w.startMs) / 1000)}s sans le buff</span></li>
					))}
				</ul>
			) : (
				<div className="empty">Aucune chute notable — buff maintenu tout le combat.</div>
			)}
		</div>
	)
}

function CooldownDriftDetail({ d, spells }: { d: Extract<SuggestionDetail, { kind: 'cooldown-drift' }>; spells: Map<number, SpellInfo> }) {
	const dur = d.fightEndMs - d.fightStartMs || 1
	const pct = (t: number) => ((t - d.fightStartMs) / dur) * 100
	const cls = (ms: number) => (ms <= 1000 ? 'g' : ms <= 3000 ? 'a' : 'r')
	return (
		<div>
			<div className="dlabel">Chaque utilisation et son retard éventuel</div>
			{d.rows.map((row) => {
				const total = Math.round(row.casts.reduce((s, c) => s + c.driftMs, 0) / 1000)
				const tdc = total <= 5 ? 'g' : total <= 12 ? 'a' : 'r'
				const info = spells.get(row.spellId)
				return (
					<div className="cd-row" key={row.spellId}>
						<span className="cd-name">
							{info ? <Spell info={info} /> : `#${row.spellId}`}
							<span className="rc">recast {Math.round(row.recastMs / 1000)}s à ce niveau</span>
						</span>
						<span className="cd-line">
							<span className="cd-base" />
							{row.casts.map((c, i) => (
								<span key={i}>
									{c.driftMs >= 3000 && <span className={`cd-lab ${cls(c.driftMs)}`} style={{ left: `${pct(c.tMs)}%` }}>+{Math.round(c.driftMs / 1000)}s</span>}
									<span className={`cd-dot ${cls(c.driftMs)}`} style={{ left: `${pct(c.tMs)}%` }}
										title={`${mmss(c.tMs - d.fightStartMs)}${c.driftMs ? ` · tenu +${Math.round(c.driftMs / 1000)}s` : ' · à temps'}`} />
								</span>
							))}
						</span>
						<span className={`cd-drift ${tdc}`}>+{total}s</span>
					</div>
				)
			})}
			<div className="cd-legend">
				<span><span className="dot" style={{ background: 'var(--strong)' }} /> à temps</span>
				<span><span className="dot" style={{ background: 'var(--big)' }} /> un peu tard</span>
				<span><span className="dot" style={{ background: 'var(--down)' }} /> trop longtemps</span>
			</div>
		</div>
	)
}

function GaugeFillDetail({ d }: { d: Extract<SuggestionDetail, { kind: 'gauge-fill' }> }) {
	const dur = d.fightEndMs - d.fightStartMs || 1
	const W = 1000, top = 16, bot = 180, h = bot - top
	const X = (t: number) => ((t - d.fightStartMs) / dur) * W
	const Y = (v: number) => bot - (v / d.max) * h
	const pts = d.points
	const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.tMs).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ')
	const area = pts.length ? `M${X(pts[0]!.tMs).toFixed(1)},${bot} ${pts.map((p) => `L${X(p.tMs).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ')} L${X(pts[pts.length - 1]!.tMs).toFixed(1)},${bot} Z` : ''
	const total = d.overflows.reduce((s, o) => s + o.lost, 0)
	const rel = (t: number) => mmss(t - d.fightStartMs)
	return (
		<div>
			<div className="dlabel">Remplissage de la jauge Bête sur le combat</div>
			<svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="gauge-svg">
				<defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(243,182,63,0.55)" /><stop offset="1" stopColor="rgba(243,182,63,0.03)" /></linearGradient></defs>
				{d.overflows.map((o, i) => <line key={i} x1={X(o.tMs)} y1={top} x2={X(o.tMs)} y2={bot} stroke="#ef6a6a" strokeWidth={2} vectorEffect="non-scaling-stroke" />)}
				<line x1={0} y1={Y(d.max)} x2={W} y2={Y(d.max)} stroke="rgba(255,255,255,0.35)" strokeWidth={1.5} strokeDasharray="7 7" vectorEffect="non-scaling-stroke" />
				<path d={area} fill="url(#gg)" />
				<path d={line} fill="none" stroke="#f3b63f" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
			</svg>
			<div className="tl-axis"><span>0:00</span><span>{mmss(dur)}</span></div>
			<div className="gauge-cap">Ligne pointillée = jauge pleine (100). Traits rouges = jauge gaspillée. Total : {total}.</div>
			{d.overflows.length > 0 && (
				<ul className="downlist">{d.overflows.map((o, i) => <li key={i}><b>{rel(o.tMs)}</b><span>jauge pleine · +{o.lost} perdus</span></li>)}</ul>
			)}
		</div>
	)
}

function ComboBreaksDetail({ d, spells }: { d: Extract<SuggestionDetail, { kind: 'combo-breaks' }>; spells: Map<number, SpellInfo> }) {
	const dur = d.fightEndMs - d.fightStartMs || 1
	const pct = (t: number) => ((t - d.fightStartMs) / dur) * 100
	const rel = (t: number) => mmss(t - d.fightStartMs)
	if (d.breaks.length === 0) return <div className="empty">Aucun combo cassé sur ce pull.</div>
	return (
		<div>
			<div className="dlabel">Moments où le combo a été cassé</div>
			<div className="mk-track">{d.breaks.map((b, i) => <span key={i} className="mk" style={{ left: `${pct(b.tMs)}%` }} title={rel(b.tMs)} />)}</div>
			<div className="tl-axis"><span>0:00</span><span>{mmss(dur)}</span></div>
			<ul className="downlist">
				{d.breaks.map((b, i) => {
					const info = spells.get(b.spellId)
					return <li key={i}><b>{rel(b.tMs)}</b><span>{info ? <Spell info={info} /> : `#${b.spellId}`} cassé</span></li>
				})}
			</ul>
		</div>
	)
}

function DeadTimeDetail({ d }: { d: Extract<SuggestionDetail, { kind: 'dead-time' }> }) {
	const dur = d.fightEndMs - d.fightStartMs || 1
	const pct = (t: number) => ((t - d.fightStartMs) / dur) * 100
	const rel = (t: number) => mmss(t - d.fightStartMs)
	return (
		<div>
			<div className="dlabel">Casting (vert) vs temps mort (rouge)</div>
			<div className="tl-track tl-green">
				{d.windows.map((w, i) => <span key={i} className="tl-down" style={{ left: `${pct(w.startMs)}%`, width: `${Math.max(0.4, pct(w.endMs) - pct(w.startMs))}%` }} />)}
			</div>
			<div className="tl-axis"><span>0:00</span><span>{mmss(dur)}</span></div>
			{d.windows.length > 0 ? (
				<ul className="downlist">{d.windows.map((w, i) => <li key={i}><b>{rel(w.startMs)} – {rel(w.endMs)}</b><span>{Math.round((w.endMs - w.startMs) / 1000)}s sans GCD</span></li>)}</ul>
			) : (
				<div className="empty">Aucun temps mort notable — enchaînement nickel.</div>
			)}
		</div>
	)
}

function BurstWindowsDetail({ d, spells }: { d: Extract<SuggestionDetail, { kind: 'burst-windows' }>; spells: Map<number, SpellInfo> }) {
	const rel = (t: number) => mmss(t - d.fightStartMs)
	return (
		<div>
			<div className="dlabel">Chaque fenêtre de burst et ce que tu y as mis</div>
			{d.windows.map((w, i) => (
				<div className="bw" key={i}>
					<div className="bw-head">
						<span className="bw-time">{rel(w.tMs)}</span>
						<span className={`bw-verdict ${w.ok ? 'ok' : 'meh'}`}>{w.ok ? 'optimale' : 'à resserrer'}</span>
					</div>
					<div className="bw-actions">
						{w.actionIds.map((id, k) => {
							const info = spells.get(id)
							return info && !info.locked ? <img key={k} className="bw-act" src={iconUrl(info.icon)} title={info.name} alt="" /> : null
						})}
					</div>
					{w.missingIds.length > 0 && (
						<div className="bw-note"><i className="ti ti-arrow-narrow-right" style={{ color: 'var(--big)' }} /> Il manque {w.missingIds.map((id, k) => {
							const info = spells.get(id)
							return <span key={k}>{k > 0 ? ', ' : ''}{info ? <Spell info={info} /> : `#${id}`}</span>
						})} dans la fenêtre.</div>
					)}
				</div>
			))}
		</div>
	)
}

function renderDetail(detail: SuggestionDetail, spells: Map<number, SpellInfo>) {
	switch (detail.kind) {
		case 'buff-timeline': return <BuffTimeline d={detail} />
		case 'cooldown-drift': return <CooldownDriftDetail d={detail} spells={spells} />
		case 'gauge-fill': return <GaugeFillDetail d={detail} />
		case 'combo-breaks': return <ComboBreaksDetail d={detail} spells={spells} />
		case 'dead-time': return <DeadTimeDetail d={detail} />
		case 'burst-windows': return <BurstWindowsDetail d={detail} spells={spells} />
	}
}

function SuggestionCard({ s, spells }: { s: Suggestion; spells: Map<number, SpellInfo> }) {
	const [open, setOpen] = useState(false)
	const hasDetail = !!s.detail
	return (
		<div className={`card ${s.category} ${open ? 'open' : ''}`} style={{ marginBottom: 12, cursor: hasDetail ? 'pointer' : 'default' }}
			onClick={() => hasDetail && setOpen((o) => !o)}>
			<div className="card-top">
				<div className="card-ic"><i className={`ti ${CAT[s.category].icon}`} /></div>
				<div className="card-title"><SpellText text={s.title} spells={spells} /></div>
				{s.metric && <div className="card-metric">{s.metric}</div>}
				{hasDetail && <i className="ti ti-chevron-down chev" />}
			</div>
			<div className="card-body"><SpellText text={s.body} spells={spells} /></div>
			{s.detail && (
				<div className="detail"><div className="detail-inner">{renderDetail(s.detail, spells)}</div></div>
			)}
		</div>
	)
}

type Tip = { info: SpellInfo; x: number; top: number; bottom: number; below: boolean }

function Breakdown({ result, onBack }: { result: AnalyseResponse; onBack: () => void }) {
	const spells = useMemo(() => new Map(result.spells.map((s) => [s.id, s])), [result])
	const grouped = useMemo(
		() => CAT_ORDER.map((cat) => ({ cat, items: result.suggestions.filter((s) => s.category === cat) })).filter((g) => g.items.length),
		[result],
	)
	const [tip, setTip] = useState<Tip | null>(null)
	const job = jobFr(result.player.job)
	const grade = result.grade ?? gradeLetter(result.suggestions)
	const stMetric = result.suggestions.find((s) => s.id.includes('surging'))?.metric

	const onOver = (e: ReactMouseEvent) => {
		const el = (e.target as HTMLElement).closest('.spell')
		if (!el) return
		const info = spells.get(Number(el.getAttribute('data-spell')))
		if (!info) return
		const r = el.getBoundingClientRect()
		setTip({ info, x: r.left, top: r.top, bottom: r.bottom, below: r.top < 180 })
	}
	const onOut = (e: ReactMouseEvent) => {
		if ((e.target as HTMLElement).closest('.spell')) setTip(null)
	}

	return (
		<div className="wrap" onMouseOver={onOver} onMouseOut={onOut}>
			<div className="topbar">
				<div className="enc">
					<div className="enc-sigil"><i className="ti ti-flame" /></div>
					<div><h1>{result.encounter}</h1><div className="sub">{mmss(result.durationMs)}</div></div>
				</div>
				<div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
					<div className="lvl-crystal">
						<i className="ti ti-arrow-big-down-lines ic" />
						<div><div className="lab">Synchronisé</div><div className="val">Nv. {result.level}</div></div>
					</div>
					<button className="btn btn-ghost" onClick={onBack}><i className="ti ti-arrow-left" /></button>
				</div>
			</div>

			<div className="panel hero-band">
				<div className="hero-id">
					<div className="pw">
						<div className="portrait"><i className="ti ti-user" /></div>
						<span className="lv-badge">{job.fr.toUpperCase()} · Nv.{result.level}</span>
					</div>
					<div>
						<div className="pname">{result.player.name}</div>
						<div className="prole"><i className={`ti ${job.icon}`} /> {job.fr}</div>
					</div>
				</div>
				<div className="hero-grade">
					<div className="grade"><div className="grade-inner"><span className="grade-letter">{grade}</span></div></div>
					<div className="grade-cap">Note globale</div>
				</div>
				<div className="hero-stats">
					{stMetric && <div className="ms"><div className="v" style={{ color: 'var(--big)' }}>{stMetric}</div><div className="k">Vent de tempête</div></div>}
					<div className="ms"><div className="v">{mmss(result.durationMs)}</div><div className="k">Durée</div></div>
					<div className="ms"><div className="v">{result.suggestions.length}</div><div className="k">Analyses</div></div>
				</div>
			</div>

			<div className="sections">
				{grouped.length === 0 && <div className="empty">Aucune analyse disponible pour ce pull pour l'instant.</div>}
				{grouped.map((g) => (
					<div key={g.cat}>
						<div className="grp-head">
							<span className={`pip ${g.cat}`} /><h2>{CAT[g.cat].label}</h2>
							<span className="ct">{g.items.length}</span><span className="rule" />
						</div>
						{g.items.map((s) => <SuggestionCard key={s.id} s={s} spells={spells} />)}
					</div>
				))}
			</div>

			<div className="foot">xiv-mil-analysis · analysé au niveau synchronisé</div>

			{tip && (
				<div className="sptip" style={{
					left: Math.min(window.innerWidth - 288, Math.max(8, tip.x)),
					top: tip.below ? tip.bottom + 8 : tip.top - 8,
					transform: tip.below ? 'none' : 'translateY(-100%)',
				}}>
					<div className="t-head">
						{tip.info.locked ? <div className="t-lock"><i className="ti ti-lock" /></div> : <img src={iconUrl(tip.info.icon)} alt="" />}
						<div><div className="t-nm">{tip.info.name}</div><div className="t-ty">{tip.info.type}</div></div>
					</div>
					<div className="t-sub">{tip.info.sub}</div>
					<div className="t-desc">{tip.info.desc}</div>
				</div>
			)}
		</div>
	)
}

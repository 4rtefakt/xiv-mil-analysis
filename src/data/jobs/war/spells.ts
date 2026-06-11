import type { SpellInfo } from '../../types.js'

/**
 * Display info (French names, icons, tooltips) for the WAR spells/buffs the
 * analysers reference in suggestion text. Names/icons are from the game data
 * (fr/ sheets); tooltip text is curated. The client renders `{{id}}` tokens in
 * suggestion bodies using this.
 */
export const WAR_SPELL_INFO: SpellInfo[] = [
	{ id: 31, name: 'Coup puissant', icon: 260, type: "Capacité d'arme · GCD", sub: 'Recast 2,5s · Nv. 1', desc: 'Début de combo.' },
	{ id: 37, name: 'Mutilation', icon: 255, type: "Capacité d'arme · GCD", sub: 'Recast 2,5s · Nv. 4', desc: 'Combo après Coup puissant. +10 de jauge Bête.' },
	{ id: 42, name: 'Couperet de justice', icon: 258, type: "Capacité d'arme · GCD", sub: 'Recast 2,5s · Nv. 26', desc: 'Combo après Mutilation. +20 de jauge Bête et soin.' },
	{ id: 45, name: 'Œil de la tempête', icon: 264, type: "Capacité d'arme · GCD", sub: 'Recast 2,5s · Nv. 50', desc: 'Combo après Mutilation. Accorde Vent de tempête (+10% de dégâts).' },
	{ id: 52, name: 'Cri de guerre', icon: 2555, type: 'Aptitude · oGCD', sub: 'Recast 60s · 2 charges (Nv. 66) · Nv. 50', desc: 'Accorde 50 de jauge Bête.' },
	{ id: 3549, name: 'Sape-fendeur', icon: 2557, type: "Capacité d'arme · GCD", sub: 'Recast 2,5s · Nv. 54', desc: 'Coûte 50 de jauge Bête. Gros dégâts.' },
	{ id: 7386, name: 'Assaut violent', icon: 2561, type: 'Aptitude · oGCD', sub: 'Recast 30s · 3 charges (Nv. 88) · Nv. 62', desc: 'Bond vers la cible avec dégâts (puissance 150).' },
	{ id: 7387, name: 'Révolte', icon: 2562, type: 'Aptitude · oGCD', sub: 'Recast 30s · Nv. 64', desc: 'Dégâts à la cible et autour.' },
	{ id: 7389, name: 'Relâchement bestial', icon: 2564, type: 'Aptitude · oGCD', sub: 'Recast 60s · Nv. 70', desc: 'Accorde 3 Sape-fendeur garantis critiques et directs.' },
	{ id: 2677, name: 'Vent de tempête', icon: 212561, type: 'Effet bénéfique', sub: "Durée jusqu'à 60s", desc: 'Dégâts augmentés de 10%. Appliqué par Œil de la tempête.' },
	{ id: 1177, name: 'Relâchement bestial', icon: 217247, type: 'Effet bénéfique', sub: 'Durée 15s', desc: '3 Sape-fendeur gratuits, critiques et directs garantis.' },
	{ id: 25752, name: 'Orogenèse', icon: 0, locked: true, type: 'Aptitude · verrouillée', sub: 'Niveau 86', desc: "Tu ne l'as pas encore à Nv. 70 — exclue de l'analyse pour ne pas te pénaliser." },
]

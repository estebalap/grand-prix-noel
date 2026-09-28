/**
 * GRAND PRIX DE NOËL — ÉDITION MARIO KART 3D
 * Application Web Officielle (Companion App & Régie TV)
 * Architecture 100% Vanilla ES6 (Sans dépendances externes)
 */

// =============================================================================
// 1. ÉTAT GLOBAL DE L'APPLICATION (STATE)
// =============================================================================
const APP_STATE = {
    teams: [],
    cars: [],
    activeTeamId: 9, // Par défaut : Esteban Titou Wyvern SRT
    coins: 100,
    paddocks: {}, // { [teamId]: [carCodes...] }
    standings: {
        teams: {}, // { [teamId]: { points: 0, wins: 0, races: 0 } }
        cars: {}   // { [carCode]: { points: 0, races: 0, wins: 0 } }
    },
    currentRace: {
        lanes: [null, null, null, null], // Codes des 4 voitures
        odds: [2.5, 2.5, 2.5, 2.5],
        status: 'ready', // 'ready', 'betting', 'racing'
        betTimer: null,
        timeRemaining: 45
    },
    activeBets: [], // [ { lane: 1, carCode: 'B01', amount: 20, odds: 2.4 } ]
    audioCtx: null,
    activeMode: 'gp_pure',
    jukebox: {
        isPlaying: false,
        currentMode: 'gp_pure',
        trackIndex: 0,
        volume: 75
    },
    ambientMusic: {
        isPlaying: false,
        timer: null,
        step: 0,
        masterGain: null,
        noiseNode: null
    },
    canvasParticles: {
        canvas: null,
        ctx: null,
        particles: [],
        animId: null
    },
    foregroundFx: {
        enabled: true,
        canvas: null,
        ctx: null,
        particles: [],
        animId: null
    },
    videoBackground: {
        enabled: true,
        source: 'youtube', // 'youtube', 'local', 'art'
        currentVideoId: '',
        opacity: 85,
        brightness: 100,
        customUrl: ''
    }
};

// Événements de la Roue du Chaos
const CHAOS_EVENTS = [
    { title: "DÉPART EN MARCHE ARRIÈRE !", desc: "Tous les 4 bolides doivent être posés le coffre en avant sur la grille de départ." },
    { title: "CHICANAGE EXPRESS : DEUX BANANES !", desc: "Deux peaux de banane sont posées au hasard à mi-pente." },
    { title: "LE VOL DU LEADER (CARAPACE BLEUE)", desc: "Le bolide en tête de classement général part avec un malus de voie (Voie 4)." },
    { title: "DOUBLE OU RIEN SUR LES PARIS !", desc: "Tous les gains de paris sur cette manche sont multipliés par 2 !" },
    { title: "PILOTE AVEUGLE (LANCER AU SOUFFLE)", desc: "Le lanceur officiel doit lâcher le levier les yeux bandés au compte à rebours." },
    { title: "INVASION DE THWOMP !", desc: "Un portique Thwomp 3D est installé à la sortie du looping Rainbow Road." },
    { title: "COURSE DES SECONDES CHANCES", desc: "Seuls les bolides n'ayant encore marqué aucun point aujourd'hui sont autorisés." },
    { title: "DÉFI RELIQUE VINTAGE", desc: "Chaque joueur doit remplacer un de ses bolides par une des Reliques de l'enfance !" },
    { title: "LEST DE PLOMB MAXIMUM", desc: "La voiture favorite de la manche reçoit un lest de 2 pièces de monnaie sur le toit." },
    { title: "CIRCUIT EN SILENCE TOTAL", desc: "Interdiction de crier ou d'encourager sous peine d'un malus de 5 pièces." },
    { title: "DRAFT INVERSÉ D'UNE MANCHE", desc: "Échangez votre voiture de course avec celle de votre voisin de gauche pour ce départ !" },
    { title: "PARIS ILLIMITÉS !", desc: "Pas de plafond de mise : les pilotes peuvent faire tapis sur cette manche !" }
];

// =============================================================================
// 2. SYNTHÉTISEUR AUDIO WEB AUDIO API (Effets sonores natifs sans mp3)
// =============================================================================
function getAudioContext() {
    if (!APP_STATE.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        APP_STATE.audioCtx = new AudioContext();
    }
    if (APP_STATE.audioCtx.state === 'suspended') {
        APP_STATE.audioCtx.resume();
    }
    return APP_STATE.audioCtx;
}

function playTaunt(type) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    switch (type) {
        case 'horn': {
            // Klaxon bitonal classique
            [440, 554].forEach(freq => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.5);
            });
            break;
        }
        case 'rev': {
            // Vrombissement V8
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, now);
            filter.frequency.exponentialRampToValueAtTime(1800, now + 0.6);
            filter.frequency.exponentialRampToValueAtTime(400, now + 1.1);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.exponentialRampToValueAtTime(260, now + 0.6);
            osc.frequency.exponentialRampToValueAtTime(100, now + 1.1);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 1.1);
            break;
        }
        case 'turbo': {
            // Soupape Turbo Valve (Décharge d'air)
            const bufferSize = ctx.sampleRate * 0.4;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2500, now);
            filter.frequency.exponentialRampToValueAtTime(600, now + 0.4);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start(now);
            break;
        }
        case 'skid': {
            // Pneus qui crissent
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.3);
            osc.frequency.linearRampToValueAtTime(1400, now + 0.6);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.7);
            break;
        }
        case 'banana': {
            // Glissade Mario Kart (Slide down)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(650, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.5);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
        }
        case 'laugh': {
            // Rire sarcastique
            [0, 0.12, 0.24, 0.36, 0.48].forEach((delay, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(450 - idx * 20, now + delay);
                gain.gain.setValueAtTime(0.2, now + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.09);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + delay);
                osc.stop(now + delay + 0.1);
            });
            break;
        }
        case 'pikachu': {
            // Éclair Pikachu
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(3200, now + 0.15);
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
            break;
        }
        case 'siren': {
            // Sirène de police
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(550, now);
            osc.frequency.setValueAtTime(750, now + 0.25);
            osc.frequency.setValueAtTime(550, now + 0.5);
            osc.frequency.setValueAtTime(750, now + 0.75);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 1.0);
            break;
        }
        case 'mario': {
            // Victoire Mario (Arpège 1-UP)
            const notes = [330, 392, 659, 523, 587, 784];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const start = now + idx * 0.08;
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.12, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + 0.12);
            });
            break;
        }
        case 'crash': {
            // Carambolage
            const bufferSize = ctx.sampleRate * 0.5;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, now);
            filter.frequency.exponentialRampToValueAtTime(80, now + 0.5);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start(now);
            break;
        }
        case 'coin': {
            // Bruit de pièce d'or
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(987, now);
            osc.frequency.setValueAtTime(1318, now + 0.08);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
            break;
        }
        default:
            break;
    }
}

// -----------------------------------------------------------------------------
// CLICS SONORES INTERACTIFS ADAPTÉS AU MODE DE JEU (WEB AUDIO API)
// -----------------------------------------------------------------------------
function initUiClickSounds() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button, .btn, .nav-btn, select, .car-picker, .team-item-card, .radio-btn, .bet-card, .item-card, .profile-card, .wallet-badge');
        if (!target) return;
        if (target.disabled || target.classList.contains('disabled')) return;
        playModeUiClick(APP_STATE.activeMode);
    }, true);
}

function playModeUiClick(mode) {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // 1. Grand Prix Mario Kart (Noël) : Bip Menu Officiel Mario Kart 8 & Carillon Doré
        if (mode === 'gp_pure' || mode === 'gp_strategy') {
            // Note 1 : Square wave joyeuse Mario Kart
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'square';
            osc1.frequency.setValueAtTime(659.25, now); // Mi 5
            osc1.frequency.setValueAtTime(880.00, now + 0.05); // La 5
            gain1.gain.setValueAtTime(0.12, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.18);

            // Note 2 : Scintillement étoilé
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1760, now + 0.04);
            gain2.gain.setValueAtTime(0.08, now + 0.04);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.04);
            osc2.stop(now + 0.22);
        }
        // 2. Boss Tomica (Tokyo Drift) : Bip Laser Synthwave & Décharge Cyberpunk
        else if (mode === 'boss_tomica') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(2800, now);
            osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);

            gain.gain.setValueAtTime(0.16, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.1);
        }
        // 3. Survie Mort Subite (Mad Max Wasteland) : Enclenchement Métallique & Percuteur Fusil
        else if (mode === 'survival') {
            // Impact métallique lourd
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.14);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        }
        // 4. Apex Challenge (F1) : Déclic Palette Fibre de Carbone & Bip Radio Télémétrie
        else if (mode === 'f1_apex') {
            // Clac mécanique
            const oscSnap = ctx.createOscillator();
            const gainSnap = ctx.createGain();
            oscSnap.type = 'triangle';
            oscSnap.frequency.setValueAtTime(3200, now);
            oscSnap.frequency.exponentialRampToValueAtTime(180, now + 0.035);
            gainSnap.gain.setValueAtTime(0.2, now);
            gainSnap.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            oscSnap.connect(gainSnap);
            gainSnap.connect(ctx.destination);
            oscSnap.start(now);
            oscSnap.stop(now + 0.04);

            // Bip télémétrie FIA
            const oscTone = ctx.createOscillator();
            const gainTone = ctx.createGain();
            oscTone.type = 'sine';
            oscTone.frequency.setValueAtTime(1950, now + 0.02);
            gainTone.gain.setValueAtTime(0.1, now + 0.02);
            gainTone.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            oscTone.connect(gainTone);
            gainTone.connect(ctx.destination);
            oscTone.start(now + 0.02);
            oscTone.stop(now + 0.08);
        }
        // 5. Chaos Total : Ressort Cartoon "Boiiing" & Pop Rigolo
        else if (mode === 'chaos_unlimited') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            // Glissando comique montant
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(740, now + 0.15);

            gain.gain.setValueAtTime(0.22, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        }
        // 6. Défi Cocorico (Majorette Le Mans) : Interrupteur Tableau de Bord Vintage & Mini Klaxon
        else if (mode === 'boss_majorette') {
            [440, 554].forEach(freq => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.12, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.08);
            });
        }
        // 7. Coupe des Reliques : Arpège 8-Bit NES Rétro 1985
        else if (mode === 'relic_cup') {
            [523.25, 659.25, 783.99].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const start = now + idx * 0.03;
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.1, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(start);
                osc.stop(start + 0.05);
            });
        }
        // 8. Défaut : Pop Arcade classique
        else {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);

            gain.gain.setValueAtTime(0.14, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
        }
    } catch (e) {
        // Fallback silencieux si interaction bloquée par l'environnement
    }
}

// =============================================================================
// 3. PERSISTANCE & CHARGEMENT DES DONNÉES
// =============================================================================
function loadLocalStorage() {
    try {
        const savedTeam = localStorage.getItem('gpn_active_team');
        if (savedTeam) APP_STATE.activeTeamId = parseInt(savedTeam, 10);

        const savedCoins = localStorage.getItem('gpn_coins');
        if (savedCoins) APP_STATE.coins = parseInt(savedCoins, 10);

        const savedPaddocks = localStorage.getItem('gpn_paddocks');
        if (savedPaddocks) APP_STATE.paddocks = JSON.parse(savedPaddocks);

        const savedStandings = localStorage.getItem('gpn_standings');
        if (savedStandings) APP_STATE.standings = JSON.parse(savedStandings);

        const savedVideoBg = localStorage.getItem('gpn_video_bg');
        if (savedVideoBg !== null) {
            APP_STATE.videoBackground.enabled = (savedVideoBg === 'true');
        } else {
            APP_STATE.videoBackground.enabled = true;
        }
        const savedVideoSource = localStorage.getItem('gpn_video_source');
        if (savedVideoSource === 'youtube' || savedVideoSource === 'art') {
            APP_STATE.videoBackground.source = savedVideoSource;
        } else {
            APP_STATE.videoBackground.source = 'youtube';
        }
        const savedVideoOpacity = localStorage.getItem('gpn_video_opacity');
        if (savedVideoOpacity) APP_STATE.videoBackground.opacity = parseInt(savedVideoOpacity, 10);
        const savedVideoCustom = localStorage.getItem('gpn_video_custom');
        if (savedVideoCustom) APP_STATE.videoBackground.customUrl = savedVideoCustom;
        const savedPlotTwists = localStorage.getItem('gpn_plot_twists');
        if (savedPlotTwists) {
            try { APP_STATE.revealedPlotTwists = JSON.parse(savedPlotTwists); } catch (e) {}
        }
    } catch (e) {
        console.warn("Erreur chargement localStorage:", e);
    }
}

function saveLocalStorage() {
    try {
        localStorage.setItem('gpn_active_team', APP_STATE.activeTeamId);
        localStorage.setItem('gpn_coins', APP_STATE.coins);
        localStorage.setItem('gpn_paddocks', JSON.stringify(APP_STATE.paddocks));
        localStorage.setItem('gpn_standings', JSON.stringify(APP_STATE.standings));
        localStorage.setItem('gpn_video_bg', APP_STATE.videoBackground.enabled);
        localStorage.setItem('gpn_video_source', APP_STATE.videoBackground.source);
        localStorage.setItem('gpn_video_opacity', APP_STATE.videoBackground.opacity);
        localStorage.setItem('gpn_video_custom', APP_STATE.videoBackground.customUrl || '');
        localStorage.setItem('gpn_plot_twists', JSON.stringify(APP_STATE.revealedPlotTwists || []));
    } catch (e) {
        console.warn("Erreur sauvegarde localStorage:", e);
    }
}

async function loadData() {
    loadLocalStorage();

    try {
        if (window.GPN_DATA_TEAMS && window.GPN_DATA_CARS) {
            APP_STATE.teams = window.GPN_DATA_TEAMS;
            APP_STATE.cars = window.GPN_DATA_CARS;
        } else {
            const [teamsRes, carsRes] = await Promise.all([
                fetch('teams.json'),
                fetch('cars.json')
            ]);
            APP_STATE.teams = await teamsRes.json();
            APP_STATE.cars = await carsRes.json();
        }
    } catch (err) {
        console.warn("Chargement via fetch impossible (protocole file://), utilisation des données embarquées data.js :", err);
        if (window.GPN_DATA_TEAMS) APP_STATE.teams = window.GPN_DATA_TEAMS;
        if (window.GPN_DATA_CARS) APP_STATE.cars = window.GPN_DATA_CARS;
    }

    // Sécurité supplémentaire : s'assurer que les listes ne sont jamais vides
    if ((!APP_STATE.teams || APP_STATE.teams.length === 0) && window.GPN_DATA_TEAMS) {
        APP_STATE.teams = window.GPN_DATA_TEAMS;
    }
    if ((!APP_STATE.cars || APP_STATE.cars.length === 0) && window.GPN_DATA_CARS) {
        APP_STATE.cars = window.GPN_DATA_CARS;
    }

    // Initialisation ou consolidation des classements
    APP_STATE.teams.forEach(t => {
        if (!APP_STATE.standings.teams[t.id]) {
            APP_STATE.standings.teams[t.id] = { points: 0, wins: 0, podiums: 0, races: 0, coinsSpent: 0, coinsWon: 0, trapsUsed: 0, betsPlaced: 0 };
        } else {
            APP_STATE.standings.teams[t.id].podiums = APP_STATE.standings.teams[t.id].podiums || 0;
            APP_STATE.standings.teams[t.id].coinsSpent = APP_STATE.standings.teams[t.id].coinsSpent || 0;
            APP_STATE.standings.teams[t.id].coinsWon = APP_STATE.standings.teams[t.id].coinsWon || 0;
            APP_STATE.standings.teams[t.id].trapsUsed = APP_STATE.standings.teams[t.id].trapsUsed || 0;
            APP_STATE.standings.teams[t.id].betsPlaced = APP_STATE.standings.teams[t.id].betsPlaced || 0;
        }
    });

    APP_STATE.cars.forEach(c => {
        if (!APP_STATE.standings.cars[c.code]) {
            APP_STATE.standings.cars[c.code] = { points: 0, wins: 0, podiums: 0, races: 0 };
        } else {
            APP_STATE.standings.cars[c.code].podiums = APP_STATE.standings.cars[c.code].podiums || 0;
        }
    });

    initUI();
}

// =============================================================================
// 4. INITIALISATION DE L'INTERFACE UTILISATEUR
// =============================================================================
function initUI() {
    updateWalletDisplay();
    updateActiveTeamHeader();
    initNavigationTabs();
    initMobileNavigation();
    initMobileConnectModal();
    updateMobileTeamSummary();
    initRacePickers();
    renderMyPaddock();
    initDraftScanner();
    initRaceControls();
    initChaosWheel();
    renderStandings();
    initTeamModal();
    initDynamicBackground();
    initVideoToggle();
    initVideoStudio();
    initAmbientMusic();
    initJukebox();
    initUiClickSounds();
    initForegroundFx();
    initFgToggle();
    initAdminPanel();
    renderPlotTwistCards();
    checkFileProtocolServer();
}

// =============================================================================
// 5. GESTION DES ONGLETS DE NAVIGATION & MOBILE BOTTOM NAV
// =============================================================================
function initNavigationTabs() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const panes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');

            navButtons.forEach(b => b.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');

            // Synchroniser avec la Bottom Navigation Bar mobile
            const mobBtns = document.querySelectorAll('.mobile-nav-btn');
            mobBtns.forEach(mb => {
                if (mb.getAttribute('data-tab') === targetId) mb.classList.add('active');
                else mb.classList.remove('active');
            });

            // Rafraîchissements contextuels
            if (targetId === 'tab-bets') updateLiveBettingUI();
            if (targetId === 'tab-standings') renderStandings();
            if (targetId === 'tab-draft') {
                renderMyPaddock();
                updateMobileTeamSummary();
            }
        });
    });
}

function initMobileNavigation() {
    const mobBtns = document.querySelectorAll('.mobile-nav-btn');
    mobBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            const correspondingDesktopBtn = document.querySelector(`.nav-btn[data-tab="${targetId}"]`);
            if (correspondingDesktopBtn) {
                correspondingDesktopBtn.click();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Branchement du bouton de changement d'écurie sur la fiche mobile
    const switchBtn = document.getElementById('mob-btn-switch-team');
    if (switchBtn) {
        switchBtn.addEventListener('click', () => {
            const teamModal = document.getElementById('team-modal');
            if (teamModal) teamModal.style.display = 'flex';
        });
    }

    // Si on est sur smartphone en mode portrait au chargement, basculer par défaut sur le paddock écurie
    if (window.innerWidth <= 860 || window.matchMedia("(orientation: portrait)").matches) {
        const draftBtn = document.querySelector('.nav-btn[data-tab="tab-draft"]');
        if (draftBtn) draftBtn.click();
    }
}

// -----------------------------------------------------------------------------
// GESTION DE LA MODALE DE CONNEXION SMARTPHONE & QR CODE
// -----------------------------------------------------------------------------
let _detectedServerIp = '192.168.50.82';

function initMobileConnectModal() {
    const openBtn = document.getElementById('btn-open-mobile-connect');
    const modal = document.getElementById('mobile-connect-modal');
    const directUrlInput = document.getElementById('mob-direct-url');
    const qrImg = document.getElementById('qr-code-img');
    const copyBtn = document.getElementById('btn-copy-mob-url');
    const simulateBtn = document.getElementById('btn-simulate-mobile');

    function updateModalUrl(url) {
        if (!url) return;
        if (directUrlInput) directUrlInput.value = url;
        if (qrImg) {
            if (url.includes('github.io')) {
                qrImg.src = 'qrcode.png';
            } else {
                qrImg.onerror = function() {
                    this.src = `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=250`;
                };
                qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(url)}&color=0b1329&bgcolor=ffffff`;
            }
        }
    }

    function checkServerInfo() {
        // Si l'application est consultée en ligne (GitHub Pages, Vercel, domaine personnalisé)
        const isOnlineWeb = window.location.hostname && 
                            window.location.hostname !== 'localhost' && 
                            window.location.hostname !== '127.0.0.1' && 
                            !window.location.hostname.startsWith('192.168.') && 
                            !window.location.hostname.startsWith('10.');

        if (isOnlineWeb) {
            const cleanUrl = window.location.origin + window.location.pathname;
            updateModalUrl(cleanUrl);
            return;
        }

        fetch('tunnel_url.txt?t=' + Date.now())
            .then(res => {
                if (res.ok) return res.text();
                throw new Error();
            })
            .then(text => {
                const clean = (text || '').trim();
                if (clean.startsWith('https://')) {
                    updateModalUrl(clean);
                    return;
                }
                throw new Error();
            })
            .catch(() => {
                fetch('/api/server-info')
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.url) {
                            updateModalUrl(data.url);
                        } else if (data && data.ip) {
                            const port = window.location.port || '8000';
                            updateModalUrl(`http://${data.ip}:${port}`);
                        }
                    })
                    .catch(() => {
                        // Adresse officielle permanente en ligne
                        updateModalUrl('https://estebalap.github.io/grand-prix-noel/');
                    });
            });
    }

    checkServerInfo();

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            checkServerInfo();
            modal.style.display = 'flex';
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeMobileConnectModal();
        });
    }

    if (copyBtn && directUrlInput) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(directUrlInput.value)
                .then(() => {
                    const oldText = copyBtn.textContent;
                    copyBtn.textContent = 'Copié ! ✅';
                    setTimeout(() => { copyBtn.textContent = oldText; }, 2000);
                })
                .catch(() => {
                    directUrlInput.select();
                    document.execCommand('copy');
                    copyBtn.textContent = 'Copié ! ✅';
                });
        });
    }

    if (simulateBtn) {
        simulateBtn.addEventListener('click', () => {
            document.body.classList.toggle('force-mobile-view');
            const isActive = document.body.classList.contains('force-mobile-view');
            simulateBtn.textContent = isActive 
                ? '🖥️ Repasser en Vue Plein Écran (TV/PC)' 
                : '📱 Activer la Vue Smartphone sur cet écran';
            
            if (isActive) {
                const draftBtn = document.querySelector('.nav-btn[data-tab="tab-draft"]');
                if (draftBtn) draftBtn.click();
            }
        });
    }
}

window.closeMobileConnectModal = function() {
    const modal = document.getElementById('mobile-connect-modal');
    if (modal) modal.style.display = 'none';
};

// =============================================================================
// 6. GESTION DU PROFIL & DE L'ÉCURIE ACTIVE
// =============================================================================
function getActiveTeam() {
    return APP_STATE.teams.find(t => t.id === APP_STATE.activeTeamId) || APP_STATE.teams[0];
}

function updateActiveTeamHeader() {
    const team = getActiveTeam();
    if (!team) return;

    const logoEl = document.getElementById('active-team-logo');
    const nameEl = document.getElementById('active-team-name');

    if (logoEl) logoEl.src = team.logo;
    if (nameEl) nameEl.textContent = team.name;

    updateMobileTeamSummary();
}

function updateMobileTeamSummary() {
    const team = getActiveTeam();
    if (!team) return;

    const logoEl = document.getElementById('mob-team-logo');
    const titleEl = document.getElementById('mob-team-title');
    const pilotEl = document.getElementById('mob-team-pilot');
    const ptsEl = document.getElementById('mob-stat-points');
    const winsEl = document.getElementById('mob-stat-wins');
    const coinsEl = document.getElementById('mob-stat-coins');
    const carsEl = document.getElementById('mob-stat-cars');

    if (logoEl) logoEl.src = team.logo;
    if (titleEl) titleEl.textContent = team.name;
    if (pilotEl) pilotEl.textContent = `Pilote : ${team.pilot} (${team.nickname || ''})`;

    const stats = APP_STATE.standings.teams[team.id] || { points: 0, wins: 0 };
    if (ptsEl) ptsEl.textContent = stats.points || 0;
    if (winsEl) winsEl.textContent = stats.wins || 0;
    if (coinsEl) coinsEl.textContent = `${APP_STATE.coins}`;

    const paddockCars = APP_STATE.paddocks[team.id] || [];
    if (carsEl) carsEl.textContent = `${paddockCars.length}/6`;
}

function updateWalletDisplay() {
    const coinEls = [
        document.getElementById('player-coins'),
        document.getElementById('bet-wallet-display')
    ];
    coinEls.forEach(el => {
        if (el) el.textContent = `${APP_STATE.coins} 🪙`;
    });
    saveLocalStorage();
    updateMobileTeamSummary();
}

function initTeamModal() {
    const selectorBtn = document.getElementById('profile-selector-btn');
    const modal = document.getElementById('team-modal');
    const pickList = document.getElementById('teams-pick-list');

    if (selectorBtn && modal) {
        selectorBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            renderTeamPickerList();
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeTeamModal();
        });
    }
}

function renderTeamPickerList() {
    const pickList = document.getElementById('teams-pick-list');
    if (!pickList) return;

    pickList.innerHTML = '';
    APP_STATE.teams.forEach(team => {
        const card = document.createElement('div');
        card.className = `team-pick-card ${team.id === APP_STATE.activeTeamId ? 'active' : ''}`;
        card.innerHTML = `
            <img src="${team.logo}" alt="${team.name}">
            <div class="team-meta">
                <strong>${team.name}</strong>
                <span>Pilote : ${team.pilot} (${team.nickname})</span>
                <span style="color:var(--text-dim);font-style:italic;">"${team.quote}"</span>
            </div>
        `;
        card.addEventListener('click', () => {
            APP_STATE.activeTeamId = team.id;
            updateActiveTeamHeader();
            renderMyPaddock();
            saveLocalStorage();
            closeTeamModal();
        });
        pickList.appendChild(card);
    });
}

function closeTeamModal() {
    const modal = document.getElementById('team-modal');
    if (modal) modal.style.display = 'none';
}

// =============================================================================
// 7. SCANNER DE DRAFT À L'AVEUGLE & MON PADDOCK
// =============================================================================
function initDraftScanner() {
    const input = document.getElementById('draft-code-input');
    const scanBtn = document.getElementById('btn-scan-code');
    const addToPaddockBtn = document.getElementById('btn-add-to-paddock');

    let currentScannedCar = null;

    function handleScan() {
        const code = (input.value || '').trim().toUpperCase();
        if (!code) return;

        const car = APP_STATE.cars.find(c => c.code.toUpperCase() === code);
        const revealCard = document.getElementById('reveal-card');

        if (!car) {
            alert(`⚠️ Code inconnu : "${code}". Vérifiez la gommette sous la boîte ! (Ex: B07, FR02, F03, TK05, J02)`);
            return;
        }

        currentScannedCar = car;
        playTaunt('rev');

        // Mise à jour de la carte de révélation
        document.getElementById('reveal-code').textContent = car.code;
        document.getElementById('reveal-category').textContent = car.category_folder.replace(/^\d+_/, '').replace(/_/g, ' ');
        document.getElementById('reveal-alias').textContent = car.alias;
        document.getElementById('reveal-realname').textContent = car.real_name;
        document.getElementById('reveal-team').textContent = `Écurie de fabrication : ${car.ecurie || 'Constructeur Indépendant'}`;

        // Barres de progression statistiques
        setStatBar('stat-bar-speed', 'stat-val-speed', car.vitesse);
        setStatBar('stat-bar-aero', 'stat-val-aero', car.aerodynamisme);
        setStatBar('stat-bar-banana', 'stat-val-banana', car.resistance_banane);
        setStatBar('stat-bar-chaos', 'stat-val-chaos', car.facteur_chaos);
        setStatBar('stat-bar-intim', 'stat-val-intim', car.intimidation);

        document.getElementById('reveal-quote').textContent = `"${car.citation || 'Prête à rugir sur les 4 voies !'}"`;
        document.getElementById('reveal-lore').textContent = car.lore || '';

        revealCard.style.display = 'block';
        revealCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (scanBtn) scanBtn.addEventListener('click', handleScan);
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleScan();
        });
    }

    if (addToPaddockBtn) {
        addToPaddockBtn.addEventListener('click', () => {
            if (!currentScannedCar) return;

            const teamId = APP_STATE.activeTeamId;
            if (!APP_STATE.paddocks[teamId]) APP_STATE.paddocks[teamId] = [];

            const paddock = APP_STATE.paddocks[teamId];

            if (paddock.includes(currentScannedCar.code)) {
                alert(`⚠️ La voiture ${currentScannedCar.alias} (${currentScannedCar.code}) est déjà dans votre paddock !`);
                return;
            }

            if (paddock.length >= 6) {
                alert(`🛑 Paddock complet ! Votre écurie dispose de 6 places maximum. Retirez une voiture pour en ajouter une nouvelle.`);
                return;
            }

            paddock.push(currentScannedCar.code);
            saveLocalStorage();
            renderMyPaddock();
            playTaunt('coin');
            alert(`🏎️ ${currentScannedCar.alias} (${currentScannedCar.code}) ajoutée avec succès à votre paddock ! (${paddock.length}/6)`);
        });
    }
}

function setStatBar(barId, valId, value) {
    const bar = document.getElementById(barId);
    const val = document.getElementById(valId);
    const num = Math.min(100, Math.max(0, value || 50));
    if (bar) bar.style.width = `${num}%`;
    if (val) val.textContent = `${num}/100`;
}

function renderMyPaddock() {
    const container = document.getElementById('paddock-slots-grid');
    const countBadge = document.getElementById('paddock-count-badge');
    if (!container) return;

    const teamId = APP_STATE.activeTeamId;
    const paddock = APP_STATE.paddocks[teamId] || [];

    if (countBadge) countBadge.textContent = `${paddock.length} / 6 Voitures`;

    container.innerHTML = '';

    for (let slot = 0; slot < 6; slot++) {
        const slotEl = document.createElement('div');

        if (slot < paddock.length) {
            const carCode = paddock[slot];
            const car = APP_STATE.cars.find(c => c.code === carCode);

            if (car) {
                slotEl.className = 'paddock-slot filled';
                slotEl.innerHTML = `
                    <span class="paddock-car-code">${car.code}</span>
                    <h4>${car.alias}</h4>
                    <p>${car.real_name}</p>
                    <div class="paddock-stat-mini">
                        <span>⚡ Vit: ${car.vitesse}</span>
                        <span>✈️ Aéro: ${car.aerodynamisme}</span>
                    </div>
                    <button class="btn-remove-slot" onclick="removeCarFromPaddock('${car.code}')">Retirer du Paddock</button>
                `;
            }
        } else {
            slotEl.className = 'paddock-slot empty';
            slotEl.innerHTML = `
                <span>📦</span>
                <strong>Place Paddock ${slot + 1}</strong>
                <small>Scannez un paquet</small>
            `;
        }

        container.appendChild(slotEl);
    }
}

window.removeCarFromPaddock = function(carCode) {
    const teamId = APP_STATE.activeTeamId;
    if (!APP_STATE.paddocks[teamId]) return;

    APP_STATE.paddocks[teamId] = APP_STATE.paddocks[teamId].filter(c => c !== carCode);
    saveLocalStorage();
    renderMyPaddock();
};

// =============================================================================
// 8. RÉGIE TV & GESTION DES 4 VOIES RAINBOW ROAD
// =============================================================================
function initRacePickers() {
    for (let lane = 1; lane <= 4; lane++) {
        const picker = document.getElementById(`picker-lane-${lane}`);
        if (!picker) continue;

        picker.innerHTML = '<option value="">-- Choisir un bolide --</option>';
        APP_STATE.cars.forEach(car => {
            const opt = document.createElement('option');
            opt.value = car.code;
            opt.textContent = `[${car.code}] ${car.alias} (${car.real_name})`;
            picker.appendChild(opt);
        });

        picker.addEventListener('change', (e) => {
            const carCode = e.target.value;
            setLaneCar(lane - 1, carCode);
        });
    }

    // Remplir aussi les sélecteurs de photo-finish
    initFinishSelectors();
}

function setLaneCar(laneIndex, carCode) {
    APP_STATE.currentRace.lanes[laneIndex] = carCode || null;
    updateLaneCard(laneIndex + 1, carCode);
    calculateOdds();
    updateLiveBettingUI();
}

function updateLaneCard(laneNum, carCode) {
    const card = document.getElementById(`card-lane-${laneNum}`);
    if (!card) return;

    const car = APP_STATE.cars.find(c => c.code === carCode);
    const aliasEl = card.querySelector('.car-alias');
    const realEl = card.querySelector('.car-real');
    const speedEl = card.querySelector('.car-speed');
    const oddsEl = card.querySelector('.odds-val');

    if (car) {
        if (aliasEl) aliasEl.textContent = car.alias;
        if (realEl) realEl.textContent = car.real_name;
        if (speedEl) speedEl.textContent = `${car.vitesse}/100`;
    } else {
        if (aliasEl) aliasEl.textContent = 'Sélectionnez...';
        if (realEl) realEl.textContent = '--';
        if (speedEl) speedEl.textContent = '--';
        if (oddsEl) oddsEl.textContent = '2.5';
    }
}

function calculateOdds() {
    const activeCars = APP_STATE.currentRace.lanes.map(code => APP_STATE.cars.find(c => c.code === code));
    const validCars = activeCars.filter(Boolean);

    if (validCars.length < 2) {
        APP_STATE.currentRace.odds = [2.5, 2.5, 2.5, 2.5];
        return;
    }

    const speeds = validCars.map(c => c.vitesse || 50);
    const maxSpeed = Math.max(...speeds);
    const minSpeed = Math.min(...speeds);
    const spread = Math.max(1, maxSpeed - minSpeed);

    APP_STATE.currentRace.lanes.forEach((code, idx) => {
        const car = APP_STATE.cars.find(c => c.code === code);
        if (car) {
            const relDiff = (maxSpeed - car.vitesse) / spread;
            // Favori cote ~1.6 - 1.8, outsider ~3.8 - 4.5
            const odds = Math.round((1.5 + relDiff * 2.8) * 10) / 10;
            APP_STATE.currentRace.odds[idx] = odds;
            const oddsEl = document.querySelector(`#card-lane-${idx + 1} .odds-val`);
            if (oddsEl) oddsEl.textContent = odds.toFixed(1);
        } else {
            APP_STATE.currentRace.odds[idx] = 2.5;
        }
    });
}

function initRaceControls() {
    const btnRandom = document.getElementById('btn-randomize-grid');
    const btnOpenBets = document.getElementById('btn-open-bets');
    const btnGo = document.getElementById('btn-start-countdown');
    const btnValidateFinish = document.getElementById('btn-validate-finish');

    if (btnRandom) {
        btnRandom.addEventListener('click', () => {
            const shuffled = [...APP_STATE.cars].sort(() => 0.5 - Math.random());
            const chosen = shuffled.slice(0, 4);

            chosen.forEach((car, idx) => {
                const picker = document.getElementById(`picker-lane-${idx + 1}`);
                if (picker) picker.value = car.code;
                setLaneCar(idx, car.code);
            });

            playTaunt('rev');
        });
    }

    if (btnOpenBets) {
        btnOpenBets.addEventListener('click', () => {
            startBettingWindow();
        });
    }

    if (btnGo) {
        btnGo.addEventListener('click', () => {
            triggerRaceStart();
        });
    }

    if (btnValidateFinish) {
        btnValidateFinish.addEventListener('click', () => {
            validateRaceResults();
        });
    }
}

function startBettingWindow() {
    const badge = document.getElementById('race-status-badge');
    const btnBetsTab = document.querySelector('[data-tab="tab-bets"]');

    if (APP_STATE.currentRace.betTimer) clearInterval(APP_STATE.currentRace.betTimer);

    APP_STATE.currentRace.timeRemaining = 45;
    APP_STATE.currentRace.status = 'betting';
    playTaunt('coin');

    if (btnBetsTab) btnBetsTab.click();

    APP_STATE.currentRace.betTimer = setInterval(() => {
        APP_STATE.currentRace.timeRemaining--;
        if (badge) {
            badge.className = 'badge racing';
            badge.textContent = `PARIS OUVERTS : ${APP_STATE.currentRace.timeRemaining}s`;
        }

        if (APP_STATE.currentRace.timeRemaining <= 0) {
            clearInterval(APP_STATE.currentRace.betTimer);
            APP_STATE.currentRace.status = 'ready';
            if (badge) {
                badge.className = 'badge ready';
                badge.textContent = `PARIS FERMÉS • PRÊT AU DÉPART`;
            }
            playTaunt('horn');
        }
    }, 1000);
}

function triggerRaceStart() {
    const badge = document.getElementById('race-status-badge');
    if (badge) {
        badge.className = 'badge racing';
        badge.textContent = 'COURSE EN COURS ! 🏁';
    }

    playTaunt('rev');
    setTimeout(() => playTaunt('skid'), 1200);
    setTimeout(() => playTaunt('crash'), 2500);
}

// =============================================================================
// 9. PHOTO-FINISH & CLASSEMENTS
// =============================================================================
function initFinishSelectors() {
    for (let pos = 1; pos <= 4; pos++) {
        const select = document.getElementById(`finish-pos-${pos}`);
        if (!select) continue;

        select.innerHTML = '<option value="">-- Bolide à l\'arrivée --</option>';
        APP_STATE.cars.forEach(car => {
            const opt = document.createElement('option');
            opt.value = car.code;
            opt.textContent = `[${car.code}] ${car.alias}`;
            select.appendChild(opt);
        });
    }
}

function validateRaceResults() {
    const pos1 = document.getElementById('finish-pos-1').value;
    const pos2 = document.getElementById('finish-pos-2').value;
    const pos3 = document.getElementById('finish-pos-3').value;
    const pos4 = document.getElementById('finish-pos-4').value;

    const arrivals = [pos1, pos2, pos3, pos4];

    if (arrivals.some(c => !c)) {
        alert("⚠️ Veuillez renseigner l'ordre d'arrivée des 4 bolides !");
        return;
    }

    const uniqueArrivals = new Set(arrivals);
    if (uniqueArrivals.size < 4) {
        alert("⚠️ Un même bolide ne peut pas terminer à plusieurs positions différentes !");
        return;
    }

    // Points de Grand Prix : 1er=10pts, 2e=6pts, 3e=4pts, 4e=2pts
    const pointsMap = [10, 6, 4, 2];

    arrivals.forEach((code, idx) => {
        if (!APP_STATE.standings.cars[code]) {
            APP_STATE.standings.cars[code] = { points: 0, wins: 0, podiums: 0, races: 0 };
        }
        APP_STATE.standings.cars[code].points += pointsMap[idx];
        APP_STATE.standings.cars[code].races += 1;
        if (idx === 0) APP_STATE.standings.cars[code].wins += 1;
        if (idx < 3) APP_STATE.standings.cars[code].podiums = (APP_STATE.standings.cars[code].podiums || 0) + 1;
    });

    // Points Écuries : Recherche du propriétaire de chaque bolide dans les paddocks
    Object.entries(APP_STATE.paddocks).forEach(([tId, carsList]) => {
        const teamId = parseInt(tId, 10);
        if (!APP_STATE.standings.teams[teamId]) {
            APP_STATE.standings.teams[teamId] = { points: 0, wins: 0, podiums: 0, races: 0, coinsSpent: 0, coinsWon: 0, trapsUsed: 0, betsPlaced: 0 };
        }

        arrivals.forEach((code, idx) => {
            if (carsList.includes(code)) {
                APP_STATE.standings.teams[teamId].points += pointsMap[idx];
                APP_STATE.standings.teams[teamId].races += 1;
                if (idx === 0) APP_STATE.standings.teams[teamId].wins += 1;
                if (idx < 3) APP_STATE.standings.teams[teamId].podiums = (APP_STATE.standings.teams[teamId].podiums || 0) + 1;
            }
        });
    });

    // Règlement des Paris
    const winningCarCode = pos1;
    let wonTotalCoins = 0;

    APP_STATE.activeBets.forEach(bet => {
        if (bet.carCode === winningCarCode) {
            const gain = Math.round(bet.amount * bet.odds);
            wonTotalCoins += gain;
        }
    });

    const activeTeamId = APP_STATE.activeTeamId;
    if (wonTotalCoins > 0) {
        APP_STATE.coins += wonTotalCoins;
        if (activeTeamId && APP_STATE.standings.teams[activeTeamId]) {
            APP_STATE.standings.teams[activeTeamId].coinsWon = (APP_STATE.standings.teams[activeTeamId].coinsWon || 0) + wonTotalCoins;
        }
        playTaunt('mario');
        alert(`🎉 FÉLICITATIONS ! Vous avez remporté ${wonTotalCoins} pièces 🪙 sur vos paris !`);
    } else if (APP_STATE.activeBets.length > 0) {
        alert("💔 Pas de gain sur les paris de cette manche. Revanche à la prochaine !");
    }

    APP_STATE.activeBets = [];
    updateWalletDisplay();
    renderActiveBetsList();
    saveLocalStorage();
    renderStandings();

    const winnerCar = APP_STATE.cars.find(c => c.code === winningCarCode);
    alert(`🏆 Résultats Enregistrés !\n\n1er : ${winnerCar ? winnerCar.alias : winningCarCode} (+10 pts)\nPoints et classements mis à jour.`);
}

// =============================================================================
// 10. PARIS EN DIRECT (COTES & MISES)
// =============================================================================
function updateLiveBettingUI() {
    const grid = document.getElementById('betting-grid-cards');
    if (!grid) return;

    grid.innerHTML = '';
    const laneNames = ["VOIE 1 (JAUNE)", "VOIE 2 (VERT)", "VOIE 3 (ROUGE)", "VOIE 4 (BLEU)"];

    APP_STATE.currentRace.lanes.forEach((carCode, idx) => {
        const car = APP_STATE.cars.find(c => c.code === carCode);
        const odds = APP_STATE.currentRace.odds[idx] || 2.5;

        const card = document.createElement('div');
        card.className = `bet-card lane-${idx + 1}`;
        card.innerHTML = `
            <div class="lane-header">
                <span class="lane-tag">VOIE ${idx + 1}</span>
                <span class="lane-name">${laneNames[idx]}</span>
            </div>
            <h4>${car ? car.alias : 'Aucun Bolide'}</h4>
            <p style="font-size:0.85rem;color:var(--text-muted);">${car ? car.real_name : 'Sélectionnez sur la régie'}</p>
            
            <div class="bet-odds-badge">
                <span>COTE EN DIRECT</span>
                <strong>x${odds.toFixed(1)}</strong>
            </div>

            <div class="bet-quick-btns">
                <button class="btn-bet-coin" onclick="placeBet(${idx + 1}, 5)" ${!car ? 'disabled' : ''}>+5 🪙</button>
                <button class="btn-bet-coin" onclick="placeBet(${idx + 1}, 10)" ${!car ? 'disabled' : ''}>+10 🪙</button>
                <button class="btn-bet-coin" onclick="placeBet(${idx + 1}, 25)" ${!car ? 'disabled' : ''}>+25 🪙</button>
                <button class="btn-bet-coin" onclick="placeBet(${idx + 1}, 'all')" ${!car ? 'disabled' : ''}>TAPIS !</button>
            </div>
        `;
        grid.appendChild(card);
    });

    renderActiveBetsList();
}

window.placeBet = function(laneNum, amount) {
    const idx = laneNum - 1;
    const carCode = APP_STATE.currentRace.lanes[idx];
    if (!carCode) {
        alert("⚠️ Aucun bolide sur cette voie !");
        return;
    }

    let betCoins = amount === 'all' ? APP_STATE.coins : parseInt(amount, 10);

    if (betCoins <= 0) {
        alert("⚠️ Vous n'avez pas assez de pièces !");
        return;
    }

    if (betCoins > APP_STATE.coins) {
        alert(`⚠️ Solde insuffisant ! Vous disposez de ${APP_STATE.coins} 🪙.`);
        return;
    }

    APP_STATE.coins -= betCoins;
    const activeTeamId = APP_STATE.activeTeamId;
    if (activeTeamId && APP_STATE.standings.teams[activeTeamId]) {
        APP_STATE.standings.teams[activeTeamId].coinsSpent = (APP_STATE.standings.teams[activeTeamId].coinsSpent || 0) + betCoins;
        APP_STATE.standings.teams[activeTeamId].betsPlaced = (APP_STATE.standings.teams[activeTeamId].betsPlaced || 0) + 1;
    }

    const odds = APP_STATE.currentRace.odds[idx];

    APP_STATE.activeBets.push({
        lane: laneNum,
        carCode: carCode,
        amount: betCoins,
        odds: odds
    });

    updateWalletDisplay();
    renderActiveBetsList();
    playTaunt('coin');
};

function renderActiveBetsList() {
    const list = document.getElementById('active-bets-list');
    if (!list) return;

    if (APP_STATE.activeBets.length === 0) {
        list.innerHTML = '<li class="empty-msg">Aucun pari engagé sur cette manche.</li>';
        return;
    }

    list.innerHTML = '';
    APP_STATE.activeBets.forEach(bet => {
        const car = APP_STATE.cars.find(c => c.code === bet.carCode);
        const li = document.createElement('li');
        li.innerHTML = `
            <span>Voie ${bet.lane} : <strong>${car ? car.alias : bet.carCode}</strong> (Cote x${bet.odds.toFixed(1)})</span>
            <strong style="color:var(--neon-yellow);">${bet.amount} 🪙 &rarr; Gain pot. : ${Math.round(bet.amount * bet.odds)} 🪙</strong>
        `;
        list.appendChild(li);
    });
}

// =============================================================================
// 11. BOUTIQUE DE PIÈGES & CHAOS
// =============================================================================
window.buyTrap = function(trapName, price) {
    if (APP_STATE.coins < price) {
        alert(`⚠️ Pièces insuffisantes ! Vous avez ${APP_STATE.coins} 🪙 (Prix : ${price} 🪙).`);
        return;
    }

    APP_STATE.coins -= price;
    const activeTeamId = APP_STATE.activeTeamId;
    if (activeTeamId && APP_STATE.standings.teams[activeTeamId]) {
        APP_STATE.standings.teams[activeTeamId].coinsSpent = (APP_STATE.standings.teams[activeTeamId].coinsSpent || 0) + price;
        APP_STATE.standings.teams[activeTeamId].trapsUsed = (APP_STATE.standings.teams[activeTeamId].trapsUsed || 0) + 1;
    }

    updateWalletDisplay();
    playTaunt('coin');
    alert(`🛒 Vous avez acheté : "${trapName}" pour ${price} 🪙 !\nPrenez la pièce physique dans l'arsenal et posez-la sur la piste !`);
};

function initChaosWheel() {
    const btnSpin = document.getElementById('btn-spin-chaos');
    const resultBox = document.getElementById('chaos-result-box');
    const titleEl = document.getElementById('chaos-title');
    const descEl = document.getElementById('chaos-desc');

    if (btnSpin) {
        btnSpin.addEventListener('click', () => {
            playTaunt('laugh');
            const randomEvent = CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];

            if (titleEl) titleEl.textContent = randomEvent.title;
            if (descEl) descEl.textContent = randomEvent.desc;

            if (resultBox) {
                resultBox.style.display = 'block';
                resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }
}

// =============================================================================
// 12. CLASSEMENTS OFFICIELS & CÉRÉMONIE DES TROPHÉES
// =============================================================================
window.switchStandings = function(type) {
    const teamsBtn = document.getElementById('btn-view-teams');
    const carsBtn = document.getElementById('btn-view-cars');
    const trophiesBtn = document.getElementById('btn-view-trophies');
    const rulesBtn = document.getElementById('btn-view-rules-pts');

    const teamsPanel = document.getElementById('standings-teams-panel');
    const carsPanel = document.getElementById('standings-cars-panel');
    const trophiesPanel = document.getElementById('standings-trophies-panel');
    const rulesPanel = document.getElementById('standings-rules-pts-panel');

    const allBtns = [teamsBtn, carsBtn, trophiesBtn, rulesBtn];
    const allPanels = [teamsPanel, carsPanel, trophiesPanel, rulesPanel];

    allBtns.forEach(b => { if (b) b.classList.remove('active'); });
    allPanels.forEach(p => { if (p) p.style.display = 'none'; });

    if (type === 'teams') {
        if (teamsBtn) teamsBtn.classList.add('active');
        if (teamsPanel) teamsPanel.style.display = 'block';
        renderTeamsStandings();
    } else if (type === 'cars') {
        if (carsBtn) carsBtn.classList.add('active');
        if (carsPanel) carsPanel.style.display = 'block';
        renderCarsStandings();
    } else if (type === 'trophies') {
        if (trophiesBtn) trophiesBtn.classList.add('active');
        if (trophiesPanel) trophiesPanel.style.display = 'block';
        renderTrophiesPanel();
    } else if (type === 'rules_pts') {
        if (rulesBtn) rulesBtn.classList.add('active');
        if (rulesPanel) rulesPanel.style.display = 'block';
    }
};

function renderStandings() {
    renderTeamsStandings();
    renderCarsStandings();
    renderTrophiesPanel();
}

function renderTeamsStandings() {
    const tbody = document.getElementById('teams-standings-body');
    if (!tbody) return;

    const list = APP_STATE.teams.map(team => {
        const stats = APP_STATE.standings.teams[team.id] || { points: 0, wins: 0, podiums: 0, races: 0, coinsSpent: 0, coinsWon: 0, trapsUsed: 0, betsPlaced: 0 };
        const strategyBonus = Math.floor((stats.coinsSpent || 0) / 20);
        const totalPoints = (stats.points || 0) + strategyBonus;
        return { ...team, ...stats, strategyBonus, totalPoints };
    });

    list.sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins || (b.podiums || 0) - (a.podiums || 0));

    tbody.innerHTML = '';
    list.forEach((t, idx) => {
        const tr = document.createElement('tr');
        const rankClass = idx === 0 ? 'top-1' : idx === 1 ? 'top-2' : idx === 2 ? 'top-3' : '';
        const bonusTag = t.strategyBonus > 0 ? `<span style="font-size:0.75rem; color:#4ade80; margin-left:4px;">(+${t.strategyBonus}🪙)</span>` : '';
        tr.innerHTML = `
            <td class="rank-cell ${rankClass}">#${idx + 1}</td>
            <td>
                <div class="team-entry">
                    <img src="${t.logo}" alt="${t.name}" onerror="this.src='logos/01_laurent_petite_mimine_racing.png'">
                    <strong>${t.name}</strong>
                </div>
            </td>
            <td>${t.pilot} (${t.nickname})</td>
            <td class="pts-cell"><strong>${t.totalPoints} pts</strong>${bonusTag}</td>
            <td><strong>${t.wins}</strong> 🏆</td>
            <td><strong>${t.podiums || 0}</strong> 🎖️</td>
            <td><strong>${t.coinsSpent || 0}</strong> 🪙</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCarsStandings() {
    const tbody = document.getElementById('cars-standings-body');
    if (!tbody) return;

    // Cartographie bolide -> écurie propriétaire
    const carToTeam = {};
    Object.entries(APP_STATE.paddocks).forEach(([tId, carCodes]) => {
        const team = APP_STATE.teams.find(t => t.id === parseInt(tId, 10));
        if (team) {
            carCodes.forEach(code => {
                carToTeam[code] = team;
            });
        }
    });

    const list = APP_STATE.cars.map(car => {
        const stats = APP_STATE.standings.cars[car.code] || { points: 0, wins: 0, podiums: 0, races: 0 };
        const ownerTeam = carToTeam[car.code];
        return { ...car, ...stats, ownerTeam };
    });

    list.sort((a, b) => b.points - a.points || b.wins - a.wins || (b.podiums || 0) - (a.podiums || 0) || b.races - a.races);

    tbody.innerHTML = '';
    list.slice(0, 35).forEach((c, idx) => {
        const tr = document.createElement('tr');
        const rankClass = idx === 0 ? 'top-1' : idx === 1 ? 'top-2' : idx === 2 ? 'top-3' : '';
        const ownerName = c.ownerTeam ? `<span style="color:#facc15; font-size:0.8rem; font-weight:700;">${c.ownerTeam.name}</span>` : '<span style="color:var(--text-muted); font-size:0.8rem;">Non assigné</span>';
        tr.innerHTML = `
            <td class="rank-cell ${rankClass}">#${idx + 1}</td>
            <td><strong style="color:var(--neon-blue); font-family:var(--font-heading);">${c.code}</strong></td>
            <td><strong>${c.alias}</strong></td>
            <td>${c.real_name}</td>
            <td>${ownerName}</td>
            <td class="pts-cell"><strong>${c.points} pts</strong></td>
            <td><strong>${c.wins}</strong> 🏆</td>
            <td>${c.races}</td>
        `;
        tbody.appendChild(tr);
    });
}

function computeTournamentWinners() {
    // 1. Écuries ordonnées
    const teamsList = APP_STATE.teams.map(team => {
        const stats = APP_STATE.standings.teams[team.id] || { points: 0, wins: 0, podiums: 0, races: 0, coinsSpent: 0, coinsWon: 0, trapsUsed: 0, betsPlaced: 0 };
        const strategyBonus = Math.floor((stats.coinsSpent || 0) / 20);
        const totalPoints = (stats.points || 0) + strategyBonus;
        return { ...team, ...stats, strategyBonus, totalPoints };
    });
    teamsList.sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins || (b.podiums || 0) - (a.podiums || 0));

    // 2. Bolides ordonnés
    const carsList = APP_STATE.cars.map(car => {
        const stats = APP_STATE.standings.cars[car.code] || { points: 0, wins: 0, podiums: 0, races: 0 };
        return { ...car, ...stats };
    });
    carsList.sort((a, b) => b.points - a.points || b.wins - a.wins || b.races - a.races);

    // Propriétaire du meilleur bolide
    const bestCar = carsList[0] || APP_STATE.cars[0];
    let bestCarOwner = null;
    if (bestCar) {
        Object.entries(APP_STATE.paddocks).forEach(([tId, codes]) => {
            if (codes.includes(bestCar.code)) {
                bestCarOwner = APP_STATE.teams.find(t => t.id === parseInt(tId, 10));
            }
        });
    }

    // 3. Grand Flambeur (Plus de pièces dépensées)
    const sortedByCoins = [...teamsList].sort((a, b) => (b.coinsSpent || 0) - (a.coinsSpent || 0));
    const topGambler = sortedByCoins[0] || teamsList[0];

    // 4. Roi du Chaos (Plus de pièges utilisés)
    const sortedByTraps = [...teamsList].sort((a, b) => (b.trapsUsed || 0) - (a.trapsUsed || 0));
    const topSaboteur = sortedByTraps[0] || teamsList[0];

    // 5. Régularité (Plus de podiums)
    const sortedByPodiums = [...teamsList].sort((a, b) => (b.podiums || 0) - (a.podiums || 0));
    const topPodiums = sortedByPodiums[0] || teamsList[0];

    // 6. Révélation / Remontada (Écurie avec victoire héroïque)
    const outsider = teamsList.find(t => t.wins > 0 && t.totalPoints < teamsList[0].totalPoints) || teamsList[teamsList.length - 1] || teamsList[0];

    return {
        champion: teamsList[0] || APP_STATE.teams[0],
        second: teamsList[1] || APP_STATE.teams[1],
        third: teamsList[2] || APP_STATE.teams[2],
        bestCar: bestCar,
        bestCarOwner: bestCarOwner,
        topGambler: topGambler,
        topSaboteur: topSaboteur,
        topPodiums: topPodiums,
        outsider: outsider
    };
}

function renderTrophiesPanel() {
    const grid = document.getElementById('trophies-cards-grid');
    if (!grid) return;

    const w = computeTournamentWinners();

    grid.innerHTML = `
        <!-- 1. CHAMPION DU MONDE CONSTRUCTEURS -->
        <div class="trophy-card gold-theme">
            <span class="trophy-badge">🏆</span>
            <h4>Champion du Monde Constructeurs</h4>
            <p class="trophy-rule-desc">Couronne l'écurie #1 au cumul des points de ses bolides et bonus stratégiques.</p>
            <div class="trophy-winner-box">
                <img src="${w.champion.logo}" alt="${w.champion.name}" class="trophy-winner-logo" onerror="this.src='logos/09_esteban_titou_wyvern_srt.jpg'">
                <div class="trophy-winner-details">
                    <strong>${w.champion.name}</strong>
                    <span class="trophy-winner-sub">Pilote : ${w.champion.pilot}</span>
                    <span class="trophy-stat-pill">${w.champion.totalPoints} Points • ${w.champion.wins} Victoires 🥇</span>
                </div>
            </div>
        </div>

        <!-- 2. BOLIDE D'OR -->
        <div class="trophy-card silver-theme">
            <span class="trophy-badge">🏎️</span>
            <h4>Trophée du Bolide d'Or (Voitures)</h4>
            <p class="trophy-rule-desc">Récompense le bolide individuel le plus victorieux sur les 62 voitures engagées.</p>
            <div class="trophy-winner-box">
                <div class="trophy-winner-details">
                    <strong style="color:#38bdf8; font-size:1.1rem;">${w.bestCar ? w.bestCar.alias : 'Bolide'} (${w.bestCar ? w.bestCar.code : 'B01'})</strong>
                    <span class="trophy-winner-sub">${w.bestCar ? w.bestCar.real_name : 'Modèle'} • ${w.bestCarOwner ? w.bestCarOwner.name : 'Paddock libre'}</span>
                    <span class="trophy-stat-pill" style="border-color:#38bdf8; color:#7dd3fc; background:rgba(56,189,248,0.2);">
                        ${w.bestCar ? w.bestCar.points : 0} Points • ${w.bestCar ? w.bestCar.wins : 0} Victoires
                    </span>
                </div>
            </div>
        </div>

        <!-- 3. GRAND FLAMBEUR -->
        <div class="trophy-card emerald-theme">
            <span class="trophy-badge">🪙</span>
            <h4>Trophée Grand Flambeur de l'Année</h4>
            <p class="trophy-rule-desc">Récompense l'écurie ayant le plus investi de pièces d'or dans les paris et la boutique.</p>
            <div class="trophy-winner-box">
                <img src="${w.topGambler.logo}" alt="${w.topGambler.name}" class="trophy-winner-logo" onerror="this.src='logos/01_laurent_petite_mimine_racing.png'">
                <div class="trophy-winner-details">
                    <strong>${w.topGambler.name}</strong>
                    <span class="trophy-winner-sub">Pilote : ${w.topGambler.pilot}</span>
                    <span class="trophy-stat-pill" style="border-color:#10b981; color:#6ee7b7; background:rgba(16,185,129,0.2);">
                        ${w.topGambler.coinsSpent || 0} Pièces Investies 🪙
                    </span>
                </div>
            </div>
        </div>

        <!-- 4. ROI DU CHAOS -->
        <div class="trophy-card purple-theme">
            <span class="trophy-badge">💣</span>
            <h4>Trophée du Roi du Chaos & Saboteur</h4>
            <p class="trophy-rule-desc">Décerné au pilote ayant posé le plus de pièges physiques (bananes, Thwomps, carapaces).</p>
            <div class="trophy-winner-box">
                <img src="${w.topSaboteur.logo}" alt="${w.topSaboteur.name}" class="trophy-winner-logo" onerror="this.src='logos/01_laurent_petite_mimine_racing.png'">
                <div class="trophy-winner-details">
                    <strong>${w.topSaboteur.name}</strong>
                    <span class="trophy-winner-sub">Pilote : ${w.topSaboteur.pilot}</span>
                    <span class="trophy-stat-pill" style="border-color:#a855f7; color:#d8b4fe; background:rgba(168,85,247,0.2);">
                        ${w.topSaboteur.trapsUsed || 0} Pièges Déployés 🍌
                    </span>
                </div>
            </div>
        </div>

        <!-- 5. RÉGULARITÉ -->
        <div class="trophy-card bronze-theme">
            <span class="trophy-badge">🎖️</span>
            <h4>Trophée de la Régularité (Podium Master)</h4>
            <p class="trophy-rule-desc">Récompense l'écurie la plus constante ayant décroché le plus de Top 3 sans défaillance.</p>
            <div class="trophy-winner-box">
                <img src="${w.topPodiums.logo}" alt="${w.topPodiums.name}" class="trophy-winner-logo" onerror="this.src='logos/01_laurent_petite_mimine_racing.png'">
                <div class="trophy-winner-details">
                    <strong>${w.topPodiums.name}</strong>
                    <span class="trophy-winner-sub">Pilote : ${w.topPodiums.pilot}</span>
                    <span class="trophy-stat-pill" style="border-color:#f97316; color:#fdba74; background:rgba(249,115,22,0.2);">
                        ${w.topPodiums.podiums || 0} Podiums Décrochés 🥈🥉
                    </span>
                </div>
            </div>
        </div>

        <!-- 6. REMONTADA -->
        <div class="trophy-card blue-theme">
            <span class="trophy-badge">🚀</span>
            <h4>Trophée de la Révélation / Remontada</h4>
            <p class="trophy-rule-desc">Attribué à l'écurie outsider ayant signé la plus belle surprise et fait vibrer les spectateurs.</p>
            <div class="trophy-winner-box">
                <img src="${w.outsider.logo}" alt="${w.outsider.name}" class="trophy-winner-logo" onerror="this.src='logos/01_laurent_petite_mimine_racing.png'">
                <div class="trophy-winner-details">
                    <strong>${w.outsider.name}</strong>
                    <span class="trophy-winner-sub">Pilote : ${w.outsider.pilot}</span>
                    <span class="trophy-stat-pill" style="border-color:#3b82f6; color:#93c5fd; background:rgba(59,130,246,0.2);">
                        ${w.outsider.wins} Victoires Héroïques ⚡
                    </span>
                </div>
            </div>
        </div>
    `;
}

// Cérémonie Finale & Podium Modal
window.openCeremonyModal = function() {
    const modal = document.getElementById('ceremony-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    const w = computeTournamentWinners();

    // 1er (Champion)
    const name1 = document.getElementById('podium-name-1');
    const pilot1 = document.getElementById('podium-pilot-1');
    const pts1 = document.getElementById('podium-pts-1');
    const logo1 = document.getElementById('podium-logo-1');
    if (name1) name1.textContent = w.champion.name;
    if (pilot1) pilot1.textContent = w.champion.pilot;
    if (pts1) pts1.textContent = `${w.champion.totalPoints} pts`;
    if (logo1) logo1.src = w.champion.logo;

    // 2ème
    const name2 = document.getElementById('podium-name-2');
    const pilot2 = document.getElementById('podium-pilot-2');
    const pts2 = document.getElementById('podium-pts-2');
    const logo2 = document.getElementById('podium-logo-2');
    if (name2) name2.textContent = w.second.name;
    if (pilot2) pilot2.textContent = w.second.pilot;
    if (pts2) pts2.textContent = `${w.second.totalPoints} pts`;
    if (logo2) logo2.src = w.second.logo;

    // 3ème
    const name3 = document.getElementById('podium-name-3');
    const pilot3 = document.getElementById('podium-pilot-3');
    const pts3 = document.getElementById('podium-pts-3');
    const logo3 = document.getElementById('podium-logo-3');
    if (name3) name3.textContent = w.third.name;
    if (pilot3) pilot3.textContent = w.third.pilot;
    if (pts3) pts3.textContent = `${w.third.totalPoints} pts`;
    if (logo3) logo3.src = w.third.logo;

    // Grille des prix d'honneur
    const awardsGrid = document.getElementById('ceremony-awards-grid');
    if (awardsGrid) {
        awardsGrid.innerHTML = `
            <div class="ceremony-award-item">
                <span class="ceremony-award-icon">🏎️</span>
                <div class="ceremony-award-info">
                    <strong>Bolide d'Or 2026</strong>
                    <span class="ceremony-award-winner">${w.bestCar ? w.bestCar.alias : 'Bolide'}</span>
                    <span class="ceremony-award-detail">${w.bestCar ? w.bestCar.points : 0} pts • ${w.bestCarOwner ? w.bestCarOwner.name : ''}</span>
                </div>
            </div>
            <div class="ceremony-award-item">
                <span class="ceremony-award-icon">🪙</span>
                <div class="ceremony-award-info">
                    <strong>Grand Flambeur</strong>
                    <span class="ceremony-award-winner">${w.topGambler.name}</span>
                    <span class="ceremony-award-detail">${w.topGambler.coinsSpent || 0} pièces dépensées</span>
                </div>
            </div>
            <div class="ceremony-award-item">
                <span class="ceremony-award-icon">💣</span>
                <div class="ceremony-award-info">
                    <strong>Maître Saboteur</strong>
                    <span class="ceremony-award-winner">${w.topSaboteur.name}</span>
                    <span class="ceremony-award-detail">${w.topSaboteur.trapsUsed || 0} pièges déployés</span>
                </div>
            </div>
            <div class="ceremony-award-item">
                <span class="ceremony-award-icon">🎖️</span>
                <div class="ceremony-award-info">
                    <strong>Prix de la Régularité</strong>
                    <span class="ceremony-award-winner">${w.topPodiums.name}</span>
                    <span class="ceremony-award-detail">${w.topPodiums.podiums || 0} podiums</span>
                </div>
            </div>
        `;
    }

    playCeremonyFanfare();
    startConfettiAnimation();
    renderPlotTwistCards();
};

window.closeCeremonyModal = function() {
    const modal = document.getElementById('ceremony-modal');
    if (modal) modal.style.display = 'none';
    stopConfettiAnimation();
};

// Fanfare Triomphale (Web Audio API)
window.playCeremonyFanfare = function() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const notes = [
            { time: 0.0, freq: 261.63, dur: 0.18, type: 'triangle' }, // C4
            { time: 0.18, freq: 392.00, dur: 0.18, type: 'triangle' }, // G4
            { time: 0.36, freq: 523.25, dur: 0.28, type: 'triangle' }, // C5
            { time: 0.64, freq: 659.25, dur: 0.22, type: 'triangle' }, // E5
            { time: 0.86, freq: 783.99, dur: 0.28, type: 'triangle' }, // G5
            { time: 1.14, freq: 1046.50, dur: 0.95, type: 'sine' },    // High C6
            { time: 1.14, freq: 523.25, dur: 0.95, type: 'triangle' },
            { time: 1.14, freq: 659.25, dur: 0.95, type: 'triangle' }
        ];

        notes.forEach(n => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = n.type;
            osc.frequency.setValueAtTime(n.freq, now + n.time);

            gain.gain.setValueAtTime(0, now + n.time);
            gain.gain.linearRampToValueAtTime(0.25, now + n.time + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + n.time);
            osc.stop(now + n.time + n.dur + 0.05);
        });

        // Applaudissements / Acclamations de la foule en arrière-plan
        const bufferSize = ctx.sampleRate * 2.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.14;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 900;
        noiseFilter.Q.value = 1.4;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.001, now + 0.6);
        noiseGain.gain.linearRampToValueAtTime(0.2, now + 1.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now + 0.6);
    } catch (e) {
        console.warn("Erreur fanfare:", e);
    }
};

// Moteur de Confettis Canvas interactif
let confettiAnimId = null;
function startConfettiAnimation() {
    const canvas = document.getElementById('ceremony-confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#facc15', '#f59e0b', '#ef4444', '#38bdf8', '#4ade80', '#ec4899', '#ffffff'];
    const particles = [];
    for (let i = 0; i < 140; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 10 + 6,
            color: colors[Math.floor(Math.random() * colors.length)],
            speedY: Math.random() * 3 + 2.5,
            speedX: Math.random() * 3 - 1.5,
            rotation: Math.random() * 360,
            rotSpeed: Math.random() * 6 - 3
        });
    }

    function renderConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.y += p.speedY;
            p.x += p.speedX;
            p.rotation += p.rotSpeed;

            if (p.y > canvas.height) {
                p.y = -20;
                p.x = Math.random() * canvas.width;
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        });

        confettiAnimId = requestAnimationFrame(renderConfetti);
    }

    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
    renderConfetti();
}

function stopConfettiAnimation() {
    if (confettiAnimId) {
        cancelAnimationFrame(confettiAnimId);
        confettiAnimId = null;
    }
    const canvas = document.getElementById('ceremony-confetti-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// =============================================================================
// 12-B. LES TROPHÉES "PLOT TWIST" (SURPRISES & MEMES DE FIN DE TOURNOI)
// =============================================================================
const PLOT_TWIST_ROSTER = [
    {
        id: 'wolf_wall_street',
        icon: '🐺',
        title: 'Le Trophée "Loup de Wall Street"',
        badge: 'MEME & FINANCE',
        quote: '"Vendez-moi ce stylo ! Vendez la caravane, on mise TOUT sur la voie 3 !"',
        desc: 'Attribué au pilote ayant pris le plus de risques financiers insensés aux paris ou ayant fait trembler la banque des pièces.',
        evaluate: (teams, cars) => {
            const sorted = [...teams].sort((a, b) => ((b.coinsSpent || 0) + (b.betsPlaced || 0) * 10) - ((a.coinsSpent || 0) + (a.betsPlaced || 0) * 10));
            const winner = sorted[0] || teams[0];
            return {
                winnerTeam: winner,
                reason: `A engagé un pactole de ${winner.coinsSpent || 35} pièces 🪙 en mode flambeur absolu.`
            };
        }
    },
    {
        id: 'michael_bay',
        icon: '💥',
        title: 'L\'Oscar Michael Bay des Explosions',
        badge: 'HOLLYWOOD CHAOS',
        quote: '"Pas de scénario, juste des crashs à 300 millions de dollars et des étincelles !"',
        desc: 'Décerné à l\'écurie qui a déclenché le carambolage le plus spectaculaire ou semé la panique avec des pièges explosifs.',
        evaluate: (teams, cars) => {
            const sorted = [...teams].sort((a, b) => (b.trapsUsed || 0) - (a.trapsUsed || 0));
            const winner = sorted[0] || teams[teams.length - 1];
            return {
                winnerTeam: winner,
                reason: `A transformé la ligne droite en champ de bataille avec ${winner.trapsUsed || 3} pièges déployés.`
            };
        }
    },
    {
        id: 'godfather',
        icon: '🕶️',
        title: 'Le Trophée "Le Parrain de la Piste"',
        badge: 'MAFIA & STRATÉGIE',
        quote: '"Je vais lui faire une offre qu\'il ne pourra pas refuser... comme une carapace bleue dans le dos."',
        desc: 'Attribué au pilote le plus machiavélique ayant ruiné la course d\'un favori au dernier virage avec un sang-froid glacial.',
        evaluate: (teams, cars) => {
            const winner = teams[Math.floor(Math.random() * teams.length)];
            return {
                winnerTeam: winner,
                reason: 'A placé un piège assassin au millimètre près pour éliminer son rival direct.'
            };
        }
    },
    {
        id: 'tortoise',
        icon: '🐌',
        title: 'Le Prix du Lièvre et de la Tortue',
        badge: 'ENDURANCE & GLOIRE',
        quote: '"Rien ne sert de courir... il suffit d\'attendre que les trois premiers explosent !"',
        desc: 'Couronne le bolide le plus lent du circuit qui a terminé avec 30 secondes de retard mais a profité des crashs pour monter sur le podium.',
        evaluate: (teams, cars) => {
            const slowestCar = cars.slice().reverse()[0] || cars[0];
            let owner = teams[0];
            Object.entries(APP_STATE.paddocks).forEach(([tId, codes]) => {
                if (codes.includes(slowestCar.code)) owner = teams.find(t => t.id === parseInt(tId, 10)) || owner;
            });
            return {
                winnerTeam: owner,
                winnerCar: slowestCar,
                reason: `Bolide ${slowestCar.alias} (${slowestCar.code}) : Arrivé à son rythme en saluant le public !`
            };
        }
    },
    {
        id: 'kachow_fail',
        icon: '⚡',
        title: 'Le Prix "Ka-Chow !" de Flash McQueen',
        badge: 'PLOT TWIST CRUEL',
        quote: '"Je suis la vitesse... Ah attendez, pourquoi je me fais doubler sur la ligne ?!"',
        desc: 'Décerné au bolide qui menait toute la course avec panache mais s\'est fait coiffer au poteau sur les 5 derniers centimètres.',
        evaluate: (teams, cars) => {
            const winner = teams[(Math.floor(Math.random() * (teams.length - 1)) + 1)] || teams[1];
            return {
                winnerTeam: winner,
                reason: 'Célébrait déjà la victoire le poing levé avant que la cellule ne valide son dauphin.'
            };
        }
    },
    {
        id: 'uber_eats',
        icon: '🍕',
        title: 'Le Prix "Livraison Pizza Express"',
        badge: 'VITESSE RECORD',
        quote: '"Votre commande de pizza 4 fromages arrive encore bouillante en 2,3 secondes."',
        desc: 'Attribué au départ le plus foudroyant de la saison, avec accélération gravitationnelle maximale.',
        evaluate: (teams, cars) => {
            const fastCar = cars.find(c => c.weight_g && c.weight_g >= 40) || cars[0];
            let owner = teams[1] || teams[0];
            Object.entries(APP_STATE.paddocks).forEach(([tId, codes]) => {
                if (codes.includes(fastCar.code)) owner = teams.find(t => t.id === parseInt(tId, 10)) || owner;
            });
            return {
                winnerTeam: owner,
                winnerCar: fastCar,
                reason: `Avec le bolide ${fastCar.alias} : flashé au radar sans toucher aux freins.`
            };
        }
    },
    {
        id: 'heist_oceans11',
        icon: '🕵️',
        title: 'Le Casse du Siècle (Ocean\'s 11)',
        badge: 'HOLD-UP DU SIÈCLE',
        quote: '"Personne ne l\'avait vu venir... Pas même les commissaires de course !"',
        desc: 'Récompense la victoire la plus improbable avec la cote la plus folle du tournoi (outsider total).',
        evaluate: (teams, cars) => {
            const outsider = teams[teams.length - 2] || teams[0];
            return {
                winnerTeam: outsider,
                reason: 'A braqué les pronostics officiels avec une audace déconcertante.'
            };
        }
    },
    {
        id: 'taunt_king',
        icon: '📢',
        title: 'Le Roi de la Taunt Box (Chambrage VIP)',
        badge: 'GUERRE PSYCHOLOGIQUE',
        quote: '"Klaxon italien, rire de Joker et vrombissement V8 : la bande-son de vos cauchemars !"',
        desc: 'Décerné au pilote qui a le plus martelé la Taunt Box pour déstabiliser ses rivaux avant le feu vert.',
        evaluate: (teams, cars) => {
            const winner = teams[3] || teams[0];
            return {
                winnerTeam: winner,
                reason: 'A fait vibrer les enceintes de la régie avec des bruitages de provocation en continu.'
            };
        }
    },
    {
        id: 'tank_armor',
        icon: '🛡️',
        title: 'Le Prix "Char d\'Assaut Blindé"',
        badge: 'BLINDAGE MAXIMUM',
        quote: '"Une rayure sur la carrosserie ? Non, c\'est la piste qui a pris un coup !"',
        desc: 'Attribué au véhicule le plus lourd et destructeur qui a percuté tous les obstacles sans jamais vaciller.',
        evaluate: (teams, cars) => {
            const heavyCar = [...cars].sort((a, b) => (b.weight_g || 0) - (a.weight_g || 0))[0] || cars[0];
            let owner = teams[0];
            Object.entries(APP_STATE.paddocks).forEach(([tId, codes]) => {
                if (codes.includes(heavyCar.code)) owner = teams.find(t => t.id === parseInt(tId, 10)) || owner;
            });
            return {
                winnerTeam: owner,
                winnerCar: heavyCar,
                reason: `${heavyCar.alias} (${heavyCar.weight_g || 48}g de métal zamak) : a pulvérisé tous les pièges sur son passage.`
            };
        }
    },
    {
        id: 'popcorn_vip',
        icon: '🍿',
        title: 'Le Trophée "Popcorn & Chicha VIP"',
        badge: 'SPECTATEUR ROYAL',
        quote: '"Pourquoi s\'énerver à courir quand on peut regarder les autres se crasher en sirotant un diabolo ?!"',
        desc: 'Récompense le stratège le plus zen qui a amassé son pactole sans stresser sur la grille.',
        evaluate: (teams, cars) => {
            const chill = teams[Math.floor(Math.random() * teams.length)];
            return {
                winnerTeam: chill,
                reason: 'Est resté confortablement installé dans le salon VIP en comptant ses gains.'
            };
        }
    }
];

window.triggerPlotTwistTrophies = function() {
    if (!APP_STATE.revealedPlotTwists) APP_STATE.revealedPlotTwists = [];

    // Filtrer les trophées non encore révélés
    const alreadyRevealedIds = new Set(APP_STATE.revealedPlotTwists.map(p => p.id));
    let available = PLOT_TWIST_ROSTER.filter(p => !alreadyRevealedIds.has(p.id));

    // Si tous ont été révélés, on autorise à en relancer un
    if (available.length === 0) {
        available = PLOT_TWIST_ROSTER;
    }

    const selectedTrophy = available[Math.floor(Math.random() * available.length)];

    // Calculer le gagnant
    const teamsList = APP_STATE.teams.map(team => {
        const stats = APP_STATE.standings.teams[team.id] || { points: 0, wins: 0, podiums: 0, races: 0, coinsSpent: 0, coinsWon: 0, trapsUsed: 0, betsPlaced: 0 };
        return { ...team, ...stats };
    });
    const carsList = APP_STATE.cars.map(car => {
        const stats = APP_STATE.standings.cars[car.code] || { points: 0, wins: 0, races: 0 };
        return { ...car, ...stats };
    });

    const evaluated = selectedTrophy.evaluate(teamsList, carsList);

    const awardRecord = {
        id: selectedTrophy.id,
        icon: selectedTrophy.icon,
        title: selectedTrophy.title,
        badge: selectedTrophy.badge,
        quote: selectedTrophy.quote,
        desc: selectedTrophy.desc,
        winnerTeamName: evaluated.winnerTeam ? evaluated.winnerTeam.name : 'Écurie Mystère',
        winnerTeamLogo: evaluated.winnerTeam ? evaluated.winnerTeam.logo : 'logos/01_laurent_petite_mimine_racing.png',
        winnerPilot: evaluated.winnerTeam ? evaluated.winnerTeam.pilot : 'Pilote',
        reason: evaluated.reason,
        timestamp: Date.now()
    };

    // Ajouter au début de la liste
    APP_STATE.revealedPlotTwists.unshift(awardRecord);
    saveLocalStorage();

    // Effet sonore dramatique de Plot Twist
    playPlotTwistSound();

    // Rendu dans l'onglet et dans le modal
    renderPlotTwistCards();

    // Scroll vers la carte
    const firstCard = document.querySelector('.plot-twist-card');
    if (firstCard) {
        firstCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
};

function renderPlotTwistCards() {
    const standingsGrid = document.getElementById('standings-plot-twist-grid');
    const ceremonyGrid = document.getElementById('ceremony-plot-twist-grid');

    if (!APP_STATE.revealedPlotTwists || APP_STATE.revealedPlotTwists.length === 0) {
        if (standingsGrid) standingsGrid.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem; font-style:italic;">Aucun trophée secret révélé pour le moment. Cliquez sur le bouton pour en tirer un !</p>';
        if (ceremonyGrid) ceremonyGrid.innerHTML = '';
        return;
    }

    const htmlContent = APP_STATE.revealedPlotTwists.map((t, idx) => `
        <div class="plot-twist-card">
            <span class="plot-twist-card-badge">${t.badge}</span>
            <div>
                <span class="plot-twist-icon-large">${t.icon}</span>
                <h4>${t.title}</h4>
                <div class="plot-twist-quote">${t.quote}</div>
                <p class="plot-twist-desc">${t.desc}</p>
            </div>
            <div class="plot-twist-winner">
                <img src="${t.winnerTeamLogo}" alt="${t.winnerTeamName}" class="plot-twist-winner-logo" onerror="this.src='logos/01_laurent_petite_mimine_racing.png'">
                <div class="plot-twist-winner-info">
                    <strong>${t.winnerTeamName}</strong>
                    <span>${t.winnerPilot}</span>
                    <div style="font-size:0.75rem; color:#facc15; margin-top:2px;">${t.reason}</div>
                </div>
            </div>
        </div>
    `).join('');

    if (standingsGrid) standingsGrid.innerHTML = htmlContent;
    if (ceremonyGrid) ceremonyGrid.innerHTML = htmlContent;
}

// Bruitage Dramatique Plot Twist (Web Audio API)
function playPlotTwistSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // 1. Basse d'impact dramatique
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        subOsc.type = 'sawtooth';
        subOsc.frequency.setValueAtTime(140, now);
        subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.8);

        const subFilter = ctx.createBiquadFilter();
        subFilter.type = 'lowpass';
        subFilter.frequency.setValueAtTime(450, now);
        subFilter.frequency.exponentialRampToValueAtTime(80, now + 0.8);

        subGain.gain.setValueAtTime(0.35, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        subOsc.connect(subFilter);
        subFilter.connect(subGain);
        subGain.connect(ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 1.3);

        // 2. Sirène / Stinger de suspense montant
        const stingOsc = ctx.createOscillator();
        const stingGain = ctx.createGain();
        stingOsc.type = 'square';
        stingOsc.frequency.setValueAtTime(440, now + 0.05);
        stingOsc.frequency.linearRampToValueAtTime(880, now + 0.35);
        stingOsc.frequency.linearRampToValueAtTime(440, now + 0.65);
        stingOsc.frequency.linearRampToValueAtTime(880, now + 0.95);

        stingGain.gain.setValueAtTime(0.001, now);
        stingGain.gain.linearRampToValueAtTime(0.18, now + 0.1);
        stingGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

        stingOsc.connect(stingGain);
        stingGain.connect(ctx.destination);
        stingOsc.start(now + 0.05);
        stingOsc.stop(now + 1.2);

    } catch (e) {
        console.warn("Erreur son plot twist:", e);
    }
}

// =============================================================================
// 13. GESTION DYNAMIQUE DU THÈME, DU FOND ET DES PARTICULES
// =============================================================================
const MODE_TITLES = {
    'gp_pure': 'Grand Prix — Pure Vitesse (Noël & Feu de Cheminée)',
    'gp_strategy': 'Grand Prix — Stratégie (Noël & Feu de Cheminée)',
    'boss_tomica': 'Boss Fight — Le Shogun Tomica & Hatsune Miku',
    'boss_majorette': 'Défi Cocorico — Le Gang Majorette (Le Mans Vintage)',
    'f1_apex': 'Apex Challenge — 100% Formule 1 (Monaco Night)',
    'survival': 'Survie Ultime — Mort Subite (Lave & Alerte Rouge)',
    'chaos_unlimited': 'Chaos Total — Obstacles Illimités (Rainbow Warp)',
    'relic_cup': 'Coupe des Reliques — Les 20 Anciennes (Nostalgie 90s)'
};

// =============================================================================
// CATALOGUE DES VIDÉOS RÉALISTES 4K & ÉDITS ANIMES (YOUTUBE EMBED 60FPS)
// =============================================================================
const MODE_VIDEOS = {
    // Grand Prix de Noël : Hot Wheels / Mario Kart Rainbow Road 4-Voies 4K60
    'gp_pure': 'uX7qRu56JfQ',
    'gp_strategy': 'N98naby_xUA',

    // Boss Fight Tomica : Tokyo JDM Masters Neon Night Drift Edit
    'boss_tomica': 'Iy5OMrgD8JQ',

    // Défi Cocorico : Le Mans Classic 1965 POV Onboard Français
    'boss_majorette': '0N4qvwho9ro',

    // Apex F1 : Assetto Corsa Classic Ferrari F1 Monaco 60FPS (Non-FOM, 100% embed autorisé)
    'f1_apex': '3NDZVN4HQfQ',

    // Survie Mort Subite : Mad Max Fury Road Desert War Rig Convoy Pursuit
    'survival': 'mLd0-eFNrZE',

    // Chaos Total : Redline (2009) — Course Ultime Yellow Line Race (Animation Japonaise d'anthologie, crashs spectaculaires, explosions géantes, missiles & nitro)
    'chaos_unlimited': 'aTBLelM_SyI',

    // Coupe des Reliques : 1980's Group B Rally Insanity (Lancia Delta, Audi Quattro - Rétro Authentique)
    'relic_cup': 'Ntp85nlChj0'
};

// =============================================================================
// RÈGLEMENTS OFFICIELS & FLAVOR TEXT DES 8 MODES DE JEU
// =============================================================================
const MODE_RULES = {
    'gp_pure': {
        icon: '🏆',
        title: 'Grand Prix — Pure Vitesse (Zéro Obstacle)',
        badge: 'CIRCUIT OFFICIEL MARIO KART 3D',
        type: 'Championnat au temps • 4 Voies Rainbow Road',
        rules: [
            { icon: '🚦', text: 'Départ simultané par abaissement mécanique du portique à 4 voies.' },
            { icon: '🚫', text: 'Piste 100% propre : Aucun piège ni obstacle au Tour 1.' },
            { icon: '🥇', text: 'Barème officiel : 1er = 5 pts (+25🪙), 2e = 3 pts (+15🪙), 3e = 2 pts (+10🪙), 4e = 1 pt (+5🪙).' },
            { icon: '🏁', text: 'Le premier bolide qui franchit le capteur d\'arrivée gagne la manche.' }
        ],
        tip: 'Privilégiez les bolides lourds en zamak pour maximiser l\'inertie gravitationnelle dans la descente !'
    },
    'gp_strategy': {
        icon: '⭐',
        title: 'Grand Prix — Paris & Stratégie (Bonus / Malus)',
        badge: 'PARIS & OBJETS TACTIQUES',
        type: 'Championnat stratégique • Économie de Pièces',
        rules: [
            { icon: '🪙', text: 'Misez vos pièces avant le départ sur la voie ou le pilote de votre choix.' },
            { icon: '🍌', text: 'Achat de pièges physiques 3D (bananes, thwomps) : max 2 par voie.' },
            { icon: '💥', text: 'Un piège touché immobilise ou ralentit le bolide : aucun remboursement !' },
            { icon: '👑', text: 'Les gains des paris permettent d\'acheter des cartes Bonus au tour suivant.' }
        ],
        tip: 'Placez vos bananes 3D juste après les virages aveugles pour surprendre les favoris !'
    },
    'boss_tomica': {
        icon: '🇯🇵',
        title: 'Boss Fight — Le Shogun Tomica (Tokyo Drift)',
        badge: 'SHINJUKU TOUGE BATTLE • 1 VS 1',
        type: 'Défi Boss Asymétrique • Vitesse & Précision',
        rules: [
            { icon: '⚡', text: 'Affrontez le Boss mécanique légendaire Tomica (châssis lourd japonais).' },
            { icon: '⏱️', text: 'Handicap Boss : Le Boss s\'élance avec 0.3s d\'avance sur le peloton.' },
            { icon: '🌀', text: 'Drift au virage serré : Tout contact barrière inflige +2s de pénalité.' },
            { icon: '⛩️', text: 'Terrasser le Shogun rapporte 50 pièces d\'or et le titre de Shogun du Touge.' }
        ],
        tip: 'Les bolides à empattement court négocient mieux la chicane Tomica sans toucher les rails.'
    },
    'survival': {
        icon: '💀',
        title: 'Survie Ultime — Mort Subite (Wasteland Derby)',
        badge: 'ZONE DE GUERRE SANS PITIE • TOP 1 UNIQUE',
        type: 'Battle Royale Automobile • Élimination Directe',
        rules: [
            { icon: '☠️', text: 'MORT SUBITE : Le dernier bolide de chaque manche est ÉLIMINÉ D.N.F. sur le coup !' },
            { icon: '🛡️', text: 'Dégâts de carrosserie et carambolages 100% autorisés : aucun commissaire de piste.' },
            { icon: '🚫', text: 'Aucune réparation ni changement de véhicule permis entre les manches.' },
            { icon: '👑', text: 'Seul l\'ultime bolide survivant à la 4e manche remporte le Trophée Cascadeur Suprême.' }
        ],
        tip: 'Les bolides blindés et massifs encaissent mieux les chocs lors des compressions de piste.'
    },
    'f1_apex': {
        icon: '🏎️',
        title: 'Apex Challenge — 100% Formule 1 (Monaco Telemetry)',
        badge: 'RÈGLEMENT OFFICIEL FIA MONACO',
        type: 'Précision Pure au Millimètre • Télémétrie Pro',
        rules: [
            { icon: '🚦', text: 'Départ aux feux FIA : 5 feux rouges séquentiels puis extinction aléatoire.' },
            { icon: '🛑', text: 'Respect strict des Track Limits : tout franchissement de ligne blanche = pénalité 5s.' },
            { icon: '💨', text: 'Activation DRS : autorisée uniquement sur la longue ligne droite des stands.' },
            { icon: '⏱️', text: 'Chronométrage au 1/1000e de seconde : bonus +10 pts pour le tour le plus rapide.' }
        ],
        tip: 'Les monoplaces aérodynamiques à profil bas génèrent moins de traînée sur les lignes droites.'
    },
    'chaos_unlimited': {
        icon: '🌋',
        title: 'Chaos Total — Obstacles & Pièges Illimités',
        badge: 'CARNAGE TOTAL • TOUS LES COUPS SONT PERMIS',
        type: 'Foire d\'Empoigne • Zéro Arbitrage',
        rules: [
            { icon: '🍌', text: 'PIÈGES ILLIMITÉS : Déposez autant de bananes et de thwomps que vous voulez.' },
            { icon: '💣', text: 'Carapaces bleues, bombes et éclairs utilisables sans restriction de quota.' },
            { icon: '🔄', text: 'Inversion des voies et bousculades physiques encouragées à chaque relance.' },
            { icon: '🎉', text: 'Le plus gros carambolage de la manche gagne le prix spécial du Jury !' }
        ],
        tip: 'Surveillez vos arrières : même en tête, une carapace peut vous projeter hors de la piste !'
    },
    'boss_majorette': {
        icon: '🇫🇷',
        title: 'Défi Cocorico — Le Gang Majorette (Le Mans Vintage)',
        badge: 'ENDURANCE CLASSIQUE 24 HEURES',
        type: 'Relais d\'Endurance • Prestige Automobile',
        rules: [
            { icon: '🐓', text: 'Hommage aux icônes françaises (Alpine, Renault 5, Twingo, 205 Turbo).' },
            { icon: '🇫🇷', text: 'Bonus Cocorico : Les écuries françaises démarrent avec +1m d\'avance sur la grille.' },
            { icon: '🌙', text: 'Manche nocturne : Piste plongée dans la pénombre avec projecteurs jaunes.' },
            { icon: '🏆', text: 'Le bolide le plus endurant sur 5 relais cumulés remporte la Coupe de France.' }
        ],
        tip: 'La régularité au passage de relais compte davantage que la vitesse de pointe instantanée.'
    },
    'relic_cup': {
        icon: '🕰️',
        title: 'Coupe des Reliques — Les 20 Bolides Anciens d\'Enfance',
        badge: 'NOSTALGIE RETRO 80s/90s • OUTRUN VIBES',
        type: 'Véhicules Historiques Cabossés • Cotes x12',
        rules: [
            { icon: '📼', text: 'Réservé exclusivement aux 20 bolides anciens de collection d\'enfance.' },
            { icon: '👴', text: 'Règle "Départ Papy" : Poussette fraternelle autorisée si le bolide cale sur le départ.' },
            { icon: '🎲', text: 'Cotes de paris explosives : jusqu\'à x12 de gains pour les voitures les plus fatiguées !' },
            { icon: '💖', text: 'Bonus affectif du public : vote à l\'applaudimètre pour attribuer la dernière Étoile.' }
        ],
        tip: 'Ne sous-estimez jamais une carrosserie écaillée : les essieux rodés par le temps réservent des surprises !'
    }
};

function renderModeRules(mode) {
    const container = document.getElementById('mode-rules-hud');
    if (!container) return;

    const data = MODE_RULES[mode] || MODE_RULES['gp_pure'];
    if (!data) return;

    const rulesHtml = data.rules.map(r => `
        <div class="mode-rule-item">
            <span class="rule-icon">${r.icon}</span>
            <span class="rule-text">${r.text}</span>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="mode-hud-header">
            <div class="mode-hud-title-wrap">
                <span class="mode-hud-main-icon">${data.icon}</span>
                <div class="mode-hud-titles">
                    <h3 class="mode-hud-title">${data.title}</h3>
                    <div class="mode-hud-badges">
                        <span class="mode-badge-type">${data.type}</span>
                        <span class="mode-badge-special">${data.badge}</span>
                    </div>
                </div>
            </div>
            <div class="mode-hud-meta">
                <span class="mode-hud-players">👥 2 à 16 Pilotes</span>
                <span class="mode-hud-loot">🪙 Butin : +25 à +50 Pièces</span>
            </div>
        </div>
        <div class="mode-rules-grid">
            ${rulesHtml}
        </div>
        <div class="mode-hud-footer">
            <span class="mode-tip-icon">💡 CONSEIL DE PISTE :</span>
            <span class="mode-tip-text">${data.tip}</span>
        </div>
    `;
}

function initDynamicBackground() {
    const modeSelect = document.getElementById('race-mode-select');
    if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
            setGameMode(e.target.value);
        });
    }

    initCanvasParticles();
    setGameMode(modeSelect ? modeSelect.value : 'gp_pure');
}

function setGameMode(mode) {
    APP_STATE.activeMode = mode;
    document.body.setAttribute('data-mode', mode);

    // Mettre à jour l'affichage de la bannière spécifique au mode
    const allBanners = document.querySelectorAll('.mode-banner-banner');
    allBanners.forEach(b => b.classList.remove('active'));

    let activeBannerId = 'banner-rainbow';
    if (mode === 'boss_tomica') activeBannerId = 'banner-tokyo';
    else if (mode === 'survival') activeBannerId = 'banner-madmax';
    else if (mode === 'f1_apex') activeBannerId = 'banner-f1';
    else if (mode === 'chaos_unlimited') activeBannerId = 'banner-chaos';
    else if (mode === 'boss_majorette') activeBannerId = 'banner-majorette';
    else if (mode === 'relic_cup') activeBannerId = 'banner-relic';

    const currentBanner = document.getElementById(activeBannerId);
    if (currentBanner) currentBanner.classList.add('active');

    // Mettre à jour le HUD des règles officielles
    renderModeRules(mode);

    // Réinitialiser les particules d'arrière-plan
    seedParticlesForMode(mode);

    // Réinitialiser les effets et stickers qui passent au premier plan
    if (typeof seedForegroundParticles === 'function') {
        seedForegroundParticles(mode);
    }

    // Mettre à jour la vidéo d'arrière-plan réaliste en fondu
    updateBackgroundVideo(mode);

    // Mettre à jour la playlist officielle du Jukebox
    if (typeof switchJukeboxMode === 'function') {
        switchJukeboxMode(mode);
    }

    // Si la musique procédurale thématique est active, adapter la bande-son en douceur
    if (APP_STATE.ambientMusic.isPlaying) {
        updateAmbientMusicTrack();
    }
}

// =============================================================================
// CATALOGUE DES VIDÉOS LOCALES MP4 (DOSSIER app/videos/)
// =============================================================================
const MODE_LOCAL_VIDEOS = {
    'gp_pure': 'gp_noel.mp4',
    'gp_strategy': 'gp_noel.mp4',
    'boss_tomica': 'tokyo_drift.mp4',
    'boss_majorette': 'cocorico.mp4',
    'f1_apex': 'f1_apex.mp4',
    'survival': 'survival.mp4',
    'chaos_unlimited': 'mario_kart.mp4',
    'relic_cup': 'relics.mp4'
};

// -----------------------------------------------------------------------------
// GESTION DU FOND VIDÉO RÉALISTE (YOUTUBE 4K & MP4 LOCAL)
// -----------------------------------------------------------------------------
function initVideoToggle() {
    const btn = document.getElementById('btn-toggle-video');
    if (!btn) return;

    btn.addEventListener('click', () => {
        APP_STATE.videoBackground.enabled = !APP_STATE.videoBackground.enabled;
        saveLocalStorage();
        updateVideoToggleUI();
        updateBackgroundVideo(APP_STATE.activeMode);
    });

    updateVideoToggleUI();
}

function updateVideoToggleUI() {
    const btn = document.getElementById('btn-toggle-video');
    if (!btn) return;

    const icon = btn.querySelector('.video-icon');
    const text = btn.querySelector('.video-text');

    if (APP_STATE.videoBackground.enabled) {
        btn.classList.add('active');
        if (icon) icon.textContent = '🎬';
        if (text) text.textContent = 'VIDÉO : ON';
    } else {
        btn.classList.remove('active');
        if (icon) icon.textContent = '⏹️';
        if (text) text.textContent = 'VIDÉO : OFF';
    }
}

function updateBackgroundVideo(mode) {
    const wrapper = document.getElementById('bg-video-wrapper');
    const iframe = document.getElementById('bg-video-iframe');
    const localVideo = document.getElementById('bg-local-video');
    if (!wrapper) return;

    if (!APP_STATE.videoBackground.enabled || APP_STATE.videoBackground.source === 'art') {
        document.body.classList.remove('video-active');
        wrapper.classList.add('hidden');
        if (iframe) {
            iframe.src = '';
            iframe.style.display = 'none';
        }
        if (localVideo) {
            localVideo.pause();
            localVideo.style.display = 'none';
        }
        APP_STATE.videoBackground.currentVideoId = '';
        return;
    }

    // Activer l'affichage vidéo par-dessus le fond statique
    document.body.classList.add('video-active');
    wrapper.classList.remove('hidden');

    // Appliquer l'opacité et les filtres configurés
    const opacityVal = (APP_STATE.videoBackground.opacity || 85) / 100;
    const brightVal = (APP_STATE.videoBackground.brightness || 100) / 100;
    wrapper.style.opacity = opacityVal;
    wrapper.style.filter = brightVal !== 1 ? `brightness(${brightVal})` : 'none';

    const targetMode = mode || APP_STATE.activeMode;
    const targetVideoId = APP_STATE.videoBackground.customUrl || MODE_VIDEOS[targetMode] || MODE_VIDEOS['gp_pure'];

    // 1. GESTION SOURCE FICHIER LOCAL MP4
    if (APP_STATE.videoBackground.source === 'local') {
        if (iframe) {
            iframe.style.display = 'none';
            iframe.src = '';
        }
        if (localVideo) {
            localVideo.style.display = 'block';
            const localFileName = APP_STATE.videoBackground.customUrl || MODE_LOCAL_VIDEOS[targetMode] || 'gp_noel.mp4';
            const targetSrc = `videos/${localFileName}`;
            if (!localVideo.src.includes(localFileName)) {
                localVideo.src = targetSrc;
                localVideo.play().catch(e => {
                    console.log("Fichier vidéo local non trouvé ou bloqué, passage en fallback.", e);
                });
            }
        }
        return;
    }

    // 2. GESTION SOURCE YOUTUBE / WEB EMBED
    if (localVideo) {
        localVideo.pause();
        localVideo.style.display = 'none';
    }

    if (iframe) {
        iframe.style.display = 'block';

        if (APP_STATE.videoBackground.currentVideoId === targetVideoId && iframe.src) {
            wrapper.style.opacity = opacityVal;
            return;
        }

        APP_STATE.videoBackground.currentVideoId = targetVideoId;

        // Lever le rideau opaque pour masquer les boutons pause/play et logo YouTube lors du démarrage
        const curtain = document.getElementById('bg-video-curtain');
        if (curtain) curtain.classList.add('veiled');

        // Paramètres optimisés : YouTube standard (sans nocookie pour compatibilité referrer), autoplay, loop, muet, aucun contrôle, branding masqué
        const embedUrl = `https://www.youtube.com/embed/${targetVideoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${targetVideoId}&playsinline=1&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0`;
        iframe.src = embedUrl;

        // Attendre que le flux vidéo soit lancé pour estomper doucement le rideau noir (zéro flash de bouton pause)
        let unveiled = false;
        const unveilCurtain = () => {
            if (unveiled) return;
            unveiled = true;
            setTimeout(() => {
                wrapper.style.opacity = opacityVal;
                if (curtain) curtain.classList.remove('veiled');
            }, 1200);
        };

        iframe.onload = unveilCurtain;
        setTimeout(unveilCurtain, 2200);
    }
}

// Relance immédiate de la vidéo si le navigateur a suspendu la lecture
window.forceReloadBackgroundVideo = function() {
    const iframe = document.getElementById('bg-video-iframe');
    const localVideo = document.getElementById('bg-local-video');

    if (APP_STATE.videoBackground.source === 'local' && localVideo) {
        localVideo.play().catch(e => console.log(e));
        alert("🔄 Vidéo locale relancée !");
        return;
    }

    if (iframe) {
        const currentSrc = iframe.src;
        if (currentSrc) {
            iframe.src = '';
            setTimeout(() => {
                iframe.src = currentSrc;
            }, 100);
        } else {
            updateBackgroundVideo(APP_STATE.activeMode);
        }
        alert("🔄 Flux vidéo rechargé et relancé !");
    }
};

// Réveil automatique de l'audio et des vidéos au premier clic n'importe où
document.addEventListener('click', () => {
    const iframe = document.getElementById('bg-video-iframe');
    if (iframe && iframe.contentWindow) {
        try {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'mute', args: [] }), '*');
        } catch (e) {}
    }
    const localVideo = document.getElementById('bg-local-video');
    if (localVideo && localVideo.paused && APP_STATE.videoBackground.source === 'local') {
        localVideo.play().catch(() => {});
    }
}, { once: true });

// Détection du protocole file:// et aide pour le serveur local
function checkFileProtocolServer() {
    if (window.location.protocol === 'file:') {
        // Tenter de détecter si le serveur local tourne sur le port 8000
        fetch('http://localhost:8000/index.html', { method: 'HEAD', mode: 'no-cors' })
            .then(() => {
                console.log("Serveur local détecté sur http://localhost:8000, bascule automatique...");
                window.location.href = 'http://localhost:8000/index.html';
            })
            .catch(() => {
                // Pas de serveur local démarré : afficher le bandeau d'aide élégant
                showFileProtocolBanner();
            });
    }
}

function showFileProtocolBanner() {
    if (sessionStorage.getItem('gpn_hide_file_banner')) return;
    if (document.getElementById('file-protocol-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'file-protocol-banner';
    banner.className = 'file-protocol-banner';
    banner.innerHTML = `
        <span class="banner-icon">🎬</span>
        <div class="banner-text">
            <strong>Activation des Vidéos 4K :</strong> Double-cliquez sur <strong>Lancer_Grand_Prix.bat</strong> ou <strong>Lancer_Grand_Prix.vbs</strong> pour démarrer le serveur local et activer toutes les vidéos d'arrière-plan sans restriction de sécurité !
        </div>
        <button class="banner-btn-close" onclick="closeFileProtocolBanner()">J'ai compris</button>
    `;
    document.body.appendChild(banner);
}

window.closeFileProtocolBanner = function() {
    const banner = document.getElementById('file-protocol-banner');
    if (banner) banner.remove();
    sessionStorage.setItem('gpn_hide_file_banner', '1');
};

// -----------------------------------------------------------------------------
// GESTION DU STUDIO VIDÉO MODAL (PERSONNALISATION & TESTS EN DIRECT)
// -----------------------------------------------------------------------------
function initVideoStudio() {
    const openBtn = document.getElementById('btn-open-video-studio');
    const modal = document.getElementById('video-studio-modal');
    const sourceSelect = document.getElementById('studio-source-select');
    const urlInput = document.getElementById('studio-url-input');
    const applyBtn = document.getElementById('btn-apply-custom-video');
    const opacitySlider = document.getElementById('slider-video-opacity');
    const brightnessSlider = document.getElementById('slider-video-brightness');
    const opacityVal = document.getElementById('val-video-opacity');
    const brightnessVal = document.getElementById('val-video-brightness');

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            if (sourceSelect) sourceSelect.value = APP_STATE.videoBackground.source;
            if (opacitySlider) opacitySlider.value = APP_STATE.videoBackground.opacity;
            if (brightnessSlider) brightnessSlider.value = APP_STATE.videoBackground.brightness;
            if (opacityVal) opacityVal.textContent = `${APP_STATE.videoBackground.opacity}%`;
            if (brightnessVal) brightnessVal.textContent = `${APP_STATE.videoBackground.brightness}%`;
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeVideoStudio();
        });
    }

    if (sourceSelect) {
        sourceSelect.addEventListener('change', (e) => {
            APP_STATE.videoBackground.source = e.target.value;
            saveLocalStorage();
            updateBackgroundVideo(APP_STATE.activeMode);
        });
    }

    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            APP_STATE.videoBackground.opacity = val;
            if (opacityVal) opacityVal.textContent = `${val}%`;
            const wrapper = document.getElementById('bg-video-wrapper');
            if (wrapper) wrapper.style.opacity = val / 100;
            saveLocalStorage();
        });
    }

    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            APP_STATE.videoBackground.brightness = val;
            if (brightnessVal) brightnessVal.textContent = `${val}%`;
            const wrapper = document.getElementById('bg-video-wrapper');
            if (wrapper) wrapper.style.filter = `saturate(1.4) contrast(1.15) brightness(${val / 100})`;
            saveLocalStorage();
        });
    }

    if (applyBtn && urlInput) {
        applyBtn.addEventListener('click', () => {
            const raw = (urlInput.value || '').trim();
            if (!raw) return;

            // Détection de lien YouTube ou nom de fichier local
            const ytMatch = raw.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (ytMatch && ytMatch[1]) {
                APP_STATE.videoBackground.source = 'youtube';
                if (sourceSelect) sourceSelect.value = 'youtube';
                APP_STATE.videoBackground.customUrl = ytMatch[1];
            } else if (raw.endsWith('.mp4') || raw.endsWith('.webm')) {
                APP_STATE.videoBackground.source = 'local';
                if (sourceSelect) sourceSelect.value = 'local';
                APP_STATE.videoBackground.customUrl = raw.replace(/^videos\//, '');
            } else {
                APP_STATE.videoBackground.customUrl = raw;
            }

            APP_STATE.videoBackground.enabled = true;
            updateVideoToggleUI();
            saveLocalStorage();
            updateBackgroundVideo(APP_STATE.activeMode);
            alert("🚀 Vidéo personnalisée appliquée avec succès !");
            closeVideoStudio();
        });
    }
}

window.closeVideoStudio = function() {
    const modal = document.getElementById('video-studio-modal');
    if (modal) modal.style.display = 'none';
};

window.applyPresetVideo = function(videoId, type) {
    APP_STATE.videoBackground.source = type || 'youtube';
    APP_STATE.videoBackground.customUrl = videoId;
    APP_STATE.videoBackground.enabled = true;
    updateVideoToggleUI();
    saveLocalStorage();
    updateBackgroundVideo(APP_STATE.activeMode);
    closeVideoStudio();
};

// -----------------------------------------------------------------------------
// MOTEUR DE PARTICULES CANVAS (60 FPS FLUIDE)
// -----------------------------------------------------------------------------
function initCanvasParticles() {
    const canvas = document.getElementById('ambient-canvas');
    if (!canvas) return;

    APP_STATE.canvasParticles.canvas = canvas;
    APP_STATE.canvasParticles.ctx = canvas.getContext('2d');

    function resize() {
        const scale = Math.min(window.devicePixelRatio || 1, 1.25);
        canvas.width = Math.floor(window.innerWidth * scale);
        canvas.height = Math.floor(window.innerHeight * scale);
        seedParticlesForMode(APP_STATE.activeMode);
    }

    window.addEventListener('resize', resize);
    resize();

    // Démarrer la boucle d'animation
    if (APP_STATE.canvasParticles.animId) cancelAnimationFrame(APP_STATE.canvasParticles.animId);
    renderParticlesLoop();
}

function seedParticlesForMode(mode) {
    const canvas = APP_STATE.canvasParticles.canvas;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const particles = [];
    const count = 26; // Allégé pour 60+ FPS constant

    for (let i = 0; i < count; i++) {
        if (mode === 'boss_tomica') {
            // Tokyo Drift : Gouttes de pluie néon & pétales de cerisier sakura
            const isSakura = Math.random() > 0.45;
            particles.push({
                type: isSakura ? 'sakura' : 'neon_rain',
                x: Math.random() * w,
                y: Math.random() * h,
                size: isSakura ? Math.random() * 5 + 4 : Math.random() * 20 + 10,
                speedX: isSakura ? Math.random() * 1.5 - 0.5 : -1.5,
                speedY: isSakura ? Math.random() * 1.8 + 1.2 : Math.random() * 8 + 12,
                angle: Math.random() * 360,
                spin: Math.random() * 0.05 - 0.025,
                color: isSakura 
                    ? (Math.random() > 0.5 ? '#ff77aa' : '#ff4499') 
                    : (Math.random() > 0.5 ? '#00f0ff' : '#ff007f'),
                alpha: Math.random() * 0.6 + 0.3
            });
        } else if (mode === 'f1_apex') {
            // F1 Apex : Lignes de vitesse supersoniques horizontales
            particles.push({
                type: 'speed_line',
                x: Math.random() * w,
                y: Math.random() * h,
                length: Math.random() * 80 + 40,
                speedX: -(Math.random() * 16 + 14),
                color: Math.random() > 0.5 ? '#ef4444' : (Math.random() > 0.3 ? '#00e5ff' : '#ffffff'),
                alpha: Math.random() * 0.5 + 0.2
            });
        } else if (mode === 'survival') {
            // Survie : Braises de lave ardente et cendres apocalyptiques
            const isAsh = Math.random() > 0.4;
            particles.push({
                type: isAsh ? 'toxic_ash' : 'lava_ember',
                x: Math.random() * w,
                y: h + Math.random() * 50,
                size: isAsh ? Math.random() * 5 + 3 : Math.random() * 4 + 2,
                speedX: (Math.random() - 0.5) * 2.2,
                speedY: -(Math.random() * 3.5 + 1.2),
                color: isAsh ? '#52525b' : (Math.random() > 0.5 ? '#ef4444' : '#f59e0b'),
                alpha: Math.random() * 0.75 + 0.25,
                rot: Math.random() * 360,
                spin: (Math.random() - 0.5) * 0.04
            });
        } else if (mode === 'chaos_unlimited') {
            // Chaos Total : Étoiles prismatiques scintillantes
            particles.push({
                type: 'star',
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 3 + 2,
                speedX: (Math.random() - 0.5) * 1.2,
                speedY: (Math.random() - 0.5) * 1.2,
                hue: Math.random() * 360,
                alpha: Math.random() * 0.8 + 0.2
            });
        } else {
            // Grand Prix de Noël (Rainbow Road 4 Voies) :
            // Étoiles scintillantes arc-en-ciel + poussière d'étoiles Mario Kart
            particles.push({
                type: 'rainbow_star',
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 4.5 + 2.5,
                speedX: (Math.random() - 0.5) * 1.6,
                speedY: (Math.random() - 0.5) * 1.6,
                hue: Math.random() * 360,
                rot: Math.random() * 360,
                spin: (Math.random() - 0.5) * 0.05,
                alpha: Math.random() * 0.75 + 0.25
            });
        }
    }

    APP_STATE.canvasParticles.particles = particles;
}

// -----------------------------------------------------------------------------
// GÉNÉRATEUR D'ÉCLAIRS ÉLECTRIQUES BRANCHING (POUR TOKYO DRIFT & BOSS TOMICA)
// -----------------------------------------------------------------------------
function drawLightningArc(ctx, x1, y1, x2, y2, depth, color) {
    if (depth <= 0) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        return;
    }
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 35;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 35;
    drawLightningArc(ctx, x1, y1, midX, midY, depth - 1, color);
    drawLightningArc(ctx, midX, midY, x2, y2, depth - 1, color);

    // Bifurcation électrique secondaire
    if (Math.random() > 0.6) {
        const branchX = midX + (Math.random() - 0.5) * 45;
        const branchY = midY + Math.random() * 40;
        drawLightningArc(ctx, midX, midY, branchX, branchY, depth - 2, color);
    }
}

// Simulation du régime moteur F1 (Télémétrie RPM LED)
let _cachedRpmLeds = null;
function updateF1RpmSimulation() {
    if (!_cachedRpmLeds || _cachedRpmLeds.length === 0) {
        _cachedRpmLeds = document.querySelectorAll('.rpm-led');
    }
    if (!_cachedRpmLeds || _cachedRpmLeds.length === 0) return;
    const wave = (Math.sin(Date.now() / 250) + 1) * 8.5 + 2;
    const activeThreshold = Math.floor(wave);
    _cachedRpmLeds.forEach((led, idx) => {
        if (idx <= activeThreshold) {
            led.classList.add('active');
        } else {
            led.classList.remove('active');
        }
    });
}

function renderParticlesLoop() {
    const { canvas, ctx, particles } = APP_STATE.canvasParticles;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;

    // 1. Rendu des particules standard
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;

        if (p.type === 'sakura') {
            p.x += p.speedX;
            p.y += p.speedY;
            p.angle += p.spin;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            if (p.y > h + 20) { p.y = -10; p.x = Math.random() * w; }
            if (p.x < -20) p.x = w + 10;
        } else if (p.type === 'neon_rain') {
            p.x += p.speedX;
            p.y += p.speedY;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.speedX * 2, p.y + p.size);
            ctx.stroke();

            if (p.y > h + 30) { p.y = -20; p.x = Math.random() * w; }
        } else if (p.type === 'speed_line') {
            p.x += p.speedX;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.length, p.y);
            ctx.stroke();

            if (p.x < -p.length) { p.x = w + Math.random() * 100; p.y = Math.random() * h; }
        } else if (p.type === 'lava_ember') {
            p.x += p.speedX;
            p.y += p.speedY;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            if (p.y < -20) { p.y = h + 10; p.x = Math.random() * w; }
        } else if (p.type === 'toxic_ash') {
            p.x += p.speedX;
            p.y += p.speedY;
            p.rot += p.spin;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);

            if (p.y < -20) { p.y = h + 10; p.x = Math.random() * w; }
        } else if (p.type === 'rainbow_star') {
            p.hue = (p.hue + 1.5) % 360;
            p.x += p.speedX;
            p.y += p.speedY;
            p.rot += p.spin;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = `hsl(${p.hue}, 95%, 65%)`;

            // Dessin d'une étoile à 4 branches Mario Kart
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                ctx.lineTo(Math.cos((i * 90) * Math.PI / 180) * p.size, Math.sin((i * 90) * Math.PI / 180) * p.size);
                ctx.lineTo(Math.cos((i * 90 + 45) * Math.PI / 180) * (p.size * 0.4), Math.sin((i * 90 + 45) * Math.PI / 180) * (p.size * 0.4));
            }
            ctx.closePath();
            ctx.fill();

            if (p.x < -20) p.x = w + 20;
            if (p.x > w + 20) p.x = -20;
            if (p.y < -20) p.y = h + 20;
            if (p.y > h + 20) p.y = -20;
        } else if (p.type === 'star') {
            p.hue = (p.hue + 1) % 360;
            ctx.fillStyle = `hsl(${p.hue}, 90%, 65%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    });

    // 2. Éclairs Électriques Aléatoires en mode Boss Tomica (Tokyo Drift)
    if (APP_STATE.activeMode === 'boss_tomica' && Math.random() > 0.93) {
        ctx.save();
        const color = Math.random() > 0.35 ? '#00f0ff' : '#ff007f';
        const startX = Math.random() * w;
        const startY = 0;
        const endX = startX + (Math.random() - 0.5) * 350;
        const endY = Math.random() * (h * 0.65) + (h * 0.25);
        drawLightningArc(ctx, startX, startY, endX, endY, 4, color);
        ctx.restore();
    }

    // 3. Animation du compte-tours F1 RPM si mode Apex
    if (APP_STATE.activeMode === 'f1_apex') {
        updateF1RpmSimulation();
    }

    APP_STATE.canvasParticles.animId = requestAnimationFrame(renderParticlesLoop);
}

// =============================================================================
// MOTEUR D'ANIMATION ET D'EFFETS AU PREMIER PLAN (DEVANT LE CONTENU)
// =============================================================================
function initFgToggle() {
    const btn = document.getElementById('btn-toggle-fg-fx');
    if (!btn) return;

    btn.addEventListener('click', () => {
        APP_STATE.foregroundFx.enabled = !APP_STATE.foregroundFx.enabled;
        const layer = document.getElementById('fg-dynamic-layer');
        const text = btn.querySelector('.fg-text');

        if (APP_STATE.foregroundFx.enabled) {
            btn.classList.add('active');
            if (layer) layer.classList.remove('disabled');
            if (text) text.textContent = '1ER PLAN : ON';
        } else {
            btn.classList.remove('active');
            if (layer) layer.classList.add('disabled');
            if (text) text.textContent = '1ER PLAN : OFF';
        }
    });
}

function initForegroundFx() {
    const canvas = document.getElementById('fg-ambient-canvas');
    if (!canvas) return;

    APP_STATE.foregroundFx.canvas = canvas;
    APP_STATE.foregroundFx.ctx = canvas.getContext('2d');

    function resizeFg() {
        const scale = Math.min(window.devicePixelRatio || 1, 1.25);
        canvas.width = Math.floor(window.innerWidth * scale);
        canvas.height = Math.floor(window.innerHeight * scale);
        seedForegroundParticles(APP_STATE.activeMode);
    }

    window.addEventListener('resize', resizeFg);
    resizeFg();

    if (APP_STATE.foregroundFx.animId) cancelAnimationFrame(APP_STATE.foregroundFx.animId);
    renderForegroundLoop();
}

function seedForegroundParticles(mode) {
    const canvas = APP_STATE.foregroundFx.canvas;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const particles = [];

    // Effets au 1er Plan pour Grand Prix Noël (Rainbow Road 4 Voies)
    if (mode === 'gp_pure' || mode === 'gp_strategy') {
        // 1. Pièces Dorées 3D Mario Kart en rotation au 1er plan
        for (let i = 0; i < 4; i++) {
            particles.push({
                type: 'fg_coin',
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 6 + 14,
                speedX: (Math.random() - 0.5) * 0.8,
                speedY: -(Math.random() * 1.4 + 0.8),
                angle: Math.random() * Math.PI,
                spinSpeed: Math.random() * 0.05 + 0.03,
                alpha: Math.random() * 0.35 + 0.65
            });
        }
        // 2. Super Étoiles scintillantes Mario Kart au 1er plan
        for (let i = 0; i < 5; i++) {
            particles.push({
                type: 'fg_star',
                x: Math.random() * w,
                y: Math.random() * h,
                size: Math.random() * 5 + 8,
                speedX: (Math.random() - 0.5) * 1.5,
                speedY: -(Math.random() * 1.2 + 0.5),
                hue: Math.random() * 360,
                rot: Math.random() * 360,
                spin: (Math.random() - 0.5) * 0.06,
                alpha: Math.random() * 0.3 + 0.7
            });
        }
        // 3. Flèches de Boost Pad qui traversent l'écran
        for (let i = 0; i < 2; i++) {
            particles.push({
                type: 'fg_boost_arrow',
                x: -Math.random() * 300,
                y: Math.random() * (h * 0.75) + 100,
                speedX: Math.random() * 16 + 14,
                length: Math.random() * 50 + 60,
                color: '#facc15',
                alpha: 0.65
            });
        }
    }
    // Effets au 1er Plan pour Tokyo Drift / Boss Tomica
    else if (mode === 'boss_tomica') {
        // Étincelles néon cyan & magenta au 1er plan
        for (let i = 0; i < 12; i++) {
            particles.push({
                type: 'fg_spark',
                x: Math.random() * w,
                y: Math.random() * h,
                speedX: (Math.random() - 0.5) * 3.5,
                speedY: (Math.random() - 0.5) * 3.5,
                size: Math.random() * 2.5 + 1.5,
                color: Math.random() > 0.5 ? '#00f0ff' : '#ff007f',
                alpha: Math.random() * 0.4 + 0.6
            });
        }
    }
    // Effets au 1er Plan pour Survie Ultime (Mad Max / Punk)
    else if (mode === 'survival') {
        // Braises incandescentes et flammes projetées en premier plan
        for (let i = 0; i < 14; i++) {
            particles.push({
                type: 'fg_ember',
                x: Math.random() * w,
                y: h + Math.random() * 50,
                speedX: (Math.random() - 0.5) * 3.2,
                speedY: -(Math.random() * 4.5 + 2.5),
                size: Math.random() * 3 + 2,
                color: Math.random() > 0.5 ? '#ff3b30' : (Math.random() > 0.25 ? '#ff9500' : '#ffcc00'),
                alpha: Math.random() * 0.4 + 0.6
            });
        }
    }
    // Effets au 1er Plan pour F1 Apex
    else if (mode === 'f1_apex') {
        // Traînées aérodynamiques supersoniques horizontales
        for (let i = 0; i < 6; i++) {
            particles.push({
                type: 'fg_speed_streak',
                x: w + Math.random() * 200,
                y: Math.random() * h,
                speedX: -(Math.random() * 32 + 22),
                length: Math.random() * 160 + 90,
                color: Math.random() > 0.5 ? '#00e5ff' : '#ef4444',
                alpha: Math.random() * 0.35 + 0.55
            });
        }
    }

    APP_STATE.foregroundFx.particles = particles;
    updateForegroundStickers(mode);
}

function updateForegroundStickers(mode) {
    const container = document.getElementById('fg-stickers-container');
    if (!container) return;
    container.innerHTML = '';

    // Ajout d'autocollants graphiques flottants transparents selon le mode
    if (mode === 'gp_pure' || mode === 'gp_strategy') {
        // 1. Étoile Mario Kart flottante
        const star = document.createElement('div');
        star.className = 'fg-sticker fg-star-sprite';
        star.textContent = '⭐';
        container.appendChild(star);

        // 2. Pièce d'or Mario Kart flottante
        const coin = document.createElement('div');
        coin.className = 'fg-sticker fg-coin-sprite';
        coin.textContent = '🪙';
        container.appendChild(coin);
    } else if (mode === 'boss_tomica') {
        // Kanjis Cyberpunk flottants dans les angles
        const kanji1 = document.createElement('div');
        kanji1.className = 'fg-sticker fg-kanji-sticker';
        kanji1.style.top = '120px';
        kanji1.style.right = '30px';
        kanji1.textContent = '超速ドリフト';
        container.appendChild(kanji1);

        const kanji2 = document.createElement('div');
        kanji2.className = 'fg-sticker fg-kanji-sticker';
        kanji2.style.bottom = '40px';
        kanji2.style.left = '30px';
        kanji2.style.borderColor = '#ff007f';
        kanji2.style.color = '#ff007f';
        kanji2.textContent = '暴走夜間';
        container.appendChild(kanji2);
    } else if (mode === 'f1_apex') {
        // Speed lines anime en bordure d'écran
        const speedlines = document.createElement('div');
        speedlines.className = 'fg-anime-speedlines';
        container.appendChild(speedlines);
    }
}

function renderForegroundLoop() {
    const { canvas, ctx, particles } = APP_STATE.foregroundFx;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;

    if (APP_STATE.foregroundFx.enabled) {
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;

            // 1. Pièce Dorée Mario Kart 3D au 1er Plan
            if (p.type === 'fg_coin') {
                p.x += p.speedX;
                p.y += p.speedY;
                p.angle += p.spinSpeed;

                ctx.translate(p.x, p.y);
                ctx.scale(Math.cos(p.angle), 1); // Rotation 3D perspective

                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();

                // Relief intérieur de pièce
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = '#fef08a';
                ctx.stroke();

                if (p.y < -30) { p.y = h + 20; p.x = Math.random() * w; }
                if (p.x < -30) p.x = w + 20;
                if (p.x > w + 30) p.x = -20;
            }
            // 2. Étoile Mario Kart au 1er Plan
            else if (p.type === 'fg_star') {
                p.x += p.speedX;
                p.y += p.speedY;
                p.rot += p.spin;
                p.hue = (p.hue + 2) % 360;

                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = `hsl(${p.hue}, 95%, 65%)`;

                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    ctx.lineTo(Math.cos((i * 90) * Math.PI / 180) * p.size, Math.sin((i * 90) * Math.PI / 180) * p.size);
                    ctx.lineTo(Math.cos((i * 90 + 45) * Math.PI / 180) * (p.size * 0.4), Math.sin((i * 90 + 45) * Math.PI / 180) * (p.size * 0.4));
                }
                ctx.closePath();
                ctx.fill();

                if (p.y < -30) { p.y = h + 20; p.x = Math.random() * w; }
                if (p.x < -30) p.x = w + 20;
                if (p.x > w + 30) p.x = -20;
            }
            // 3. Flèches de Boost Pad
            else if (p.type === 'fg_boost_arrow') {
                p.x += p.speedX;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.length, p.y);
                ctx.lineTo(p.x + p.length - 12, p.y - 10);
                ctx.moveTo(p.x + p.length, p.y);
                ctx.lineTo(p.x + p.length - 12, p.y + 10);
                ctx.stroke();

                if (p.x > w + 100) { p.x = -150; p.y = Math.random() * (h * 0.75) + 100; }
            }
            // 4. Étincelles de Tokyo Drift
            else if (p.type === 'fg_spark') {
                p.x += p.speedX;
                p.y += p.speedY;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                if (p.x < -10 || p.x > w + 10 || p.y < -10 || p.y > h + 10) {
                    p.x = Math.random() * w;
                    p.y = Math.random() * h;
                }
            }
            // 5. Braises de Survie
            else if (p.type === 'fg_ember') {
                p.x += p.speedX;
                p.y += p.speedY;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();

                if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
            }
            // 6. Lignes Supersoniques F1
            else if (p.type === 'fg_speed_streak') {
                p.x += p.speedX;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.length, p.y);
                ctx.stroke();

                if (p.x < -p.length) { p.x = w + Math.random() * 200; p.y = Math.random() * h; }
            }

            ctx.restore();
        });

        // Éclairs au 1er Plan en mode Tokyo Drift (passant PAR-DESSUS les cartes !)
        if (APP_STATE.activeMode === 'boss_tomica' && Math.random() > 0.94) {
            ctx.save();
            const color = Math.random() > 0.4 ? '#00f0ff' : '#ff007f';
            const startX = Math.random() * w;
            const startY = 0;
            const endX = startX + (Math.random() - 0.5) * 400;
            const endY = Math.random() * (h * 0.7) + (h * 0.2);
            drawLightningArc(ctx, startX, startY, endX, endY, 4, color);
            ctx.restore();
        }

        // Télémétrie F1 en filigrane au 1er plan en bas à droite
        if (APP_STATE.activeMode === 'f1_apex') {
            ctx.save();
            ctx.font = '700 13px "Chakra Petch", monospace';
            ctx.fillStyle = 'rgba(0, 229, 255, 0.75)';
            ctx.textAlign = 'right';
            ctx.fillText('SPEED: 342 KM/H • GEAR: 8 • DRS: ACTIVE • ERS: 96%', w - 24, h - 18);
            ctx.restore();
        }
    }

    APP_STATE.foregroundFx.animId = requestAnimationFrame(renderForegroundLoop);
}

// =============================================================================
// 14. COMPOSITEUR AUDIO PROCÉDURAL : BANDE-SON DYNAMIQUE DE CHAQUE MODE
// =============================================================================
function initAmbientMusic() {
    const toggleBtn = document.getElementById('btn-ambient-music');
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        toggleJukebox();
    });
}

function startAmbientMusic() {
    const ctx = getAudioContext();
    const toggleBtn = document.getElementById('btn-ambient-music');

    APP_STATE.ambientMusic.isPlaying = true;
    APP_STATE.ambientMusic.step = 0;

    if (!APP_STATE.ambientMusic.masterGain) {
        APP_STATE.ambientMusic.masterGain = ctx.createGain();
        APP_STATE.ambientMusic.masterGain.gain.setValueAtTime(0.12, ctx.currentTime);
        APP_STATE.ambientMusic.masterGain.connect(ctx.destination);
    } else {
        APP_STATE.ambientMusic.masterGain.gain.cancelScheduledValues(ctx.currentTime);
        APP_STATE.ambientMusic.masterGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.3);
    }

    if (toggleBtn) {
        toggleBtn.classList.add('active');
        const icon = toggleBtn.querySelector('.music-icon');
        const text = toggleBtn.querySelector('.music-text');
        if (icon) icon.textContent = '🎵';
        if (text) text.textContent = getModeMusicLabel(APP_STATE.activeMode);
    }

    scheduleAmbientMusicLoop();
}

function stopAmbientMusic() {
    const ctx = getAudioContext();
    const toggleBtn = document.getElementById('btn-ambient-music');

    if (APP_STATE.ambientMusic.timer) {
        clearInterval(APP_STATE.ambientMusic.timer);
        APP_STATE.ambientMusic.timer = null;
    }

    if (APP_STATE.ambientMusic.masterGain) {
        APP_STATE.ambientMusic.masterGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    }

    APP_STATE.ambientMusic.isPlaying = false;

    if (toggleBtn) {
        toggleBtn.classList.remove('active');
        const icon = toggleBtn.querySelector('.music-icon');
        const text = toggleBtn.querySelector('.music-text');
        if (icon) icon.textContent = '🔇';
        if (text) text.textContent = 'MUSIQUE : OFF';
    }
}

function updateAmbientMusicTrack() {
    const toggleBtn = document.getElementById('btn-ambient-music');
    if (toggleBtn && APP_STATE.ambientMusic.isPlaying) {
        const text = toggleBtn.querySelector('.music-text');
        if (text) text.textContent = getModeMusicLabel(APP_STATE.activeMode);
    }
    // Redémarrage fluide du tempo correspondant au mode
    if (APP_STATE.ambientMusic.timer) {
        clearInterval(APP_STATE.ambientMusic.timer);
    }
    APP_STATE.ambientMusic.step = 0;
    scheduleAmbientMusicLoop();
}

function getModeMusicLabel(mode) {
    switch (mode) {
        case 'boss_tomica': return 'MUSIQUE : TOKYO DRIFT & MIKU ⚡';
        case 'gp_pure':
        case 'gp_strategy': return 'MUSIQUE : NOËL & CHEMINÉE 🔥';
        case 'f1_apex': return 'MUSIQUE : F1 APEX TECHNO 🏎️';
        case 'survival': return 'MUSIQUE : SURVIE TENSION ⚠️';
        case 'chaos_unlimited': return 'MUSIQUE : CHAOS ARCADE 🌈';
        default: return 'MUSIQUE : ON 🎵';
    }
}

function scheduleAmbientMusicLoop() {
    const mode = APP_STATE.activeMode;
    let intervalMs = 125; // 120-130 BPM par défaut

    if (mode === 'gp_pure' || mode === 'gp_strategy') {
        intervalMs = 300; // Calme, berceuse cheminée
    } else if (mode === 'boss_tomica') {
        intervalMs = 115; // 130 BPM Tokyo Drift trap
    } else if (mode === 'f1_apex') {
        intervalMs = 110; // 136 BPM Techno
    } else if (mode === 'survival') {
        intervalMs = 200; // 75 BPM Pulsation lente
    } else if (mode === 'chaos_unlimited') {
        intervalMs = 100; // 150 BPM Chiptune
    }

    APP_STATE.ambientMusic.timer = setInterval(() => {
        if (!APP_STATE.ambientMusic.isPlaying) return;
        playProceduralMusicStep(APP_STATE.activeMode, APP_STATE.ambientMusic.step);
        APP_STATE.ambientMusic.step++;
    }, intervalMs);
}

// Générateur de notes et rythmes selon le mode
function playProceduralMusicStep(mode, step) {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const master = APP_STATE.ambientMusic.masterGain;
    if (!master) return;

    // -------------------------------------------------------------------------
    // BANDE-SON 1 : BOSS TOMICA (TOKYO DRIFT & HATSUNE MIKU CYBERPUNK)
    // -------------------------------------------------------------------------
    if (mode === 'boss_tomica') {
        const beat16 = step % 16;

        // 808 Sub Kick / Bass Glide
        if (beat16 === 0 || beat16 === 6 || beat16 === 10) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.18);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.connect(gain);
            gain.connect(master);
            osc.start(now);
            osc.stop(now + 0.25);
        }

        // Trap Hi-Hats (Tics métalliques 16e de mesure)
        if (beat16 % 2 === 1 || beat16 === 14) {
            const bufferSize = ctx.sampleRate * 0.04;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(8000, now);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(beat16 % 4 === 2 ? 0.12 : 0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(master);
            noise.start(now);
        }

        // Snare Trap (Temps 4 et 12)
        if (beat16 === 4 || beat16 === 12) {
            const bufferSize = ctx.sampleRate * 0.1;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1400, now);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(master);
            noise.start(now);
        }

        // Mélodie Lead Miku / Tokyo Drift Hook (Penta D, F, G, G#, A, C)
        const tokyoMelody = [
            587, 0, 587, 0, 698, 0, 784, 0, 830, 0, 784, 0, 698, 0, 587, 0, // Bar 1
            523, 0, 523, 0, 587, 0, 698, 0, 587, 0, 440, 0, 523, 0, 587, 0  // Bar 2
        ];
        const noteFreq = tokyoMelody[step % 32];
        if (noteFreq > 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(noteFreq, now);

            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

            osc.connect(gain);
            gain.connect(master);
            osc.start(now);
            osc.stop(now + 0.16);
        }
    }

    // -------------------------------------------------------------------------
    // BANDE-SON 2 : GRAND PRIX DE NOËL (CRÉPITEMENT DE CHEMINÉE & CLOCHETTES)
    // -------------------------------------------------------------------------
    else if (mode === 'gp_pure' || mode === 'gp_strategy') {
        // Crépitement aléatoire de feu de bois (bruit filtré)
        if (Math.random() > 0.4) {
            const bufferSize = ctx.sampleRate * 0.05;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.random();
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800 + Math.random() * 600, now);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            noise.connect(filter);
            filter.connect(gain);
            gain.connect(master);
            noise.start(now);
        }

        // Douces clochettes de Noël / Célesta (Gammes douces F-C-Dm-Bb)
        const chimeNotes = [
            349, 440, 523, 698, 659, 587, 523, 440, 
            466, 587, 698, 587, 523, 440, 392, 349
        ];
        const chime = chimeNotes[step % chimeNotes.length];

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(chime, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 0.45);
    }

    // -------------------------------------------------------------------------
    // BANDE-SON 3 : APEX CHALLENGE F1 (TECHNO ROLLING BASS & RÉGIME MOTEUR)
    // -------------------------------------------------------------------------
    else if (mode === 'f1_apex') {
        const beat = step % 16;
        // Kick 4-on-the-floor
        if (beat % 4 === 0) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
            gain.gain.setValueAtTime(0.45, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.connect(gain);
            gain.connect(master);
            osc.start(now);
            osc.stop(now + 0.15);
        }

        // Basse roulante techno 16e de mesure
        const bassFreq = [110, 110, 130, 146, 110, 110, 164, 146][step % 8];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(bassFreq, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 0.09);
    }

    // -------------------------------------------------------------------------
    // BANDE-SON 4 : SURVIE ULTIME (BATTEMENT DE CŒUR & DRONE D'ALERTE)
    // -------------------------------------------------------------------------
    else if (mode === 'survival') {
        const beat = step % 8;
        // Battement de cœur double
        if (beat === 0 || beat === 2) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(65, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
            gain.gain.setValueAtTime(beat === 0 ? 0.45 : 0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            osc.connect(gain);
            gain.connect(master);
            osc.start(now);
            osc.stop(now + 0.18);
        }
    }

    // -------------------------------------------------------------------------
    // BANDE-SON 5 : CHAOS TOTAL (CHIPTUNE SPEED RUN ARCADE)
    // -------------------------------------------------------------------------
    else {
        const scale = [523, 659, 784, 987, 1046, 987, 784, 659];
        const freq = scale[step % scale.length];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(master);
        osc.start(now);
        osc.stop(now + 0.08);
    }
}

// =============================================================================
// 15. JUKEBOX MUSICAL — VRAIES MUSIQUES OFFICIELLES (STREAMING HD PAR MODE)
// =============================================================================
const JUKEBOX_PLAYLISTS = {
    'gp_pure': {
        name: 'RAINBOW ROAD 4 VOIES (MARIO KART)',
        tracks: [
            { title: "Mario Kart 8 Deluxe — Rainbow Road (Official 60FPS)", id: "uX7qRu56JfQ" },
            { title: "Mario Kart 8 Deluxe — All Rainbow Roads Booster Pass", id: "N98naby_xUA" },
            { title: "Mario Kart 8 Deluxe — Mute City Big Band OST", id: "3sL0omwElxw" },
            { title: "Super Mario Odyssey — Jump Up, Super Star!", id: "e9r5hx47kxM" }
        ]
    },
    'gp_strategy': {
        name: 'STRATÉGIE & BONUS MARIO KART',
        tracks: [
            { title: "Mario Kart 8 Deluxe — Rainbow Road (Official 60FPS)", id: "uX7qRu56JfQ" },
            { title: "Mario Kart 8 Deluxe — Mute City Big Band OST", id: "3sL0omwElxw" },
            { title: "Mario Kart 8 Deluxe — All Rainbow Roads Booster Pass", id: "N98naby_xUA" },
            { title: "Super Mario Odyssey — Jump Up, Super Star!", id: "e9r5hx47kxM" }
        ]
    },
    'boss_tomica': {
        name: 'TOKYO DRIFT & HATSUNE MIKU CYBERPUNK',
        tracks: [
            { title: "Teriyaki Boyz — Tokyo Drift (Official Audio)", id: "iuJDhFRDx9M" },
            { title: "Hatsune Miku — Senbonzakura (千本桜)", id: "shs0rAiwsGQ" },
            { title: "DVRST — Close Eyes (Cyber Phonk Drift)", id: "ytQ5CYE1VZw" },
            { title: "Tokyo Drift Phonk Night Drive Mix", id: "v2AC41dglnM" }
        ]
    },
    'survival': {
        name: 'MAD MAX: FURY ROAD & WASTELAND METAL',
        tracks: [
            { title: "Mick Gordon — BFG Division (Heavy Overdrive)", id: "QHRuTYtSbJQ" },
            { title: "DOOM 2016 — At Doom's Gate (Official OST)", id: "q657rEkgfKs" },
            { title: "Carpenter Brut — Roller Mobster", id: "qFfybn_W8Ak" },
            { title: "Mad Max Fury Road — Desert War Rig Chase", id: "mLd0-eFNrZE" }
        ]
    },
    'f1_apex': {
        name: 'FORMULA 1 & INITIAL D EUROBEAT',
        tracks: [
            { title: "Initial D — Running in the 90s (Max Speed)", id: "BJ0xBCwkg3E" },
            { title: "Initial D — Deja Vu (Eurobeat Classic)", id: "dv13gl0a-FA" },
            { title: "Initial D — Super Eurobeat Live Megamix", id: "D23VtDxBWPw" },
            { title: "Formula 1 — Monaco V10/V12 Onboard Roar 60FPS", id: "3NDZVN4HQfQ" }
        ]
    },
    'boss_majorette': {
        name: 'DÉFI COCORICO — FRENCH TOUCH & LE MANS',
        tracks: [
            { title: "Kavinsky — Nightcall (Drive OST)", id: "MV_3Dpw-BRY" },
            { title: "Daft Punk — Robot Rock", id: "sFZjqVnWBhc" },
            { title: "Justice — Genesis", id: "VKzWLUQizz8" },
            { title: "Daft Punk — Harder, Better, Faster, Stronger", id: "gAjR4_CbPpQ" }
        ]
    },
    'chaos_unlimited': {
        name: 'CHAOS ARCADE & NITRO SPEED',
        tracks: [
            { title: "Redline (2009) OST — Yellow Line (Nitro Race)", id: "doEwWzMz99A" },
            { title: "Darude — Sandstorm (Official)", id: "y6120QOlsfU" },
            { title: "Crazy Frog — Axel F (Retro Arcade Remix)", id: "W3q8Od5qJio" },
            { title: "Benny Hill Theme / Yakety Sax (Total Chaos)", id: "MK6TXMsvgQg" },
            { title: "Initial D — Running in the 90s", id: "BJ0xBCwkg3E" }
        ]
    },
    'relic_cup': {
        name: 'RETRO 90S NOSTALGIA & SYNTHWAVE',
        tracks: [
            { title: "Home — Resonance (Synthwave Classic)", id: "8GW6sLrK40k" },
            { title: "Kavinsky — Pacific Coast Highway", id: "-5FKNViujeM" },
            { title: "Miami Nights 1984 — Accelerated (OutRun 80s)", id: "rDBbaGCCIhk" },
            { title: "Perturbator — She is Young, She is Beautiful", id: "IGqeyQhBPMI" },
            { title: "Lazerhawk — Redline (Retrowave 80s)", id: "Ntp85nlChj0" }
        ]
    }
};

function initJukebox() {
    const playBtn = document.getElementById('jb-btn-play');
    const prevBtn = document.getElementById('jb-btn-prev');
    const nextBtn = document.getElementById('jb-btn-next');
    const select = document.getElementById('jb-track-select');
    const volSlider = document.getElementById('jb-volume-slider');
    const volVal = document.getElementById('jb-volume-val');

    if (playBtn) {
        playBtn.addEventListener('click', () => toggleJukebox());
    }
    if (prevBtn) {
        prevBtn.addEventListener('click', () => prevJukeboxTrack());
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => nextJukeboxTrack());
    }
    if (select) {
        select.addEventListener('change', (e) => {
            const idx = parseInt(e.target.value, 10);
            playJukeboxTrack(idx);
        });
    }
    if (volSlider) {
        volSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            APP_STATE.jukebox.volume = val;
            if (volVal) volVal.textContent = `${val}%`;
            const iframe = document.getElementById('jukebox-audio-iframe');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(JSON.stringify({
                    event: 'command',
                    func: 'setVolume',
                    args: [val]
                }), '*');
            }
        });
    }

    // Écouter les retours YouTube : passage automatique au morceau suivant en fin de piste ou en cas d'erreur
    window.addEventListener('message', (event) => {
        try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (data && data.event === 'onError') {
                console.warn("Morceau bloqué ou indisponible, passage au suivant...", data);
                nextJukeboxTrack();
            } else if (data && data.event === 'onStateChange' && data.info === 0) {
                nextJukeboxTrack();
            }
        } catch (e) {}
    });

    // Charger la playlist correspondant au mode initial
    switchJukeboxMode(APP_STATE.activeMode, false);
}

function switchJukeboxMode(mode, autoPlay = null) {
    const playlist = JUKEBOX_PLAYLISTS[mode] || JUKEBOX_PLAYLISTS['gp_pure'];
    APP_STATE.jukebox.currentMode = mode;
    APP_STATE.jukebox.trackIndex = 0;

    const tagEl = document.getElementById('jb-playlist-tag');
    if (tagEl) tagEl.textContent = `PLAYLIST : ${playlist.name}`;

    const select = document.getElementById('jb-track-select');
    if (select) {
        select.innerHTML = '';
        playlist.tracks.forEach((tr, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `${i + 1}. ${tr.title}`;
            select.appendChild(opt);
        });
        select.value = 0;
    }

    const shouldPlay = autoPlay !== null ? autoPlay : APP_STATE.jukebox.isPlaying;
    if (shouldPlay) {
        playJukeboxTrack(0);
    } else {
        updateJukeboxUI();
    }
}

function playJukeboxTrack(index) {
    const mode = APP_STATE.jukebox.currentMode;
    const playlist = JUKEBOX_PLAYLISTS[mode] || JUKEBOX_PLAYLISTS['gp_pure'];
    if (!playlist.tracks || playlist.tracks.length === 0) return;

    APP_STATE.jukebox.trackIndex = (index + playlist.tracks.length) % playlist.tracks.length;
    APP_STATE.jukebox.isPlaying = true;

    const track = playlist.tracks[APP_STATE.jukebox.trackIndex];
    const iframe = document.getElementById('jukebox-audio-iframe');
    if (iframe) {
        const embedUrl = `https://www.youtube.com/embed/${track.id}?autoplay=1&controls=0&loop=1&playlist=${track.id}&enablejsapi=1&playsinline=1&rel=0`;
        iframe.src = embedUrl;

        iframe.onload = () => {
            try {
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: [] }), '*');
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [APP_STATE.jukebox.volume || 75] }), '*');
            } catch (e) {}
        };
    }

    const select = document.getElementById('jb-track-select');
    if (select) select.value = APP_STATE.jukebox.trackIndex;

    updateJukeboxUI();
}



function toggleJukebox() {
    if (APP_STATE.jukebox.isPlaying) {
        pauseJukebox();
    } else {
        playJukeboxTrack(APP_STATE.jukebox.trackIndex || 0);
    }
}

function pauseJukebox() {
    APP_STATE.jukebox.isPlaying = false;
    const iframe = document.getElementById('jukebox-audio-iframe');
    if (iframe) {
        iframe.src = '';
    }
    updateJukeboxUI();
}

function nextJukeboxTrack() {
    playJukeboxTrack(APP_STATE.jukebox.trackIndex + 1);
}

function prevJukeboxTrack() {
    playJukeboxTrack(APP_STATE.jukebox.trackIndex - 1);
}

function updateJukeboxUI() {
    const bar = document.getElementById('jukebox-bar');
    const playBtn = document.getElementById('jb-btn-play');
    const titleEl = document.getElementById('jb-track-title');
    const headerBtn = document.getElementById('btn-ambient-music');

    const mode = APP_STATE.jukebox.currentMode;
    const playlist = JUKEBOX_PLAYLISTS[mode] || JUKEBOX_PLAYLISTS['gp_pure'];
    const track = playlist.tracks[APP_STATE.jukebox.trackIndex] || playlist.tracks[0];

    if (titleEl && track) {
        titleEl.textContent = track.title;
    }

    if (APP_STATE.jukebox.isPlaying) {
        if (bar) bar.classList.add('is-playing');
        if (playBtn) playBtn.textContent = '⏸️';
        if (headerBtn) {
            headerBtn.classList.add('active');
            const icon = headerBtn.querySelector('.music-icon');
            const text = headerBtn.querySelector('.music-text');
            if (icon) icon.textContent = '🎵';
            if (text) text.textContent = `JUKEBOX : ${track ? track.title.substring(0, 22) + '...' : 'ON'}`;
        }
    } else {
        if (bar) bar.classList.remove('is-playing');
        if (playBtn) playBtn.textContent = '▶️';
        if (headerBtn) {
            headerBtn.classList.remove('active');
            const icon = headerBtn.querySelector('.music-icon');
            const text = headerBtn.querySelector('.music-text');
            if (icon) icon.textContent = '🔇';
            if (text) text.textContent = 'MUSIQUE : OFF';
        }
    }
}

// =============================================================================
// 17. MENU COMMISSAIRE DE COURSE & ADMINISTRATION (CODE 1806)
// =============================================================================
const ADMIN_SECURITY_CODE = '1806';
let isAdminUnlocked = false;

function initAdminPanel() {
    const btnOpen = document.getElementById('btn-open-admin');
    const btnFloating = document.getElementById('btn-floating-admin');
    const modal = document.getElementById('admin-modal');
    const pinInput = document.getElementById('admin-pin-input');
    const btnSubmit = document.getElementById('btn-submit-admin-pin');
    const lockScreen = document.getElementById('admin-lock-screen');
    const dashScreen = document.getElementById('admin-dashboard-screen');
    const pinError = document.getElementById('admin-pin-error');
    const btnLock = document.getElementById('btn-lock-admin');

    if (!modal) return;

    const openHandler = () => {
        modal.style.display = 'flex';
        if (isAdminUnlocked) {
            showAdminDashboard();
        } else {
            showAdminLock();
        }
    };

    if (btnOpen) btnOpen.addEventListener('click', openHandler);
    if (btnFloating) btnFloating.addEventListener('click', openHandler);

    // Validation du Code PIN
    function verifyPin() {
        if (!pinInput) return;
        const entered = pinInput.value.trim();
        if (entered === ADMIN_SECURITY_CODE) {
            isAdminUnlocked = true;
            if (pinError) pinError.style.display = 'none';
            pinInput.value = '';
            showAdminDashboard();
            playTaunt('coin');
        } else {
            if (pinError) {
                pinError.style.display = 'block';
                pinError.classList.add('shake');
                setTimeout(() => pinError.classList.remove('shake'), 400);
            }
            pinInput.value = '';
            pinInput.focus();
            playTaunt('crash');
        }
    }

    if (btnSubmit) {
        btnSubmit.addEventListener('click', verifyPin);
    }

    if (pinInput) {
        pinInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                verifyPin();
            }
        });
    }

    // Pavé numérique à l'écran
    const keypadButtons = modal.querySelectorAll('.keypad-btn');
    keypadButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-key');
            if (key === 'clear') {
                pinInput.value = '';
            } else if (key === 'ok') {
                verifyPin();
            } else {
                if (pinInput.value.length < 4) {
                    pinInput.value += key;
                }
            }
        });
    });

    // Bouton de verrouillage
    if (btnLock) {
        btnLock.addEventListener('click', () => {
            isAdminUnlocked = false;
            showAdminLock();
        });
    }

    // 1. Actions Course
    const btnRestart = document.getElementById('btn-admin-restart-race');
    if (btnRestart) {
        btnRestart.addEventListener('click', () => {
            if (APP_STATE.currentRace.betTimer) clearInterval(APP_STATE.currentRace.betTimer);
            APP_STATE.currentRace.status = 'ready';
            const badge = document.getElementById('race-status-badge');
            if (badge) {
                badge.className = 'badge ready';
                badge.textContent = 'PRÊT AU DÉPART';
            }
            for (let i = 1; i <= 4; i++) {
                const sel = document.getElementById(`finish-pos-${i}`);
                if (sel) sel.value = '';
            }
            playTaunt('rev');
            alert("🔄 La manche a été réinitialisée ! Les feux sont prêts pour un nouveau départ.");
        });
    }

    const btnCancel = document.getElementById('btn-admin-cancel-race');
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            if (APP_STATE.currentRace.betTimer) clearInterval(APP_STATE.currentRace.betTimer);
            APP_STATE.currentRace.status = 'cancelled';
            const badge = document.getElementById('race-status-badge');
            if (badge) {
                badge.className = 'badge DNF';
                badge.textContent = '🛑 DRAPEAU ROUGE • MANCHE ANNULÉE';
            }
            playTaunt('horn');
            alert("🛑 Drapeau Rouge activé par les commissaires. La manche active est annulée.");
        });
    }

    const btnForceStart = document.getElementById('btn-admin-force-start');
    if (btnForceStart) {
        btnForceStart.addEventListener('click', () => {
            if (APP_STATE.currentRace.betTimer) clearInterval(APP_STATE.currentRace.betTimer);
            triggerRaceStart();
            alert("🟢 Départ forcé immédiat validé !");
        });
    }

    const btnYellowFlag = document.getElementById('btn-admin-yellow-flag');
    if (btnYellowFlag) {
        btnYellowFlag.addEventListener('click', () => {
            const badge = document.getElementById('race-status-badge');
            if (badge) {
                badge.className = 'badge bet';
                badge.textContent = '⚠️ SAFETY CAR • VITESSE NEUTRALISÉE';
            }
            playTaunt('skid');
            alert("⚠️ Neutralisation Safety Car déployée sur le circuit.");
        });
    }

    const btnQuickFinish = document.getElementById('btn-admin-quick-finish');
    if (btnQuickFinish) {
        btnQuickFinish.addEventListener('click', () => {
            // Prendre les voitures actuelles des voies
            const laneCars = APP_STATE.currentRace.lanes.filter(Boolean);
            if (laneCars.length < 2) {
                alert("⚠️ Veuillez d'abord placer au moins 2 bolides sur la grille de départ.");
                return;
            }
            // Mélanger et assigner
            const shuffled = [...laneCars].sort(() => 0.5 - Math.random());
            shuffled.forEach((code, idx) => {
                const sel = document.getElementById(`finish-pos-${idx + 1}`);
                if (sel) sel.value = code;
            });
            validateRaceResults();
            renderAdminScores();
            alert("🏁 Arrivée simulée et points distribués automatiquement !");
        });
    }

    // 2. Nettoyage de piste & Pièces
    const btnClearTraps = document.getElementById('btn-admin-clear-traps');
    if (btnClearTraps) {
        btnClearTraps.addEventListener('click', () => {
            alert("🍌 Piste 100% nettoyée ! Tous les pièges 3D physiques ont été retirés.");
        });
    }

    const btnGiveCoins = document.getElementById('btn-admin-give-coins');
    if (btnGiveCoins) {
        btnGiveCoins.addEventListener('click', () => {
            APP_STATE.coins += 25;
            updateWalletDisplay();
            renderAdminScores();
            playTaunt('coin');
            alert("🪙 +25 pièces d'or distribuées avec succès !");
        });
    }

    const btnReloadVid = document.getElementById('btn-admin-reload-video');
    if (btnReloadVid) {
        btnReloadVid.addEventListener('click', () => {
            if (typeof forceReloadBackgroundVideo === 'function') {
                forceReloadBackgroundVideo();
            }
        });
    }

    const btnToggleMuteTaunt = document.getElementById('btn-admin-toggle-mute-taunt');
    if (btnToggleMuteTaunt) {
        btnToggleMuteTaunt.addEventListener('click', () => {
            APP_STATE.tauntsMuted = !APP_STATE.tauntsMuted;
            btnToggleMuteTaunt.textContent = APP_STATE.tauntsMuted ? '🔇 TAUNT BOX : MUTÉE' : '🔊 TAUNT BOX : ACTIVE';
            btnToggleMuteTaunt.className = APP_STATE.tauntsMuted ? 'btn btn-danger' : 'btn btn-warning';
            alert(APP_STATE.tauntsMuted ? "🔇 La Taunt Box a été mise en sourdine par la direction." : "🔊 Taunt Box réactivée.");
        });
    }

    // 3. Scores et Table
    const btnResetScores = document.getElementById('btn-admin-reset-scores');
    if (btnResetScores) {
        btnResetScores.addEventListener('click', () => {
            if (confirm("⚠️ Êtes-vous sûr de vouloir réinitialiser TOUS les points de la saison à zéro ?")) {
                APP_STATE.teams.forEach(t => t.points = 0);
                saveLocalStorage();
                renderStandings();
                renderAdminScores();
                alert("🔄 Tous les scores ont été remis à 0 !");
            }
        });
    }

    // 4. Sauvegarde & Reset Usine
    const btnExport = document.getElementById('btn-admin-export-backup');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(APP_STATE, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", `grand_prix_noel_sauvegarde_${Date.now()}.json`);
            dlAnchor.click();
        });
    }

    const btnImport = document.getElementById('btn-admin-import-backup');
    const fileImporter = document.getElementById('admin-file-importer');
    if (btnImport && fileImporter) {
        btnImport.addEventListener('click', () => fileImporter.click());
        fileImporter.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (parsed.teams) APP_STATE.teams = parsed.teams;
                    if (parsed.coins !== undefined) APP_STATE.coins = parsed.coins;
                    if (parsed.paddocks) APP_STATE.paddocks = parsed.paddocks;
                    saveLocalStorage();
                    renderStandings();
                    renderAdminScores();
                    updateWalletDisplay();
                    alert("📥 Données importées avec succès !");
                } catch (err) {
                    alert("❌ Erreur lors de la lecture du fichier JSON : " + err);
                }
            };
            reader.readAsText(file);
        });
    }

    const btnFactoryReset = document.getElementById('btn-admin-factory-reset');
    if (btnFactoryReset) {
        btnFactoryReset.addEventListener('click', () => {
            if (confirm("💣 ATTENTION : Cette action efface toutes les données de session (LocalStorage). Continuer ?")) {
                if (confirm("🚨 DERNIÈRE CONFIRMATION : Réinitialiser complètement l'application ?")) {
                    localStorage.clear();
                    alert("💣 Réinitialisation effectuée. La page va se recharger.");
                    window.location.reload();
                }
            }
        });
    }
}

function showAdminLock() {
    const lockScreen = document.getElementById('admin-lock-screen');
    const dashScreen = document.getElementById('admin-dashboard-screen');
    const pinInput = document.getElementById('admin-pin-input');
    const pinError = document.getElementById('admin-pin-error');
    if (lockScreen) lockScreen.style.display = 'block';
    if (dashScreen) dashScreen.style.display = 'none';
    if (pinError) pinError.style.display = 'none';
    if (pinInput) {
        pinInput.value = '';
        setTimeout(() => pinInput.focus(), 150);
    }
}

function showAdminDashboard() {
    const lockScreen = document.getElementById('admin-lock-screen');
    const dashScreen = document.getElementById('admin-dashboard-screen');
    if (lockScreen) lockScreen.style.display = 'none';
    if (dashScreen) dashScreen.style.display = 'block';
    renderAdminScores();
}

function renderAdminScores() {
    const tbody = document.getElementById('admin-teams-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Synchroniser et trier les écuries par points descendants
    const sortedTeams = [...APP_STATE.teams].map(team => {
        const stats = APP_STATE.standings.teams[team.id] || { points: 0 };
        return { ...team, points: stats.points !== undefined ? stats.points : (team.points || 0) };
    }).sort((a, b) => (b.points || 0) - (a.points || 0));

    sortedTeams.forEach(team => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="admin-team-cell">
                    <img src="${team.logo}" alt="${team.name}" class="admin-team-logo" onerror="this.src='logos/01_laurent_petite_mimine_racing.png'">
                    <strong>${team.name}</strong>
                </div>
            </td>
            <td><span class="admin-driver-name">${team.pilot || team.driver || 'Pilote'}</span></td>
            <td>
                <input type="number" class="admin-pts-input" value="${team.points || 0}" min="0" onchange="updateTeamPointsDirect('${team.id}', this.value)">
            </td>
            <td>
                <div class="admin-quick-pts">
                    <button class="btn btn-sm btn-success" onclick="adjustTeamPoints('${team.id}', 5)">+5</button>
                    <button class="btn btn-sm btn-primary" onclick="adjustTeamPoints('${team.id}', 1)">+1</button>
                    <button class="btn btn-sm btn-secondary" onclick="adjustTeamPoints('${team.id}', -1)">-1</button>
                </div>
            </td>
            <td>
                <span class="admin-coins-val">${team.id === APP_STATE.activeTeamId ? APP_STATE.coins : 50} 🪙</span>
            </td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="penalizeTeam('${team.id}')">⚠️ Pénalité (-3 pts)</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.closeAdminModal = function() {
    const modal = document.getElementById('admin-modal');
    if (modal) modal.style.display = 'none';
};

window.updateTeamPointsDirect = function(teamId, val) {
    const tId = parseInt(teamId, 10);
    const team = APP_STATE.teams.find(t => t.id === tId);
    if (!team) return;
    const newPts = Math.max(0, parseInt(val, 10) || 0);
    team.points = newPts;
    if (!APP_STATE.standings.teams[tId]) {
        APP_STATE.standings.teams[tId] = { points: 0, wins: 0, podiums: 0, races: 0, coinsSpent: 0, coinsWon: 0, trapsUsed: 0, betsPlaced: 0 };
    }
    APP_STATE.standings.teams[tId].points = newPts;
    saveLocalStorage();
    renderStandings();
};

window.adjustTeamPoints = function(teamId, delta) {
    const tId = parseInt(teamId, 10);
    const team = APP_STATE.teams.find(t => t.id === tId);
    if (!team) return;
    if (!APP_STATE.standings.teams[tId]) {
        APP_STATE.standings.teams[tId] = { points: 0, wins: 0, podiums: 0, races: 0, coinsSpent: 0, coinsWon: 0, trapsUsed: 0, betsPlaced: 0 };
    }
    const currentPts = APP_STATE.standings.teams[tId].points || team.points || 0;
    const newPts = Math.max(0, currentPts + delta);
    team.points = newPts;
    APP_STATE.standings.teams[tId].points = newPts;
    saveLocalStorage();
    renderStandings();
    renderAdminScores();
    playTaunt('coin');
};

window.penalizeTeam = function(teamId) {
    const tId = parseInt(teamId, 10);
    const team = APP_STATE.teams.find(t => t.id === tId);
    if (!team) return;
    if (!APP_STATE.standings.teams[tId]) {
        APP_STATE.standings.teams[tId] = { points: 0, wins: 0, podiums: 0, races: 0, coinsSpent: 0, coinsWon: 0, trapsUsed: 0, betsPlaced: 0 };
    }
    const currentPts = APP_STATE.standings.teams[tId].points || team.points || 0;
    const newPts = Math.max(0, currentPts - 3);
    team.points = newPts;
    APP_STATE.standings.teams[tId].points = newPts;
    saveLocalStorage();
    renderStandings();
    renderAdminScores();
    playTaunt('crash');
    alert(`⚠️ Pénalité de 3 points appliquée à l'écurie ${team.name} !`);
};

// =============================================================================
// 18. DÉMARRAGE AU CHARGEMENT DE LA PAGE
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});



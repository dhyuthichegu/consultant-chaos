/**
 * CONSULTING CHAOS V12.6
 * Final OverSimplified Style + Layout Fixes
 */

// --- CONFIG ---
const COLORS = {
    red: '#ff6b6b', green: '#1dd1a1', blue: '#54a0ff', 
    yellow: '#feca57', purple: '#5f27cd', orange: '#ff9f43',
    pink: '#fd79a8', grey: '#636e72'
};

const TASKS = [
    { id: 'deck', name: 'Deck', icon: '📊', color: COLORS.red },
    { id: 'model', name: 'Model', icon: '📉', color: COLORS.green },
    { id: 'legal', name: 'Legal', icon: '📜', color: COLORS.yellow },
    { id: 'coffee', name: 'Coffee', icon: '☕', color: COLORS.blue },
    { id: 'tech', name: 'IT', icon: '💻', color: COLORS.purple },
    { id: 'hr', name: 'HR', icon: '📝', color: COLORS.orange },
    { id: 'stocks', name: 'Stocks', icon: '📈', color: COLORS.pink },
    { id: 'bonds', name: 'Bonds', icon: '🏛️', color: COLORS.grey }
];

const AUDIO = {
    sounds: {
        bruh: new Audio('sounds/bruh.mp3'),
        vine: new Audio('sounds/vine-boom.mp3'),
        yippee: new Audio('sounds/yippee.mp3'),
        bonk: new Audio('sounds/bonk.mp3'),
        leave: new Audio('sounds/leave.mp3'),
        bgm: new Audio('sounds/bgm.mp3'),
        paper: new Audio('sounds/paper.mp3'),
        slurp: new Audio('sounds/slurp.mp3'),
        keyboard: new Audio('sounds/keyboard.mp3'),
        cash: new Audio('sounds/cash.mp3'),
        rooster: new Audio('sounds/rooster.mp3'),
        trombone: new Audio('sounds/trombone.mp3')
    },
    play: function(key) { if(this.sounds[key]) { this.sounds[key].volume=0.4; this.sounds[key].currentTime=0; this.sounds[key].play().catch(()=>{}); } },
    playBGM: function() { this.sounds.bgm.loop=true; this.sounds.bgm.volume=0.2; this.sounds.bgm.play().catch(()=>{}); },
    speak: function(t) { if(window.speechSynthesis) { const u=new SpeechSynthesisUtterance(t); u.rate=0.9; window.speechSynthesis.speak(u); } },
    bruh: function() { this.play('bruh'); },
    leave: function() { this.sounds.bgm.pause(); this.play('trombone'); setTimeout(()=>this.play('leave'),1000); },
    vine: function() { this.play('vine'); },
    success: function() { this.play('yippee'); },
    rooster: function() { this.play('rooster'); },
    splat: function() { this.play('bonk'); },
    pickup: function(t) { if(t==='coffee')this.play('slurp'); else if(t==='tech')this.play('keyboard'); else if(t==='model'||t==='stocks')this.play('cash'); else this.play('paper'); }
};

const Game = {
    canvas: null, ctx: null,
    state: { phase: 'IDLE', level: 1, score: 0, goal: 2, sanity: 100, frame: 0, highScore: 0 },
    map: [], player: { x: 480, y: 350, w: 30, h: 30, holding: null, frame: 0, stun: 0 },
    clients: [], projectiles: [], splats: [], particles: [], steam: [],
    
    // Layout Config
    deskY: 560, 
    trashBin: { x: 880, y: 580, w: 60, h: 80 },

    init: function() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        const s = localStorage.getItem('cc_score');
        if(s) this.state.highScore = parseInt(s);
        
        this.keys = {};
        window.addEventListener('keydown', e => {
            if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code)) e.preventDefault();
            this.keys[e.key] = true;
            if(e.code === 'Space') this.keys['Space'] = true;
        }, {passive:false});
        window.addEventListener('keyup', e => {
            this.keys[e.key] = false;
            if(e.code === 'Space') { this.keys['Space'] = false; this.lockSpace = false; }
        });
        
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    },

    startPhase: function(phase) {
        const title = this.state.level === 1 ? "Deloitte (Monday)" : "Goldman Sachs (Tuesday)";
        const tEl = document.getElementById('ui-level');
        if(tEl) tEl.innerText = title;

        if(phase === 'MEMORIZE') {
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('level-screen').classList.add('hidden');
            document.getElementById('memory-overlay').classList.remove('hidden');

            this.map = [];
            let tasks = [...TASKS];
            if(this.state.level === 1) tasks = tasks.slice(0, 6);
            tasks.sort(() => Math.random() - 0.5);

            const cols = this.state.level === 1 ? 3 : 4;
            const w = this.state.level === 1 ? 220 : 180;
            const sx = this.state.level === 1 ? 80 : 60;
            const sy = 130; // Moved UP to fix UI overlap

            for(let r=0; r<2; r++) {
                for(let c=0; c<cols; c++) {
                    const t = tasks.shift();
                    if(t) this.map.push({ x: sx + (c*(w+40)), y: sy + (r*240), w: w, h: 150, task: t }); // Height 150
                }
            }

            const lg = document.getElementById('legend-display');
            if(lg) {
                lg.innerHTML = '';
                lg.style.gridTemplateColumns = this.state.level === 1 ? "1fr 1fr 1fr" : "1fr 1fr 1fr 1fr";
                this.map.forEach(c => lg.innerHTML += `<div class="legend-item" style="border-left:10px solid ${c.task.color}">${c.task.name} ${c.task.icon}</div>`);
            }

            let t = 20;
            const el = document.getElementById('timer-big');
            if(el) el.innerText = t;
            if(this.tInt) clearInterval(this.tInt);
            this.tInt = setInterval(() => {
                t--; if(el) el.innerText = t;
                if(t<=0) { clearInterval(this.tInt); this.startPhase('PLAYING'); }
            }, 1000);
            this.state.phase = 'MEMORIZE';
        }

        if(phase === 'PLAYING') {
            AUDIO.playBGM();
            document.getElementById('memory-overlay').classList.add('hidden');
            document.getElementById('level-screen').classList.add('hidden');
            this.state.phase = 'PLAYING';
            this.state.score = 0;
            this.state.sanity = 100;
            this.player.holding = null;
            this.player.stun = 0;
            this.clients = [];
            this.projectiles = [];
            this.splats = [];
            this.state.goal = 1 + this.state.level;
            this.spawnClient();
        }
    },

    skipMemory: function() {
        if(this.state.phase === 'MEMORIZE') {
            clearInterval(this.tInt);
            this.startPhase('PLAYING');
        }
    },

    nextLevel: function() {
        AUDIO.rooster();
        const gifs = ['win-office.gif', 'win-wolf.gif', 'win-spongebob.gif'];
        const rGif = gifs[Math.floor(Math.random() * gifs.length)];
        const img = document.querySelector('#level-screen img');
        if(img) img.src = `images/${rGif}`;
        
        this.state.level++;
        this.startPhase('MEMORIZE'); 
    },

    loop: function() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    },

    update: function() {
        if(this.state.phase !== 'PLAYING') return;
        this.state.frame++;

        if(this.player.stun > 0) {
            this.player.stun--;
        } else {
            let dx=0, dy=0; const s=6;
            if(this.keys['w']||this.keys['ArrowUp']) dy=-s;
            if(this.keys['s']||this.keys['ArrowDown']) dy=s;
            if(this.keys['a']||this.keys['ArrowLeft']) dx=-s;
            if(this.keys['d']||this.keys['ArrowRight']) dx=s;
            this.player.x = Math.max(20, Math.min(940, this.player.x+dx));
            this.player.y = Math.max(20, Math.min(this.deskY-30, this.player.y+dy));
            if(dx||dy) this.player.frame+=0.25;
            
            if(this.keys['Space'] && !this.lockSpace) {
                this.interact();
                this.lockSpace=true;
            }
        }

        let rate = Math.max(600, 1800 - (this.state.level * 200));
        if(this.state.frame % rate === 0 && this.clients.length < 3) this.spawnClient();

        this.clients.forEach((c, i) => {
            if(c.state === 'WAITING') {
                c.patience -= (0.05 + (this.state.level * 0.015));
                if(c.patience <= 0) {
                    c.state = 'CHAD';
                    c.patience = 100;
                    this.state.sanity -= 10;
                    AUDIO.bruh();
                    this.particle(c.x, c.y, "🤬", "red");
                    c.attackTimer = 60;
                    c.cooldown = 0;
                }
            } else if (c.state === 'CHAD') {
                if(c.cooldown > 0) c.cooldown--;
                else {
                    c.attackTimer--;
                    if(c.attackTimer <= 0) {
                        this.throw(c);
                        c.attackTimer = Math.max(30, 120 - (this.state.level*10));
                        if(Math.random()<0.3) c.cooldown = 180;
                    }
                }
            }
        });

        for(let i=this.projectiles.length-1; i>=0; i--) {
            let p = this.projectiles[i];
            p.x+=p.vx; p.y+=p.vy; p.rot+=0.2;
            if(p.x<0||p.x>960||p.y<0||p.y>640) { this.projectiles.splice(i,1); continue; }
            if(Math.hypot(p.x-this.player.x, p.y-this.player.y)<30) {
                this.state.sanity-=15; this.player.stun=45; AUDIO.splat();
                this.projectiles.splice(i,1);
                this.splats.push({x:this.player.x, y:this.player.y});
                this.particle(this.player.x, this.player.y, "💥", "orange");
                if(this.state.sanity<=0) this.gameOver();
            }
        }

        const tEl = document.getElementById('ui-level');
        if(tEl && tEl.innerText === '1') tEl.innerText = this.state.level === 1 ? "Deloitte" : "Goldman";
        document.getElementById('ui-score').innerText = this.state.score;
        document.getElementById('ui-goal').innerText = this.state.goal;
        document.getElementById('ui-hp').innerText = Math.floor(this.state.sanity);
    },

    spawnClient: function() {
        const validTasks = this.map.map(m => m.task);
        const task = validTasks[Math.floor(Math.random() * validTasks.length)];
        const isMale = Math.random() > 0.5;
        
        this.clients.push({
            x: 150 + (this.clients.length * 250),
            y: this.deskY+40, w:40, h:40,
            task: task, patience: 100, state: 'WAITING', attackTimer: 0, cooldown: 0, frame: 0,
            gender: isMale ? 'MALE' : 'FEMALE',
            hairColor: ['#634a36', '#2d3436', '#e1b12c'][Math.floor(Math.random()*3)],
            suitColor: isMale ? ['#2d3436', '#636e72', '#0984e3'][Math.floor(Math.random()*3)] : 
                                ['#e84393', '#fd79a8', '#6c5ce7'][Math.floor(Math.random()*3)]
        });
        AUDIO.vine();
    },

    throw: function(c) {
        const dx = this.player.x - c.x; const dy = this.player.y - c.y;
        const d = Math.hypot(dx, dy); const s = 7 + (this.state.level * 0.5);
        this.projectiles.push({x:c.x, y:c.y, vx:(dx/d)*s, vy:(dy/d)*s, rot:0});
    },

    spawnSteam: function(x, y) {
        for(let i=0; i<5; i++) {
            this.steam.push({x: x + Math.random()*20, y: y, life: 60, vx: (Math.random()-0.5), vy: -1 - Math.random()});
        }
    },

    interact: function() {
        if(this.player.stun>0) return;
        const p = this.player;
        
        for(let c of this.map) {
            if(p.x>c.x && p.x<c.x+c.w && p.y>c.y && p.y<c.y+c.h) {
                p.holding = c.task;
                this.particle(p.x, p.y-50, c.task.icon, "black");
                AUDIO.pickup(c.task.id);
                if(c.task.id === 'coffee') this.spawnSteam(c.x+50, c.y+40);
                return;
            }
        }
        if(Math.hypot(p.x-this.trashBin.x, p.y-this.trashBin.y)<80) {
            if(p.holding) { p.holding=null; this.particle(this.trashBin.x, this.trashBin.y-50, "🗑️", "gray"); }
            return;
        }
        for(let i=0; i<this.clients.length; i++) {
            let c = this.clients[i];
            if(c.state!=='WAITING') continue;
            if(Math.hypot(p.x-c.x, p.y-(c.y-60))<90) {
                if(p.holding && p.holding.id===c.task.id) {
                    this.clients.splice(i,1); this.state.score++;
                    this.state.sanity = Math.min(100, this.state.sanity+15);
                    p.holding=null; AUDIO.success(); this.particle(c.x, c.y-100, "✅", "green");
                    if(this.state.score>=this.state.goal) {
                        this.state.phase='LEVEL_DONE';
                        document.getElementById('level-screen').classList.remove('hidden');
                    }
                } else if(p.holding) {
                    this.state.sanity-=10; AUDIO.bruh();
                    this.particle(c.x, c.y-100, "❌", "red");
                    if(this.state.sanity<=0) this.gameOver();
                }
            }
        }
    },

    gameOver: function() {
        this.state.phase = 'GAMEOVER';
        if(this.state.level > this.state.highScore) localStorage.setItem('cc_score', this.state.level);
        document.getElementById('game-over-screen').classList.remove('hidden');
        AUDIO.leave();
    },

    particle: function(x,y,t,c) { this.particles.push({x,y,t,c,life:60}); },

    rect: function(x, y, w, h, col) { 
        this.ctx.fillStyle = col; this.ctx.fillRect(x,y,w,h); 
        this.ctx.lineWidth = 4; this.ctx.strokeStyle="black"; this.ctx.strokeRect(x,y,w,h); 
    },
    circle: function(x, y, r, col) {
        this.ctx.fillStyle = col; this.ctx.beginPath(); this.ctx.arc(x,y,r,0,Math.PI*2); this.ctx.fill();
        this.ctx.stroke();
    },

    // --- DRAWING ENGINE ---

    draw: function() {
        const ctx = this.ctx;
        ctx.clearRect(0,0,960,640);
        ctx.fillStyle="#f5f6fa"; ctx.fillRect(0,0,960,640);
        ctx.strokeStyle="#e1e1e1"; ctx.lineWidth=2;
        for(let i=0; i<960; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,640); ctx.stroke(); }

        this.splats.forEach(s => { ctx.fillStyle="rgba(101,67,33,0.5)"; ctx.beginPath(); ctx.ellipse(s.x, s.y, 30, 20, 0, 0, Math.PI*2); ctx.fill(); });

        this.drawPlant(10, 300); this.drawPlant(910, 300);

        this.map.forEach(c => this.drawCubicle(c));
        ctx.fillStyle="#57606f"; ctx.fillRect(0, this.deskY, 960, 20);
        ctx.fillStyle="black"; ctx.font="80px Arial"; ctx.fillText("🗑️", this.trashBin.x-20, this.trashBin.y+40);

        this.steam.forEach((s, i) => {
            ctx.fillStyle = `rgba(255, 255, 255, ${s.life/60})`;
            ctx.beginPath(); ctx.arc(s.x, s.y, 5, 0, Math.PI*2); ctx.fill();
            s.x += s.vx; s.y += s.vy; s.life--;
            if(s.life <= 0) this.steam.splice(i, 1);
        });

        this.clients.forEach(c => this.drawClient(c));
        this.projectiles.forEach(p => {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle="white"; ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle="#6F4E37"; ctx.fillRect(-6,-6,12,12);
            ctx.restore();
        });

        this.drawPlayer(this.player);
        
        this.particles.forEach((p,i) => {
            ctx.fillStyle=p.c; ctx.font="40px Arial"; ctx.fillText(p.t, p.x, p.y);
            p.y--; p.life--; if(p.life<=0) this.particles.splice(i,1);
        });

        if(this.state.sanity<=30 && Math.floor(this.state.frame/10)%2===0) {
            ctx.fillStyle="rgba(255,0,0,0.2)"; ctx.fillRect(0,0,960,640);
            ctx.fillStyle="red"; ctx.font="bold 30px Courier New"; ctx.fillText("⚠️ CHAD ALERT ⚠️", 350, 100);
        }
    },

    drawCubicle: function(c) {
        const ctx = this.ctx;
        
        ctx.fillStyle = c.task.color; 
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.lineWidth=4; ctx.strokeStyle="black"; ctx.strokeRect(c.x, c.y, c.w, c.h);

        if(c.task.id === 'coffee') {
            // COFFEE STATION
            ctx.fillStyle = "#b2bec3"; ctx.fillRect(c.x+c.w-40, c.y+10, 30, 80); ctx.strokeRect(c.x+c.w-40, c.y+10, 30, 80); // Fridge
            ctx.beginPath(); ctx.moveTo(c.x+c.w-35, c.y+40); ctx.lineTo(c.x+c.w-35, c.y+60); ctx.stroke(); // Handle

            ctx.fillStyle = "#636e72"; ctx.fillRect(c.x+10, c.y+40, c.w-60, 50); ctx.strokeRect(c.x+10, c.y+40, c.w-60, 50); // Counter
            
            ctx.fillStyle = "#2d3436"; ctx.fillRect(c.x+30, c.y+10, 40, 50); ctx.strokeRect(c.x+30, c.y+10, 40, 50); // Machine
            ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.arc(c.x+50, c.y+45, 12, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#6F4E37"; ctx.beginPath(); ctx.arc(c.x+50, c.y+50, 8, 0, Math.PI, false); ctx.fill(); 
            
            ctx.fillStyle = "white"; // Cups
            ctx.fillRect(c.x+80, c.y+30, 10, 10); ctx.strokeRect(c.x+80, c.y+30, 10, 10);
            ctx.fillRect(c.x+95, c.y+30, 10, 10); ctx.strokeRect(c.x+95, c.y+30, 10, 10);
            
            // Donuts
            ctx.fillStyle = "white"; ctx.beginPath(); ctx.ellipse(c.x+100, c.y+60, 25, 10, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#e84393"; ctx.beginPath(); ctx.arc(c.x+90, c.y+58, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = "#fdcb6e"; ctx.beginPath(); ctx.arc(c.x+110, c.y+58, 6, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        } else {
            // STANDARD
            ctx.fillStyle = "#e58e26"; 
            ctx.fillRect(c.x + 20, c.y + 20, c.w - 40, 50); ctx.strokeRect(c.x + 20, c.y + 20, c.w - 40, 50);
            ctx.fillRect(c.x + c.w - 60, c.y + 20, 40, c.h - 40); ctx.strokeRect(c.x + c.w - 60, c.y + 20, 40, c.h - 40);
            ctx.fillStyle = "#ced6e0";
            this.rect(c.x, c.y, 15, c.h, "#ced6e0");
            this.rect(c.x + c.w - 15, c.y, 15, c.h, "#ced6e0");
            this.rect(c.x, c.y, c.w, 15, "#ced6e0");

            this.rect(c.x + 40, c.y + 10, 60, 40, "#2f3640");
            ctx.fillStyle = "#3498db"; ctx.fillRect(c.x + 45, c.y + 15, 50, 30);
            this.rect(c.x + 50, c.y + 55, 40, 10, "#dcdde1");
            this.rect(c.x + c.w - 50, c.y + 80, 25, 30, "white");
            this.circle(c.x + 80, c.y + 100, 18, "#2f3640");
        }

        if(this.state.phase === 'MEMORIZE') {
            ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(c.x+20, c.y+80, c.w-80, 60);
            ctx.fillStyle = "white"; ctx.font = "40px Arial"; ctx.textAlign = "center";
            ctx.fillText(c.task.icon, c.x + 80, c.y + 120);
        }
    },

    drawPlant: function(x, y) {
        this.rect(x, y+20, 40, 40, "#e17055"); 
        this.circle(x+20, y+10, 25, "#00b894"); 
    },

    drawAvatar: function(x, y, color, gender, frame, isPlayer, hasMustache, emotion) {
        const ctx = this.ctx;
        const bob = Math.sin(frame)*3;
        
        // --- LEGS (Stick legs, classic OverSimplified) ---
        ctx.strokeStyle="black"; ctx.lineWidth=3; ctx.lineCap="round";
        const step = Math.sin(frame*0.8) * 6;
        ctx.beginPath(); ctx.moveTo(x-5, y+35); ctx.lineTo(x-5, y+50+step); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+5, y+35); ctx.lineTo(x+5, y+50-step); ctx.stroke();

        // --- BODY (Bell/Pawn Shape) ---
        ctx.fillStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (gender === 'FEMALE') {
            // Dress (Bell Shape)
            ctx.moveTo(x, y+10+bob); // Neck center
            ctx.quadraticCurveTo(x-15, y+15+bob, x-15, y+40+bob); // Left curve
            ctx.lineTo(x+15, y+40+bob); // Bottom
            ctx.quadraticCurveTo(x+15, y+15+bob, x, y+10+bob); // Right curve
        } else {
            // Suit (Rounded Rect)
            ctx.roundRect(x-12, y+10+bob, 24, 30, 5);
        }
        ctx.fill(); ctx.stroke();

        // --- OUTFIT DETAILS ---
        if(gender === 'MALE') {
            // White Shirt Triangle
            ctx.fillStyle="white";
            ctx.beginPath(); ctx.moveTo(x, y+25+bob); ctx.lineTo(x-5, y+10+bob); ctx.lineTo(x+5, y+10+bob); ctx.fill();
            // Tie (Thin Line)
            ctx.strokeStyle = isPlayer ? "#e74c3c" : "#2980b9";
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(x, y+10+bob); ctx.lineTo(x, y+25+bob); ctx.stroke();
        }

        // --- HEAD (Large Circle) ---
        ctx.fillStyle = emotion === 'ANGRY' ? "#ffcccc" : "#ffeaa7"; // Skin
        ctx.beginPath(); ctx.arc(x, y-2+bob, 24, 0, Math.PI*2); ctx.fill(); 
        ctx.lineWidth = 3; ctx.strokeStyle="black"; ctx.stroke();

        // --- HAIR (Simple Shapes) ---
        ctx.fillStyle = gender === 'FEMALE' ? "#e1b12c" : "#634a36";
        if(!isPlayer) {
             const hCol = ['#634a36', '#2d3436', '#e1b12c', '#d35400'][Math.floor(x/100)%4];
             ctx.fillStyle = hCol;
        }

        if(gender === 'FEMALE') {
            // Long Hair (Behind head logic visual trick)
            ctx.beginPath(); ctx.arc(x, y-2+bob, 26, Math.PI, 0); ctx.lineTo(x+26, y+20+bob); ctx.lineTo(x-26, y+20+bob); ctx.fill(); ctx.stroke();
            // Redraw face to cover front hair
            ctx.fillStyle = emotion === 'ANGRY' ? "#ffcccc" : "#ffeaa7";
            ctx.beginPath(); ctx.arc(x, y-2+bob, 24, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        } else {
            // Short Hair (Cap)
            ctx.beginPath(); ctx.arc(x, y-5+bob, 24, Math.PI, 0); ctx.fill(); ctx.stroke();
        }

        // --- FACE (The "OverSimplified" Dot Eyes) ---
        ctx.fillStyle="black";
        if(emotion === 'ANGRY') {
            // Angry Eyebrows
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x-8, y-8+bob); ctx.lineTo(x-2, y-4+bob); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x+8, y-8+bob); ctx.lineTo(x+2, y-4+bob); ctx.stroke();
        }
        // Dots
        ctx.beginPath(); ctx.arc(x-5, y+bob, 2.5, 0, Math.PI*2); ctx.fill(); 
        ctx.beginPath(); ctx.arc(x+5, y+bob, 2.5, 0, Math.PI*2); ctx.fill();

        // Mustache (Simple Curve)
        if(hasMustache) {
            ctx.lineWidth=2; ctx.strokeStyle="black";
            ctx.beginPath(); ctx.moveTo(x-6, y+8+bob); ctx.quadraticCurveTo(x, y+4+bob, x+6, y+8+bob); ctx.stroke();
        }
    },

    drawPlayer: function(p) {
        const bob = Math.sin(p.frame)*4;
        // Shadow (Fixed: Locked to X/Y+55)
        this.ctx.fillStyle="rgba(0,0,0,0.2)"; this.ctx.beginPath(); this.ctx.ellipse(p.x+15, p.y+55, 18, 6, 0, 0, Math.PI*2); this.ctx.fill();
        
        this.drawAvatar(p.x+15, p.y, "#0984e3", 'MALE', p.frame, true, false, 'HAPPY'); 

        if(p.stun>0) { this.ctx.font = "30px Arial"; this.ctx.fillText("💫", p.x, p.y-20); }

        if(p.holding) {
            const ctx = this.ctx;
            ctx.beginPath(); ctx.moveTo(p.x+15, p.y-10+bob); ctx.lineTo(p.x+35, p.y-50+bob); ctx.lineWidth=3; ctx.strokeStyle="black"; ctx.stroke();
            this.circle(p.x+40, p.y-60+bob, 30, "white");
            ctx.fillStyle="black"; ctx.font="40px Arial"; ctx.textAlign="center"; ctx.fillText(p.holding.icon, p.x+40, p.y-48+bob);
        }
    },

    drawClient: function(c) {
        const ctx = this.ctx;
        const bob = Math.sin(this.state.frame*0.1)*3;
        const isGoldman = this.state.level >= 2;
        let col = c.state==='CHAD'?"#e17055": c.suitColor;
        
        if(!isGoldman) col = c.gender === 'MALE' ? "#74b9ff" : "#fab1a0";

        const emotion = c.state === 'CHAD' ? 'ANGRY' : 'HAPPY';
        // Draw higher (y-10) to fix clipping
        this.drawAvatar(c.x+20, c.y-10, col, c.gender, this.state.frame, false, (isGoldman && c.gender === 'MALE'), emotion);

        if(c.state==='CHAD') {
            ctx.fillStyle="black"; ctx.font="40px Arial"; ctx.fillText(c.cooldown>0?"💤":"🤬", c.x, c.y-50+bob);
        } else {
            ctx.beginPath(); ctx.moveTo(c.x+20, c.y-10+bob); ctx.lineTo(c.x+50, c.y-60+bob); ctx.lineWidth=3; ctx.strokeStyle="black"; ctx.stroke();
            this.circle(c.x+60, c.y-65+bob, 30, "white");
            ctx.fillStyle="black"; ctx.font="35px Arial"; ctx.textAlign="center"; ctx.fillText(c.task.icon, c.x+60, c.y-52+bob);
            
            ctx.fillStyle="white"; ctx.fillRect(c.x-5, c.y+60, 50, 10); ctx.strokeRect(c.x-5, c.y+60, 50, 10);
            ctx.fillStyle=c.patience<30?"red":"#00b894"; ctx.fillRect(c.x-3, c.y+62, 46*(c.patience/100), 6);
        }
    }
};

window.onload = () => Game.init();
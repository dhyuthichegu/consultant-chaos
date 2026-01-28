/**
 * CONSULTING CHAOS
 * A dynamic office survival game.
 */

// --- CONFIG ---
const COLORS = {
    red: '#ff6b6b', green: '#1dd1a1', blue: '#54a0ff', 
    yellow: '#feca57', purple: '#5f27cd', orange: '#ff9f43'
};

const TASKS = [
    { id: 'deck', name: 'Deck', icon: '📊', color: COLORS.red },
    { id: 'model', name: 'Model', icon: '📉', color: COLORS.green },
    { id: 'legal', name: 'Legal', icon: '📜', color: COLORS.yellow },
    { id: 'coffee', name: 'Coffee', icon: '☕', color: COLORS.blue },
    { id: 'tech', name: 'IT', icon: '💻', color: COLORS.purple },
    { id: 'hr', name: 'HR', icon: '📝', color: COLORS.orange }
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
    
    play: function(key) {
        if(this.sounds[key]) {
            this.sounds[key].volume = 0.4; 
            this.sounds[key].currentTime = 0;
            this.sounds[key].play().catch(e => {});
        }
    },

    playBGM: function() {
        this.sounds.bgm.loop = true;
        this.sounds.bgm.volume = 0.2; 
        this.sounds.bgm.play().catch(e => {});
    },

    speak: function(txt) {
        if(!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const ut = new SpeechSynthesisUtterance(txt);
        ut.rate = 0.9; ut.volume = 0.4;
        window.speechSynthesis.speak(ut);
    },

    bruh: function() { this.play('bruh'); },
    leave: function() { 
        this.sounds.bgm.pause();
        this.play('trombone'); // Sad trombone
        setTimeout(() => this.play('leave'), 1000); 
    },
    vine: function() { this.play('vine'); },
    splat: function() { this.play('bonk'); },
    success: function() { this.play('yippee'); },
    rooster: function() { this.play('rooster'); },
    
    pickup: function(type) {
        if(type === 'coffee') this.play('slurp');
        else if(type === 'tech') this.play('keyboard');
        else if(type === 'model') this.play('cash');
        else this.play('paper'); 
    }
};

// --- GAME ENGINE ---
const Game = {
    canvas: null,
    ctx: null,
    
    state: { phase: 'IDLE', level: 1, score: 0, goal: 2, sanity: 100, frame: 0, highScore: 0 },
    map: [],
    player: { x: 480, y: 350, w: 30, h: 30, holding: null, frame: 0, stun: 0 },
    clients: [],
    projectiles: [],
    particles: [],
    splats: [],
    
    // Bounds
    deskY: 520,
    trashBin: { x: 880, y: 540, w: 60, h: 80 },

    init: function() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Load Save
        const saved = localStorage.getItem('consulting_chaos_score');
        if(saved) this.state.highScore = parseInt(saved);

        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
        
        this.keys = {};
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            if(e.code === 'Space') this.keys['Space'] = true;
        });
        window.addEventListener('keyup', e => {
            this.keys[e.key] = false;
            if(e.code === 'Space') { this.keys['Space'] = false; this.lockSpace = false; }
        });
    },

    startPhase: function(phase) {
        if(phase === 'MEMORIZE') {
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('memory-overlay').classList.remove('hidden');
            
            // Map Gen
            this.map = [];
            let tasks = [...TASKS].sort(() => Math.random() - 0.5);
            for(let row=0; row<2; row++) {
                for(let col=0; col<3; col++) {
                    this.map.push({
                        x: 80 + (col * 290),
                        y: 80 + (row * 240),
                        w: 220, h: 160,
                        task: tasks.shift()
                    });
                }
            }

            // Legend
            const lg = document.getElementById('legend-display');
            lg.innerHTML = '';
            this.map.forEach(c => {
                lg.innerHTML += `<div class="legend-item" style="border-left:10px solid ${c.task.color}">${c.task.name} ${c.task.icon}</div>`;
            });

            // Timer
            let t = 20;
            const el = document.getElementById('timer-big');
            this.tInt = setInterval(() => {
                t--; el.innerText = t;
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
            clearInterval(this.tInt); // Stop the countdown
            document.getElementById('timer-big').innerText = "0"; // Visual feedback
            this.startPhase('PLAYING'); // Start game
        }
    },

    nextLevel: function() {
        AUDIO.rooster();
        
        // Randomize Victory GIF
        const gifs = ['win-office.gif', 'win-wolf.gif', 'win-spongebob.gif'];
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
        
        // Find the img tag in the level screen (it's the only one there)
        const img = document.querySelector('#level-screen img');
        if(img) img.src = `images/${randomGif}`;

        this.state.level++;
        this.startPhase('PLAYING'); 
    },

    loop: function() {
        this.update();
        this.draw();
        requestAnimationFrame(this.loop);
    },

    update: function() {
        if(this.state.phase !== 'PLAYING') return;
        this.state.frame++;

        // 1. Player Move
        if(this.player.stun > 0) {
            this.player.stun--;
        } else {
            let dx = 0, dy = 0;
            const spd = 6;
            if(this.keys['w'] || this.keys['ArrowUp']) dy = -spd;
            if(this.keys['s'] || this.keys['ArrowDown']) dy = spd;
            if(this.keys['a'] || this.keys['ArrowLeft']) dx = -spd;
            if(this.keys['d'] || this.keys['ArrowRight']) dx = spd;
            
            this.player.x = Math.max(20, Math.min(940, this.player.x + dx));
            this.player.y = Math.max(20, Math.min(this.deskY - 30, this.player.y + dy));
            if(dx||dy) this.player.frame += 0.25;

            // Interact
            if(this.keys['Space'] && !this.lockSpace) {
                this.interact();
                this.lockSpace = true;
            }
        }

        // 2. Clients
        let rate = Math.max(600, 1800 - (this.state.level * 200)); 
        if(this.state.frame % rate === 0 && this.clients.length < 3) this.spawnClient();

        this.clients.forEach((c, i) => {
            if(c.state === 'WAITING') {
                c.patience -= (0.05 + (this.state.level * 0.015));
                if(c.patience <= 0) {
                    // TRANSFORM TO CHAD
                    c.state = 'CHAD';
                    c.patience = 100;
                    this.state.sanity -= 10;
                    AUDIO.bruh();
                    this.particle(c.x, c.y, "🤬", "red");
                    c.attackTimer = 60; 
                    c.cooldown = 0;
                }
            } else if (c.state === 'CHAD') {
                if(c.cooldown > 0) {
                    c.cooldown--;
                } else {
                    c.attackTimer--;
                    if(c.attackTimer <= 0) {
                        this.throwProjectile(c);
                        let attackSpeed = Math.max(30, 120 - (this.state.level * 10));
                        c.attackTimer = attackSpeed;
                        if(Math.random() < 0.3) c.cooldown = 180; // Rest
                    }
                }
            }
        });

        // 3. Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.rot += 0.2; 

            if(p.x < 0 || p.x > 960 || p.y < 0 || p.y > 640) {
                this.projectiles.splice(i, 1); continue;
            }

            if(Math.hypot(p.x - this.player.x, p.y - this.player.y) < 30) {
                this.state.sanity -= 15;
                this.player.stun = 45; 
                AUDIO.splat();
                this.projectiles.splice(i, 1);
                this.splats.push({x: this.player.x, y: this.player.y});
                this.particle(this.player.x, this.player.y, "💥", "orange");
                if(this.state.sanity <= 0) this.gameOver();
            }
        }

        // HUD
        document.getElementById('ui-level').innerText = this.state.level;
        document.getElementById('ui-score').innerText = this.state.score;
        document.getElementById('ui-goal').innerText = this.state.goal;
        document.getElementById('ui-hp').innerText = Math.floor(this.state.sanity);
    },

    spawnClient: function() {
        const t = TASKS[Math.floor(Math.random() * TASKS.length)];
        this.clients.push({
            x: 150 + (this.clients.length * 250),
            y: this.deskY + 40, w: 40, h: 40,
            task: t, patience: 100, state: 'WAITING', attackTimer: 0, cooldown: 0, frame: 0
        });
        AUDIO.vine();
    },

    throwProjectile: function(client) {
        const dx = this.player.x - client.x;
        const dy = this.player.y - client.y;
        const dist = Math.hypot(dx, dy);
        const speed = 7 + (this.state.level * 0.5);
        
        this.projectiles.push({
            x: client.x, y: client.y,
            vx: (dx/dist) * speed, vy: (dy/dist) * speed,
            rot: 0
        });
    },

    interact: function() {
        const p = this.player;
        if(p.stun > 0) return; 

        // Cubicles
        for(let c of this.map) {
            if(p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h) {
                p.holding = c.task;
                this.particle(p.x, p.y-50, c.task.icon, "black");
                AUDIO.pickup(c.task.id);
                return;
            }
        }

        // Trash
        if(Math.hypot(p.x - this.trashBin.x, p.y - this.trashBin.y) < 80) {
            if(p.holding) {
                p.holding = null;
                this.particle(this.trashBin.x, this.trashBin.y-50, "🗑️", "gray");
            }
            return;
        }

        // Clients
        for(let i=0; i<this.clients.length; i++) {
            let c = this.clients[i];
            if(c.state !== 'WAITING') continue; 

            if(Math.hypot(p.x - c.x, p.y - (c.y - 60)) < 90) {
                if(p.holding && p.holding.id === c.task.id) {
                    this.clients.splice(i, 1);
                    this.state.score++;
                    this.state.sanity = Math.min(100, this.state.sanity + 15);
                    p.holding = null;
                    AUDIO.success();
                    this.particle(c.x, c.y-100, "✅", "green");
                    if(this.state.score >= this.state.goal) {
                        this.state.phase = 'LEVEL_DONE';
                        document.getElementById('level-screen').classList.remove('hidden');
                    }
                } else if(p.holding) {
                    this.state.sanity -= 10;
                    AUDIO.bruh();
                    this.particle(c.x, c.y-100, "❌", "red");
                    if(this.state.sanity <= 0) this.gameOver();
                }
            }
        }
    },

    gameOver: function() {
        this.state.phase = 'GAMEOVER';
        if(this.state.level > this.state.highScore) {
            this.state.highScore = this.state.level;
            localStorage.setItem('consulting_chaos_score', this.state.level);
        }
        document.getElementById('game-over-screen').classList.remove('hidden');
        AUDIO.leave();
    },
    
    particle: function(x, y, txt, col) { this.particles.push({x,y,txt,col,life:60}); },

    // --- DRAWING ---
    rect: function(x, y, w, h, col) { 
        this.ctx.fillStyle = col; this.ctx.fillRect(x,y,w,h); 
        this.ctx.lineWidth = 4; this.ctx.strokeStyle="black"; this.ctx.strokeRect(x,y,w,h); 
    },
    circle: function(x, y, r, col) {
        this.ctx.fillStyle = col; this.ctx.beginPath(); this.ctx.arc(x,y,r,0,Math.PI*2); this.ctx.fill();
        this.ctx.stroke();
    },

    draw: function() {
        const ctx = this.ctx;
        ctx.clearRect(0,0,960,640);
        
        // Floor
        ctx.fillStyle = "#f5f6fa"; ctx.fillRect(0,0,960,640);
        ctx.strokeStyle = "#e1e1e1"; ctx.lineWidth = 2;
        for(let i=0; i<960; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,640); ctx.stroke(); }
        
        this.splats.forEach(s => {
            ctx.fillStyle = "rgba(101, 67, 33, 0.5)"; ctx.beginPath(); ctx.ellipse(s.x, s.y, 30, 20, 0, 0, Math.PI*2); ctx.fill();
        });

        // Environment
        this.rect(20, 320, 40, 40, "#e17055"); this.circle(40, 310, 25, "#00b894"); 
        this.rect(900, 320, 40, 40, "#e17055"); this.circle(920, 310, 25, "#00b894"); 

        this.map.forEach(c => this.drawCubicle(c));
        this.rect(0, this.deskY, 960, 20, "#57606f");
        ctx.font = "80px Arial"; ctx.fillText("🗑️", this.trashBin.x - 20, this.trashBin.y + 40);

        this.clients.forEach(c => this.drawClient(c));
        this.projectiles.forEach(p => {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            this.circle(0, 0, 12, "white"); ctx.fillStyle = "#6F4E37"; ctx.fillRect(-6, -6, 12, 12);
            ctx.restore();
        });

        this.drawPlayer(this.player);

        this.particles.forEach((p,i) => {
            ctx.fillStyle = p.col; ctx.font = "40px Arial"; ctx.fillText(p.txt, p.x, p.y);
            p.y--; p.life--; if(p.life<=0) this.particles.splice(i,1);
        });

        // --- LOW SANITY WARNING (POLICE LIGHTS) ---
        if(this.state.sanity <= 30 && this.state.phase === 'PLAYING') {
            const opacity = 0.3 + Math.sin(this.state.frame * 0.2) * 0.1;
            const color = Math.floor(this.state.frame / 10) % 2 === 0 ? "rgba(255, 0, 0, 0.3)" : "rgba(0, 0, 255, 0.3)";
            
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 960, 640);
            
            ctx.fillStyle = "white";
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.font = "bold 30px Courier New";
            ctx.textAlign = "center";
            ctx.fillText("⚠️ WARNING: YOU PISSED OFF THE CHAD ⚠️", 480, 100);
            ctx.strokeText("⚠️ WARNING: YOU PISSED OFF THE CHAD ⚠️", 480, 100);
            ctx.font = "bold 20px Courier New";
            ctx.fillText("COMPLETE TASKS BEFORE YOU GET FIRED", 480, 130);
        }
    },
    
    drawCubicle: function(c) {
        const ctx = this.ctx;
        ctx.fillStyle = c.task.color; ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.lineWidth=4; ctx.strokeStyle="black"; ctx.strokeRect(c.x, c.y, c.w, c.h);

        this.rect(c.x + 20, c.y + 20, c.w - 40, 50, "#e58e26"); 
        this.rect(c.x + c.w - 60, c.y + 20, 40, c.h - 40, "#e58e26");

        ctx.fillStyle = "#ced6e0";
        this.rect(c.x, c.y, 15, c.h, "#ced6e0");
        this.rect(c.x + c.w - 15, c.y, 15, c.h, "#ced6e0");
        this.rect(c.x, c.y, c.w, 15, "#ced6e0");

        this.rect(c.x + 40, c.y + 10, 60, 40, "#2f3640");
        ctx.fillStyle = "#3498db"; ctx.fillRect(c.x + 45, c.y + 15, 50, 30);
        this.rect(c.x + 50, c.y + 55, 40, 10, "#dcdde1");
        this.rect(c.x + c.w - 50, c.y + 80, 25, 30, "white");
        this.circle(c.x + 80, c.y + 100, 18, "#2f3640");

        if(this.state.phase === 'MEMORIZE') {
            ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(c.x+20, c.y+80, c.w-80, 60);
            ctx.fillStyle = "white"; ctx.font = "40px Arial"; ctx.textAlign = "center";
            ctx.fillText(c.task.icon, c.x + 80, c.y + 120);
        }
    },

    drawLegs: function(x, y, col, frame, moving) {
        const ctx = this.ctx;
        ctx.strokeStyle = "black"; ctx.lineWidth = 4;
        let off = moving ? Math.sin(frame) * 8 : 0;
        ctx.beginPath(); ctx.moveTo(x-10, y+25); ctx.lineTo(x-10, y+45+off); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+10, y+25); ctx.lineTo(x+10, y+45-off); ctx.stroke();
    },

    drawPlayer: function(p) {
        const ctx = this.ctx;
        const bob = Math.sin(p.frame) * 4;
        const moving = (this.keys['w'] || this.keys['a'] || this.keys['s'] || this.keys['d']);
        
        ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.ellipse(p.x, p.y + 45, 20, 8, 0, 0, Math.PI*2); ctx.fill();
        this.drawLegs(p.x, p.y+bob, "#0984e3", p.frame, moving);
        
        if(p.stun > 0) {
             ctx.font = "30px Arial"; ctx.fillText("💫", p.x-10, p.y-40);
             if(Math.floor(this.state.frame/4)%2===0) return; 
        }

        this.circle(p.x, p.y + 25 + bob, 18, "#0984e3");
        this.circle(p.x, p.y + bob, 22, "#ffeaa7");
        ctx.fillStyle="black";
        ctx.beginPath(); ctx.arc(p.x-8, p.y+bob-5, 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x+8, p.y+bob-5, 3, 0, Math.PI*2); ctx.fill();

        if(p.holding) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y - 30 + bob); ctx.lineTo(p.x + 30, p.y - 70 + bob); 
            ctx.lineWidth=4; ctx.strokeStyle="black"; ctx.stroke();
            this.circle(p.x + 40, p.y - 80 + bob, 35, "white");
            ctx.fillStyle = "black"; ctx.font = "40px Arial"; ctx.textAlign = "center";
            ctx.fillText(p.holding.icon, p.x + 40, p.y - 65 + bob);
        }
    },

    drawClient: function(c) {
        const ctx = this.ctx;
        const bob = Math.sin(this.state.frame * 0.1) * 3;
        
        let col = c.state === 'CHAD' ? "#e17055" : "#ff7675";
        let head = c.state === 'CHAD' ? "#ffcccc" : "#ffeaa7";

        this.drawLegs(c.x, c.y+bob, col, this.state.frame, false);
        this.circle(c.x, c.y + 25 + bob, 18, col);
        this.circle(c.x, c.y + bob, 22, head);
        
        ctx.fillStyle="black";
        if(c.state === 'CHAD') {
             ctx.lineWidth=2; 
             ctx.beginPath(); ctx.moveTo(c.x-12, c.y-5+bob); ctx.lineTo(c.x-2, c.y+bob); ctx.stroke();
             ctx.beginPath(); ctx.moveTo(c.x+12, c.y-5+bob); ctx.lineTo(c.x+2, c.y+bob); ctx.stroke();
        } else {
             ctx.beginPath(); ctx.arc(c.x-8, c.y+bob-5, 3, 0, Math.PI*2); ctx.fill();
             ctx.beginPath(); ctx.arc(c.x+8, c.y+bob-5, 3, 0, Math.PI*2); ctx.fill();
        }

        if(c.state === 'CHAD') {
            if(c.cooldown > 0) {
                ctx.fillStyle = "gray"; ctx.font="20px Arial"; ctx.fillText("💤", c.x, c.y - 50 + bob);
            } else {
                ctx.font = "40px Arial"; ctx.fillText("🤬", c.x, c.y - 50 + bob);
            }
        } else {
            ctx.beginPath(); ctx.moveTo(c.x, c.y - 30 + bob); ctx.lineTo(c.x + 30, c.y - 60 + bob); ctx.stroke();
            this.circle(c.x + 40, c.y - 65 + bob, 30, "white");
            ctx.fillStyle = "black"; ctx.font = "35px Arial"; ctx.textAlign="center";
            ctx.fillText(c.task.icon, c.x + 40, c.y - 52 + bob);

            this.rect(c.x - 25, c.y + 55, 50, 10, "white");
            ctx.fillStyle = c.patience < 30 ? "red" : "#00b894";
            ctx.fillRect(c.x - 23, c.y + 57, 46 * (c.patience/100), 6);
        }
    }
};

window.onload = () => Game.init();
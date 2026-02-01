class FlappyKiro {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.instructionsElement = document.getElementById('instructions');
        
        // Game state
        this.gameState = 'levelSelect'; // levelSelect, waiting, playing, gameOver
        this.score = 0;
        this.gameSpeed = 2;
        this.selectedLevel = 'beginner'; // beginner, intermediate, expert
        
        // Level configurations
        this.levelConfig = {
            beginner: {
                gravity: 0.3,
                jumpPower: -8,
                gameSpeed: 1.5,
                pipeGap: 220,
                pipeSpacing: 350,
                speedIncrease: 0.1,
                name: 'Beginner'
            },
            intermediate: {
                gravity: 0.5,
                jumpPower: -10,
                gameSpeed: 2,
                pipeGap: 200,
                pipeSpacing: 300,
                speedIncrease: 0.2,
                name: 'Intermediate'
            },
            expert: {
                gravity: 0.7,
                jumpPower: -12,
                gameSpeed: 2.5,
                pipeGap: 180,
                pipeSpacing: 250,
                speedIncrease: 0.3,
                name: 'Expert'
            }
        };
        
        // Ghost properties (will be updated based on selected level)
        this.ghost = {
            x: 150,
            y: 300,
            width: 60,
            height: 60,
            velocity: 0,
            gravity: 0.5,
            jumpPower: -10,
            image: null
        };
        
        // Pipes (will be updated based on selected level)
        this.pipes = [];
        this.pipeWidth = 80;
        this.pipeGap = 200;
        this.pipeSpacing = 300;
        
        this.loadAssets();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    loadAssets() {
        this.ghost.image = new Image();
        this.ghost.image.src = 'assets/ghosty.png';
        
        // Load game over audio with GitHub Pages compatibility
        this.gameOverSound = null;
        this.loadGameOverSound();
        
        // Create Web Audio context for sand sound
        this.audioContext = null;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }
    
    loadGameOverSound() {
        try {
            this.gameOverSound = new Audio();
            this.gameOverSound.volume = 0.5;
            this.gameOverSound.preload = 'auto';
            
            // Try multiple paths for GitHub Pages compatibility
            const audioPaths = [
                './assets/game_over.wav',
                'assets/game_over.wav',
                '/assets/game_over.wav'
            ];
            
            let pathIndex = 0;
            
            const tryNextPath = () => {
                if (pathIndex < audioPaths.length) {
                    console.log('Trying audio path:', audioPaths[pathIndex]);
                    this.gameOverSound.src = audioPaths[pathIndex];
                    this.gameOverSound.load();
                    pathIndex++;
                } else {
                    console.log('All audio paths failed, using synthetic sound');
                    this.gameOverSound = null;
                }
            };
            
            this.gameOverSound.addEventListener('canplaythrough', () => {
                console.log('Game over sound loaded successfully from:', this.gameOverSound.src);
            });
            
            this.gameOverSound.addEventListener('error', (e) => {
                console.log('Audio path failed:', this.gameOverSound.src);
                tryNextPath();
            });
            
            // Start with first path
            tryNextPath();
            
        } catch (e) {
            console.log('Failed to create Audio object:', e);
            this.gameOverSound = null;
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleInput();
            } else if (this.gameState === 'levelSelect') {
                // Level selection with number keys
                if (e.code === 'Digit1') {
                    this.selectLevel('beginner');
                } else if (e.code === 'Digit2') {
                    this.selectLevel('intermediate');
                } else if (e.code === 'Digit3') {
                    this.selectLevel('expert');
                }
            }
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'levelSelect') {
                this.handleLevelClick(e);
            } else {
                this.handleInput();
            }
        });
        
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    handleInput() {
        if (this.gameState === 'levelSelect') {
            // Do nothing, level selection handled by keyboard/mouse events
            return;
        } else if (this.gameState === 'waiting') {
            this.startGame();
        } else if (this.gameState === 'playing') {
            this.flap();
        } else if (this.gameState === 'gameOver') {
            this.resetGame();
        }
    }
    
    selectLevel(level) {
        this.selectedLevel = level;
        this.applyLevelSettings();
        this.gameState = 'waiting';
        this.instructionsElement.textContent = `${this.levelConfig[level].name} Level Selected! Press SPACE or click to start`;
    }
    
    handleLevelClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Updated button areas for vertical layout
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = (this.canvas.width - buttonWidth) / 2;
        const startY = 150;
        const spacing = 80;
        
        // Check if click is within button area horizontally
        if (x >= buttonX && x <= buttonX + buttonWidth) {
            for (let i = 0; i < 3; i++) {
                const buttonY = startY + i * spacing;
                if (y >= buttonY && y <= buttonY + buttonHeight) {
                    const levels = ['beginner', 'intermediate', 'expert'];
                    this.selectLevel(levels[i]);
                    break;
                }
            }
        }
    }
    
    applyLevelSettings() {
        const config = this.levelConfig[this.selectedLevel];
        
        // Update ghost physics
        this.ghost.gravity = config.gravity;
        this.ghost.jumpPower = config.jumpPower;
        
        // Update game settings
        this.gameSpeed = config.gameSpeed;
        this.pipeGap = config.pipeGap;
        this.pipeSpacing = config.pipeSpacing;
    }
    
    startGame() {
        this.gameState = 'playing';
        this.instructionsElement.textContent =
            'Press SPACE or click to flap • Avoid the towers!';
        this.generateInitialPipes();
    }
    
    flap() {
        this.ghost.velocity = this.ghost.jumpPower;
        this.playSandSound();
    }
    
    playSandSound() {
        if (!this.audioContext) return;
        
        try {
            // Resume audio context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Create sand whoosh sound effect
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            // Connect nodes
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Configure sand sound (low frequency whoosh with noise)
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(80, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(20, this.audioContext.currentTime + 0.3);
            
            // Low-pass filter for muffled sand effect
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, this.audioContext.currentTime);
            filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
            
            // Volume envelope (quick attack, slow decay)
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            // Play the sound
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
            
        } catch (e) {
            console.log('Sand sound generation failed:', e);
        }
    }
    
    playSound(audio) {
        try {
            audio.currentTime = 0;
            audio.play();
        } catch (e) {}
    }
    
    generateInitialPipes() {
        this.pipes = [];
        for (let i = 0; i < 3; i++) {
            this.addPipe(this.canvas.width + i * this.pipeSpacing);
        }
    }
    
    addPipe(x) {
        const minHeight = 100;
        const maxHeight =
            this.canvas.height - this.pipeGap - minHeight;
        const topHeight =
            Math.random() * (maxHeight - minHeight) + minHeight;
        
        this.pipes.push({
            x: x,
            topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            bottomHeight:
                this.canvas.height - (topHeight + this.pipeGap),
            passed: false
        });
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        this.ghost.velocity += this.ghost.gravity;
        this.ghost.y += this.ghost.velocity;
        
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.gameSpeed;
            
            if (!pipe.passed && pipe.x + this.pipeWidth < this.ghost.x) {
                pipe.passed = true;
            }
            
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
            }
        }
        
        const lastPipe = this.pipes[this.pipes.length - 1];
        if (lastPipe && lastPipe.x < this.canvas.width - this.pipeSpacing) {
            this.addPipe(this.canvas.width);
        }
        
        // Calculate and update score
        this.calculateScore();
        
        this.checkCollisions();
    }
    
    calculateScore() {
        // Check each pipe to see if it was just passed
        for (const pipe of this.pipes) {
            if (!pipe.passed && pipe.x + this.pipeWidth < this.ghost.x) {
                pipe.passed = true;
                this.score++;
                
                // Update score display
                this.scoreElement.textContent = `Score: ${this.score}`;
                
                // Increase game speed every 5 points for progressive difficulty
                if (this.score % 5 === 0) {
                    this.gameSpeed += this.levelConfig[this.selectedLevel].speedIncrease;
                }
            }
        }
    }
    
    checkCollisions() {
        if (
            this.ghost.y + this.ghost.height > this.canvas.height ||
            this.ghost.y < 0
        ) {
            this.gameOver();
            return;
        }
        
        for (const pipe of this.pipes) {
            if (
                this.ghost.x < pipe.x + this.pipeWidth &&
                this.ghost.x + this.ghost.width > pipe.x
            ) {
                if (
                    this.ghost.y < pipe.topHeight ||
                    this.ghost.y + this.ghost.height > pipe.bottomY
                ) {
                    this.gameOver();
                    return;
                }
            }
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        
        // Play game over sound with fallback
        this.playGameOverSound();
        
        // Save high score
        const currentHighScore = localStorage.getItem('flappyKiroHighScore') || 0;
        if (this.score > currentHighScore) {
            localStorage.setItem('flappyKiroHighScore', this.score);
        }
        
        this.instructionsElement.innerHTML =
            '<span class="game-over">GAME OVER</span><br>Press SPACE or click to restart';
    }
    
    playGameOverSound() {
        // If we have a loaded audio file, try to play it
        if (this.gameOverSound && this.gameOverSound.readyState >= 2) {
            try {
                this.gameOverSound.currentTime = 0;
                const playPromise = this.gameOverSound.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            console.log('Game over sound played successfully');
                        })
                        .catch(error => {
                            console.log('Game over sound play failed, using synthetic:', error);
                            this.playSyntheticGameOverSound();
                        });
                } else {
                    console.log('Game over sound played (legacy)');
                }
                return;
            } catch (error) {
                console.log('Game over sound error, using synthetic:', error);
            }
        }
        
        // Fallback to synthetic sound
        console.log('Using synthetic game over sound');
        this.playSyntheticGameOverSound();
    }
    
    playSyntheticGameOverSound() {
        if (!this.audioContext) return;
        
        try {
            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Create a dramatic game over sound effect
            const oscillator1 = this.audioContext.createOscillator();
            const oscillator2 = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Connect nodes
            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Configure dramatic descending tones
            oscillator1.type = 'sawtooth';
            oscillator1.frequency.setValueAtTime(220, this.audioContext.currentTime);
            oscillator1.frequency.exponentialRampToValueAtTime(110, this.audioContext.currentTime + 0.8);
            
            oscillator2.type = 'triangle';
            oscillator2.frequency.setValueAtTime(165, this.audioContext.currentTime);
            oscillator2.frequency.exponentialRampToValueAtTime(82.5, this.audioContext.currentTime + 0.8);
            
            // Volume envelope (dramatic fade)
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.8);
            
            // Play the sound
            oscillator1.start(this.audioContext.currentTime);
            oscillator1.stop(this.audioContext.currentTime + 0.8);
            oscillator2.start(this.audioContext.currentTime);
            oscillator2.stop(this.audioContext.currentTime + 0.8);
            
            console.log('Synthetic game over sound played');
            
        } catch (e) {
            console.log('Synthetic game over sound failed:', e);
        }
    }
    
    resetGame() {
        this.gameState = 'levelSelect';
        this.score = 0;
        this.ghost.y = 300;
        this.ghost.velocity = 0;
        this.pipes = [];
        this.scoreElement.textContent = 'Score: 0';
        this.instructionsElement.textContent = 'Choose your difficulty level';
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Sky matching the page background gradient
        const sunsetGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        sunsetGradient.addColorStop(0, '#2a1b3d');    // Dark purple at top (matching page background)
        sunsetGradient.addColorStop(0.4, '#4a3b5d');  // Medium purple
        sunsetGradient.addColorStop(0.7, '#8b7a5a');  // Brown transition
        sunsetGradient.addColorStop(1, '#cbb279');    // Sandy beige at bottom (matching page background)
        this.ctx.fillStyle = sunsetGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Add tiny twinkling stars
        this.drawStars();
        
        // Curved desert sand dunes for natural look
        const dunesHeight = this.canvas.height * 0.15;
        const dunesY = this.canvas.height - dunesHeight;
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, dunesY + 20);
        
        // Create rolling sand dunes with curves
        for (let x = 0; x <= this.canvas.width; x += 50) {
            const waveHeight = Math.sin((x + this.score * 2) * 0.01) * 15;
            const duneHeight = Math.sin(x * 0.005) * 12;
            this.ctx.lineTo(x, dunesY + waveHeight + duneHeight);
        }
        
        this.ctx.lineTo(this.canvas.width, this.canvas.height);
        this.ctx.lineTo(0, this.canvas.height);
        this.ctx.closePath();
        
        // Desert sand gradient
        const sandGradient = this.ctx.createLinearGradient(0, dunesY, 0, this.canvas.height);
        sandGradient.addColorStop(0, '#F4E4BC');  // Light sand
        sandGradient.addColorStop(0.4, '#E6D690'); // Medium sand
        sandGradient.addColorStop(0.8, '#D4B896'); // Darker sand
        sandGradient.addColorStop(1, '#C19A6B');   // Deep desert sand
        this.ctx.fillStyle = sandGradient;
        this.ctx.fill();
        
        // Add subtle sand dune texture
        this.ctx.strokeStyle = '#DEB887';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.drawPipes();
        this.drawGhost();
        
        // Draw in-game score
        if (this.gameState === 'playing') {
            this.drawScore();
        }
        
        if (this.gameState === 'levelSelect') {
            this.drawLevelSelection();
        } else if (this.gameState === 'waiting') {
            this.drawStartMessage();
        }
    }
    
    drawScore() {
        // Draw score on canvas during gameplay (no background rectangle)
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 24px Courier New';
        this.ctx.textAlign = 'left';
        
        // Add text shadow for better readability
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        this.ctx.fillText(`Score: ${this.score}`, 20, 40);
        
        // Add high score if available
        const highScore = localStorage.getItem('flappyKiroHighScore') || 0;
        if (this.score > 0 || highScore > 0) {
            this.ctx.font = '12px Courier New';
            this.ctx.fillStyle = '#cbb279';
            this.ctx.fillText(`Best: ${Math.max(this.score, highScore)}`, 20, 55);
        }
        
        // Reset shadow
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }
    
    // New desert-themed pipes
    drawStars() {
        // Generate consistent star positions based on fixed seed
        const starCount = 80;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        
        for (let i = 0; i < starCount; i++) {
            // Use deterministic positions so stars don't jump around
            const x = (i * 123.456) % this.canvas.width;
            const y = (i * 78.901) % (this.canvas.height * 0.6); // Only in upper 60% of sky
            
            // Tiny star size (1-2 pixels)
            const size = 0.5 + (i % 3) * 0.5;
            
            // Subtle twinkling effect
            const twinkle = Math.sin((Date.now() * 0.001) + i) * 0.3 + 0.7;
            this.ctx.globalAlpha = twinkle * 0.6;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1; // Reset alpha
    }
    
    drawPipes() {
        for (const pipe of this.pipes) {

            // Main tower color (darker sandstone)
            this.ctx.fillStyle = '#8B7355';  // Darker brown-sand color
            this.ctx.strokeStyle = '#5D4E37';  // Dark olive brown
            this.ctx.lineWidth = 3;

            // Top tower
            this.ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            this.ctx.strokeRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);

            // Bottom tower
            this.ctx.fillRect(
                pipe.x,
                pipe.bottomY,
                this.pipeWidth,
                pipe.bottomHeight
            );
            this.ctx.strokeRect(
                pipe.x,
                pipe.bottomY,
                this.pipeWidth,
                pipe.bottomHeight
            );

            // Decorative caps (darker tone)
            this.ctx.fillStyle = '#6B5B47';  // Darker cap color

            // Top cap
            this.ctx.fillRect(
                pipe.x - 6,
                pipe.topHeight - 25,
                this.pipeWidth + 12,
                25
            );

            // Bottom cap
            this.ctx.fillRect(
                pipe.x - 6,
                pipe.bottomY,
                this.pipeWidth + 12,
                25
            );
            
            // Add traditional Saudi geometric patterns
            this.drawSaudiPattern(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            this.drawSaudiPattern(pipe.x, pipe.bottomY, this.pipeWidth, pipe.bottomHeight);
        }
    }
    
    drawSaudiPattern(x, y, width, height) {
        this.ctx.strokeStyle = '#4A3728'; // Much darker brown for pattern
        this.ctx.lineWidth = 1;
        
        const patternSize = 16;
        
        // Draw geometric Islamic pattern
        for (let px = x + 8; px < x + width - 8; px += patternSize) {
            for (let py = y + 8; py < y + height - 8; py += patternSize) {
                // Skip if pattern would go outside bounds
                if (px + patternSize > x + width - 8 || py + patternSize > y + height - 8) continue;
                
                // Draw traditional Islamic geometric star pattern
                const centerX = px + patternSize / 2;
                const centerY = py + patternSize / 2;
                const size = patternSize / 3;
                
                // 8-pointed star (Khatam)
                this.ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 4;
                    const radius = i % 2 === 0 ? size : size * 0.6;
                    const starX = centerX + Math.cos(angle) * radius;
                    const starY = centerY + Math.sin(angle) * radius;
                    
                    if (i === 0) {
                        this.ctx.moveTo(starX, starY);
                    } else {
                        this.ctx.lineTo(starX, starY);
                    }
                }
                this.ctx.closePath();
                this.ctx.stroke();
                
                // Small decorative circles at corners
                const cornerRadius = 1;
                this.ctx.beginPath();
                this.ctx.arc(px + 2, py + 2, cornerRadius, 0, Math.PI * 2);
                this.ctx.stroke();
            }
        }
        
        // Add vertical decorative lines (traditional column effect)
        this.ctx.strokeStyle = '#3D2F1F'; // Even darker for column lines
        this.ctx.lineWidth = 1;
        const lineSpacing = width / 4;
        for (let i = 1; i < 4; i++) {
            const lineX = x + lineSpacing * i;
            this.ctx.beginPath();
            this.ctx.moveTo(lineX, y + 10);
            this.ctx.lineTo(lineX, y + height - 10);
            this.ctx.stroke();
        }
    }
    
    drawGhost() {
        this.ctx.save();
        
        const rotation = Math.max(
            -0.5,
            Math.min(0.5, this.ghost.velocity * 0.05)
        );
        
        this.ctx.translate(
            this.ghost.x + this.ghost.width / 2,
            this.ghost.y + this.ghost.height / 2
        );
        this.ctx.rotate(rotation);

        // Add subtle white glow to make Kiro pop
        this.ctx.shadowColor = 'rgba(255,255,255,0.6)';
        this.ctx.shadowBlur = 15;
        
        // Draw the Saudi ghost character
        // Ghost body (white)
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 2;
        
        // Ghost body shape
        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.ghost.width / 2, 0, Math.PI, true); // Top half circle
        this.ctx.lineTo(-this.ghost.width / 2, this.ghost.height / 2 - 10);
        
        // Wavy bottom edge
        for (let i = 0; i <= 4; i++) {
            const x = (-this.ghost.width / 2) + (i * this.ghost.width / 4);
            const y = this.ghost.height / 2 + (i % 2 === 0 ? -5 : 5);
            this.ctx.lineTo(x, y);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Draw eyes
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.ellipse(-8, -5, 6, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.ellipse(8, -5, 6, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw Saudi keffiyeh (headscarf)
        // Black agal (headband) first
        this.ctx.fillStyle = '#2c2c2c';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        
        // Top agal band
        this.ctx.fillRect(-this.ghost.width / 2 + 5, -this.ghost.height / 2 + 8, this.ghost.width - 10, 6);
        this.ctx.strokeRect(-this.ghost.width / 2 + 5, -this.ghost.height / 2 + 8, this.ghost.width - 10, 6);
        
        // Bottom agal band
        this.ctx.fillRect(-this.ghost.width / 2 + 5, -this.ghost.height / 2 + 18, this.ghost.width - 10, 6);
        this.ctx.strokeRect(-this.ghost.width / 2 + 5, -this.ghost.height / 2 + 18, this.ghost.width - 10, 6);
        
        // Red and white checkered keffiyeh pattern
        const checkSize = 4;
        const keffiyehTop = -this.ghost.height / 2;
        const keffiyehHeight = 25;
        
        for (let x = -this.ghost.width / 2; x < this.ghost.width / 2; x += checkSize) {
            for (let y = keffiyehTop; y < keffiyehTop + keffiyehHeight; y += checkSize) {
                // Skip the agal band areas
                if ((y >= keffiyehTop + 8 && y < keffiyehTop + 14) || 
                    (y >= keffiyehTop + 18 && y < keffiyehTop + 24)) {
                    continue;
                }
                
                const checkX = Math.floor((x + this.ghost.width / 2) / checkSize);
                const checkY = Math.floor((y - keffiyehTop) / checkSize);
                
                if ((checkX + checkY) % 2 === 0) {
                    this.ctx.fillStyle = '#dc143c'; // Red
                } else {
                    this.ctx.fillStyle = 'white';
                }
                
                this.ctx.fillRect(x, y, checkSize, checkSize);
            }
        }
        
        // Draw keffiyeh flowing sides
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 1;
        
        // Left side drape
        this.ctx.beginPath();
        this.ctx.moveTo(-this.ghost.width / 2, keffiyehTop + 25);
        this.ctx.quadraticCurveTo(-this.ghost.width / 2 - 15, 5, -this.ghost.width / 2 - 10, 20);
        this.ctx.quadraticCurveTo(-this.ghost.width / 2 - 5, 25, -this.ghost.width / 2, 15);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Right side drape
        this.ctx.beginPath();
        this.ctx.moveTo(this.ghost.width / 2, keffiyehTop + 25);
        this.ctx.quadraticCurveTo(this.ghost.width / 2 + 15, 5, this.ghost.width / 2 + 10, 20);
        this.ctx.quadraticCurveTo(this.ghost.width / 2 + 5, 25, this.ghost.width / 2, 15);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Add checkered pattern to side drapes
        for (let side of [-1, 1]) {
            for (let x = 0; x < 15; x += checkSize) {
                for (let y = 0; y < 20; y += checkSize) {
                    const checkX = Math.floor(x / checkSize);
                    const checkY = Math.floor(y / checkSize);
                    
                    if ((checkX + checkY) % 2 === 0) {
                        this.ctx.fillStyle = '#dc143c';
                    } else {
                        this.ctx.fillStyle = 'white';
                    }
                    
                    const actualX = side > 0 ? this.ghost.width / 2 + x : -this.ghost.width / 2 - x - checkSize;
                    const actualY = keffiyehTop + 25 + y;
                    
                    // Simple rectangular pattern for drapes
                    if (x < 12 && y < 18) {
                        this.ctx.fillRect(actualX, actualY, checkSize, checkSize);
                    }
                }
            }
        }
        
        this.ctx.restore();
    }
    
    drawLevelSelection() {
        // Dark overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Title
        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 36px Courier New';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('FLAPPY KIRO', this.canvas.width / 2, 80);
        
        // Subtitle
        this.ctx.font = '18px Courier New';
        this.ctx.fillStyle = '#cbb279';
        this.ctx.fillText('Choose Your Difficulty Level', this.canvas.width / 2, 110);
        
        // Level buttons - vertical layout
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = (this.canvas.width - buttonWidth) / 2;
        const startY = 150;
        const spacing = 80;
        
        const levels = ['beginner', 'intermediate', 'expert'];
        const colors = ['#8B7355', '#6B5B47', '#4A3728'];
        
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            const config = this.levelConfig[level];
            const y = startY + i * spacing;
            
            // Button background
            this.ctx.fillStyle = colors[i];
            this.ctx.fillRect(buttonX, y, buttonWidth, buttonHeight);
            
            // Button border
            this.ctx.strokeStyle = '#cbb279';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(buttonX, y, buttonWidth, buttonHeight);
            
            // Button text
            this.ctx.fillStyle = 'white';
            this.ctx.font = 'bold 20px Courier New';
            this.ctx.fillText(config.name, buttonX + buttonWidth / 2, y + 30);
            
            // Level details
            this.ctx.font = '12px Courier New';
            this.ctx.fillStyle = '#E6D3A3';
            this.ctx.fillText(`Gap: ${config.pipeGap}px • Speed: ${config.gameSpeed}`, buttonX + buttonWidth / 2, y + 50);
        }
        
        // Instructions
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Courier New';
        this.ctx.fillText('Press 1, 2, or 3 • Or click a level', this.canvas.width / 2, 420);
        
        // Level descriptions
        this.ctx.font = '12px Courier New';
        this.ctx.fillStyle = '#cbb279';
        this.ctx.fillText('🟤 Beginner: Large gaps, gentle physics', this.canvas.width / 2, 450);
        this.ctx.fillText('🟫 Intermediate: Balanced gameplay', this.canvas.width / 2, 470);
        this.ctx.fillText('⬛ Expert: Tight gaps, fast & challenging', this.canvas.width / 2, 490);
        
        // Add decorative Saudi pattern elements
        this.drawLevelDecorations();
        
        this.ctx.textAlign = 'left';
    }
    
    drawLevelDecorations() {
        // Add small decorative Saudi patterns in corners
        this.ctx.strokeStyle = '#8B7355';
        this.ctx.lineWidth = 1;
        
        // Top corners
        for (let corner of [{x: 50, y: 50}, {x: this.canvas.width - 80, y: 50}]) {
            // Simple 8-pointed star
            this.ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                const radius = i % 2 === 0 ? 15 : 8;
                const x = corner.x + Math.cos(angle) * radius;
                const y = corner.y + Math.sin(angle) * radius;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }
    
    drawStartMessage() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        this.ctx.fillRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );
        
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        
        this.ctx.font = 'bold 48px Courier New';
        this.ctx.fillText(
            'FLAPPY KIRO',
            this.canvas.width / 2,
            this.canvas.height / 2 - 80
        );
        
        this.ctx.font = '22px Courier New';
        this.ctx.fillStyle = '#e6d3a3';
        this.ctx.fillText(
            'Fly Kiro through the desert skies',
            this.canvas.width / 2,
            this.canvas.height / 2 - 30
        );
        
        this.ctx.font = '20px Courier New';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(
            'Press SPACE or Click to Start',
            this.canvas.width / 2,
            this.canvas.height / 2 + 20
        );
        
        this.ctx.textAlign = 'left';
    }
    
    gameLoop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
}

window.addEventListener('load', () => {
    new FlappyKiro();
});

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const heatBtn = document.getElementById('heatBtn');
const resetBtn = document.getElementById('resetBtn');
const checkH2 = document.getElementById('checkH2');
const checkN2 = document.getElementById('checkN2');

let particles = [];
const particleCount = 100; // Total count per active gas

const gases = {
    H2: { mass: 1, radius: 4, speed: 6.5 },
    N2: { mass: 14, radius: 8, speed: 1.8 }
};

class Particle {
    constructor(x, y, vx, vy, type) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.type = type;
        this.mass = gases[type].mass;
        this.radius = gases[type].radius;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Collision with Cold Wall (Right)
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -0.3; // Dramatic cooling
        }
        // Top/Bottom
        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
            this.vy *= -1;
            this.y = this.y < this.radius ? this.radius : canvas.height - this.radius;
        }
        // Left Wall
        if (this.x - this.radius < 0) {
            this.vx *= -1;
            this.x = this.radius;
        }
    }

    draw() {
        const speedSq = this.vx * this.vx + this.vy * this.vy;
        const ke = 0.5 * this.mass * speedSq;
        // Map color: Cold (Blue) to Hot (Red)
        const hue = Math.max(220 - (ke * 10), 0);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.stroke();
    }
}

function injectGas() {
    particles = [];
    if (checkH2.checked) addGases('H2');
    if (checkN2.checked) addGases('N2');
}

function addGases(type) {
    const config = gases[type];
    for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * (canvas.width * 0.4) + (canvas.width * 0.3);
        const y = Math.random() * (canvas.height - 20) + 10;
        const angle = Math.random() * Math.PI * 2;
        particles.push(new Particle(x, y, Math.cos(angle) * config.speed, Math.sin(angle) * config.speed, type));
    }
}

function injectHeat() {
    particles.forEach(p => {
        if (p.x < canvas.width * 0.3) {
            const boost = p.type === 'H2' ? 15 : 5;
            p.vx += boost; 
        }
    });
}

function checkCollisions() {
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i];
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const minDist = p1.radius + p2.radius;

            if (dist < minDist) {
                const nx = dx / dist;
                const ny = dy / dist;
                const rvx = p1.vx - p2.vx;
                const rvy = p1.vy - p2.vy;
                const velNormal = rvx * nx + rvy * ny;
                if (velNormal > 0) continue;

                const impulse = -(2 * velNormal) / (1/p1.mass + 1/p2.mass);
                p1.vx += (impulse * nx) / p1.mass;
                p1.vy += (impulse * ny) / p1.mass;
                p2.vx -= (impulse * nx) / p2.mass;
                p2.vy -= (impulse * ny) / p2.mass;
            }
        }
    }
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    checkCollisions();
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(update);
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - document.getElementById('controls').offsetHeight;
    injectGas();
}

window.addEventListener('resize', resize);
heatBtn.addEventListener('click', injectHeat);
resetBtn.addEventListener('click', injectGas);

resize();
update();

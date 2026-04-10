const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const heatBtn = document.getElementById('heatBtn');
const resetBtn = document.getElementById('resetBtn');
const checkH2 = document.getElementById('checkH2');
const checkN2 = document.getElementById('checkN2');

let particles = [];
const baseCount = 80; // Particles per gas type

const gases = {
    H2: { mass: 1, radius: 4, speed: 7.0 },
    N2: { mass: 14, radius: 9, speed: 1.8 }
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

        // Cold Sink (Right Wall) - Removes energy
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -0.3; 
            this.vy *= 0.8;
        }
        // Top and Bottom (Adiabatic)
        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
            this.vy *= -1;
            this.y = this.y < this.radius ? this.radius : canvas.height - this.radius;
        }
        // Left Wall (Standard Bounce)
        if (this.x - this.radius < 0) {
            this.vx *= -1;
            this.x = this.radius;
        }
    }

    draw() {
        const speedSq = this.vx * this.vx + this.vy * this.vy;
        const ke = 0.5 * this.mass * speedSq;
        
        // Heat Map: Blue (Cold) -> Red (Hot)
        // Normalize based on molecule speed to keep colors consistent
        const normFactor = this.type === 'H2' ? 25 : 5;
        const hue = Math.max(220 - (ke * (10 / normFactor)), 0);
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

function injectGas() {
    particles = []; // Clear current simulation
    
    if (checkH2.checked) addGases('H2');
    if (checkN2.checked) addGases('N2');
    
    // Safety check: if neither is checked, add H2 by default
    if (!checkH2.checked && !checkN2.checked) {
        checkH2.checked = true;
        addGases('H2');
    }
}

function addGases(type) {
    const config = gases[type];
    for (let i = 0; i < baseCount; i++) {
        const x = Math.random() * (canvas.width * 0.4) + (canvas.width * 0.3);
        const y = Math.random() * (canvas.height - 20) + 10;
        const angle = Math.random() * Math.PI * 2;
        particles.push(new Particle(x, y, Math.cos(angle) * config.speed, Math.sin(angle) * config.speed, type));
    }
}

function injectHeat() {
    particles.forEach(p => {
        // Only heat particles currently on the left side
        if (p.x < canvas.width * 0.3) {
            const boost = p.type === 'H2' ? 12 : 4;
            p.vx += boost; 
            p.vy += (Math.random() - 0.5) * 5;
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
                // Conservation of Momentum (Elastic Collision)
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

function

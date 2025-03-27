class WaterLineAnimation {
    constructor(selector, config = {}) {
        this.svg = document.querySelector(selector);
        if (!this.svg) return;
        this.path = this.svg.querySelector('path');

        this.config = {
            width: 100,
            baseHeight: 50,
            numPoints: 100,
            waveLength: 60,
            baseSpeed: 5,
            spring: 0.12,
            damping: 0.9,
            scrollSensitivity: 10,
            // Default multipliers – adjust to taste:
            mouseMultiplier: 12,
            scrollMultiplier: 8,
            ...config
        };

        // Initial state values
        this.state = {
            points: [],
            time: 0,
            mouseX: 0,
            lastMouseX: 0,
            lastMouseY: 0,
            scrollY: 0,
            mouseSpeed: 0,
            scrollSpeed: 0,
            isMoving: false,
            isScrolling: false,
            hoverIntensity: 0,
            scrollIntensity: 0,
            isAnimating: false
        };

        this.initPoints();
        this.bindEvents();
    }

    // Create evenly spaced points across the width
    initPoints() {
        const { width, baseHeight, numPoints } = this.config;
        this.state.points = Array.from({ length: numPoints }, (_, i) => ({
            x: (width / (numPoints - 1)) * i,
            y: baseHeight,
            targetY: baseHeight,
            velocity: 0
        }));
    }

    // Build a smooth SVG path, using a cubic Bézier interpolation
    createPath() {
        return this.state.points
            .map((p, i, arr) => {
                if (i === 0) return `M ${p.x} ${p.y}`;
                const prev = arr[i - 1];
                const dx = p.x - prev.x, tension = 0.1;
                return `C ${prev.x + dx * tension} ${prev.y} ${prev.x + dx * (1 - tension)} ${p.y} ${p.x} ${p.y}`;
            })
            .join(' ');
    }

    // Calculate the wave effect offset for a given x-coordinate.
    getWaveOffset(x) {
        const {
            waveLength,
            baseSpeed,
            scrollSensitivity,
            mouseMultiplier,
            scrollMultiplier
        } = this.config;
        const { mouseX, mouseSpeed, scrollY, scrollSpeed, time, hoverIntensity, scrollIntensity } = this.state;
        const distance = Math.abs(x - mouseX);
        const speed = baseSpeed + mouseSpeed * 0.5;
        const decay = Math.exp(-distance / 35) * (1 + mouseSpeed * 0.2);

        const mouseWave = Math.sin(((x - mouseX) / waveLength) * Math.PI * 2 + time * speed) * decay;
        const secondary = Math.sin(
            ((x - mouseX) / (waveLength * 1.5)) * Math.PI * 2 - time * (speed * 0.7)
        ) * decay * 0.3;
        const mouseEffect = mouseWave + secondary;

        const scrollEffect =
            Math.sin((x / waveLength) * Math.PI * 2 + scrollY * scrollSensitivity) *
            0.5 *
            scrollSpeed;

        return (mouseEffect * mouseMultiplier * hoverIntensity) +
            (scrollEffect * scrollMultiplier * scrollIntensity);
    }

    // The main animation loop – using an arrow function to preserve "this"
    animate = timestamp => {
        const { baseHeight, spring, damping } = this.config;
        this.state.time = timestamp * 0.001;

        // Smooth transitions for intensities (for hover and scroll)
        this.state.hoverIntensity += ((this.state.isMoving ? 1 : 0) - this.state.hoverIntensity) * 0.5;
        this.state.scrollIntensity += ((this.state.isScrolling ? 1 : 0) - this.state.scrollIntensity) * 0.5;

        // Calculate mouse movement speed with a small cap
        this.state.mouseSpeed = Math.min(
            Math.abs(this.state.mouseX - this.state.lastMouseX) * 0.01,
            10
        );
        this.state.lastMouseX = this.state.mouseX;

        let needsUpdate = Math.abs(this.state.hoverIntensity) > 0.001 ||
            Math.abs(this.state.scrollIntensity) > 0.001;

        // Update each point’s target position by applying the wave effect
        this.state.points.forEach(p => {
            p.targetY = baseHeight + this.getWaveOffset(p.x);
            const acceleration = (p.targetY - p.y) * spring;
            p.velocity = (p.velocity + acceleration) * damping;
            if (Math.abs(p.velocity) > 0.01 || Math.abs(p.targetY - p.y) > 0.01) {
                p.y += p.velocity;
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            this.path.setAttribute('d', this.createPath());
            requestAnimationFrame(this.animate);
        } else {
            this.state.isAnimating = false;
            this.state.isMoving = false;
            this.state.isScrolling = false;
        }
    };

    // Bind mouse and scroll events.
    bindEvents() {
        let moveTimer, scrollTimer;

        const handleMouseMove = e => {
            const rect = this.svg.getBoundingClientRect();
            const currentMouseX = ((e.clientX - rect.left) / rect.width) * this.config.width;
            const currentMouseY = e.clientY - rect.top;
            // Only update if there is an actual change
            if (
                currentMouseX !== this.state.lastMouseX ||
                currentMouseY !== this.state.lastMouseY
            ) {
                this.state.mouseX = currentMouseX;
                this.state.isMoving = true;
                clearTimeout(moveTimer);
                moveTimer = setTimeout(() => (this.state.isMoving = false), 100);
                if (!this.state.isAnimating) {
                    this.state.isAnimating = true;
                    requestAnimationFrame(this.animate);
                }
                this.state.lastMouseX = currentMouseX;
                this.state.lastMouseY = currentMouseY;
            }
        };

        const handleScroll = () => {
            const currentScroll = window.scrollY;
            this.state.scrollSpeed = Math.min(
                Math.abs(currentScroll - this.state.scrollY) * 0.01,
                10
            );
            this.state.scrollY = currentScroll;
            this.state.isScrolling = true;
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => (this.state.isScrolling = false), 200);
            if (!this.state.isAnimating) {
                this.state.isAnimating = true;
                requestAnimationFrame(this.animate);
            }
        };

        // Bind both mousemove and mouseenter to the same handler.
        this.svg.addEventListener('mousemove', handleMouseMove);
        this.svg.addEventListener('mouseenter', handleMouseMove);
        this.svg.addEventListener('mouseleave', () => {
            this.state.isMoving = false;
        });
        window.addEventListener('scroll', handleScroll);
    }
}

// Initialize the water line with custom configuration if needed.
const waterLine = new WaterLineAnimation('.water-line', {
    width: 100,
    baseHeight: 50,
    numPoints: 100,
    scrollSensitivity: 1
});


/* Mobile project tile effect
   Only for small screens (width < 400px) – toggles image opacity on intersection */
document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth < 400) {
        document.querySelectorAll('.project-tile').forEach(tile => {
            const images = tile.querySelectorAll('.project-cover img');
            const observer = new IntersectionObserver(entries => {
                entries.forEach(({ isIntersecting }) => {
                    images[0].style.opacity = isIntersecting ? '1' : '0';
                    images[1].style.opacity = isIntersecting ? '0' : '1';
                });
            }, { threshold: 0.8 });
            observer.observe(tile);
        });
    }
});

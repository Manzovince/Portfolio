export { hsvToRGB }

// Hue to RGB
function hsvToRGB(h, s = 1.0, v = 1.0) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

export function getScaleNotes(scaleName) {
    const scales = {
        C_major: [60, 62, 64, 65, 67, 69, 71], // C4 to B4
        A_minor: [57, 59, 60, 62, 64, 65, 67], // A3 to G4
        G_major: [55, 57, 59, 60, 62, 64, 66],
        D_minor: [50, 52, 53, 55, 57, 58, 60]
    };
    const base = scaleName.includes("minor") ? 21 : 24; // optional transposition
    return (scales[scaleName] || []).flatMap(n => {
        // Expand across all octaves
        const notes = [];
        for (let o = -2; o <= 4; o++) {
            const transposed = n + o * 12;
            if (transposed >= 21 && transposed <= 108) notes.push(transposed);
        }
        return notes;
    });
}

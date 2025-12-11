const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size, filename) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Фон
    ctx.fillStyle = '#006400';
    ctx.fillRect(0, 0, size, size);
    
    // Белый круг
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size*0.4, 0, Math.PI * 2);
    ctx.fill();
    
    // Грузовик
    ctx.fillStyle = '#006400';
    
    // Кузов
    ctx.fillRect(size*0.2, size*0.45, size*0.6, size*0.3);
    
    // Кабина
    ctx.fillRect(size*0.65, size*0.35, size*0.2, size*0.4);
    
    // Колеса
    ctx.beginPath();
    ctx.arc(size*0.3, size*0.8, size*0.12, 0, Math.PI * 2);
    ctx.arc(size*0.7, size*0.8, size*0.12, 0, Math.PI * 2);
    ctx.fill();
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`icons/${filename}`, buffer);
    console.log(`Создана иконка: ${filename}`);
}

// Создаем папку icons
if (!fs.existsSync('icons')) {
    fs.mkdirSync('icons');
}

// Создаем иконки
createIcon(72, 'icon-72x72.png');
createIcon(192, 'icon-192x192.png');
createIcon(512, 'icon-512x512.png');
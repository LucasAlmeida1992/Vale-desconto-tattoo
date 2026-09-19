// ELEMENTOS PRINCIPAIS
const canvas = document.getElementById('scratch-canvas');
const ctx = canvas.getContext('2d');
const scratchSound = document.getElementById('som-raspar');
const confettiSound = document.getElementById('som-confete'); 
const openBoxSound = document.getElementById('som-abrir-caixa'); // SOM TESOURA

const prizeContent = document.querySelector('.prize-content');
const prizeContainer = document.querySelector('.scratch-wrapper');

const giftBox = document.getElementById('gift-box');
let giftBoxOpened = false; 

let confettiTriggered = false;
const WIN_THRESHOLD = 50; 

let isDrawing = false;
let lastPosition = null;
let isResizingAllowed = true;

// Flag para evitar raspagem imediata após a abertura da caixa
let isProtectedFromTouch = false;

// =============================
// SALVAR ESTADO
// =============================
function saveCanvasState() {
    const dataURL = canvas.toDataURL();
    sessionStorage.setItem('canvasState', dataURL);
}

// =============================
// CAMADA RASPÁVEL
// =============================
function setupCanvas() {
    const silverGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    silverGradient.addColorStop(0, '#c0c0c0');
    silverGradient.addColorStop(0.5, '#a9a9a9');
    silverGradient.addColorStop(1, '#c0c0c0');
    ctx.fillStyle = silverGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fontSize = canvas.height / 3;
    ctx.fillStyle = '#3f3020';
    ctx.font = `700 ${fontSize}px 'Oswald', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RASPE AQUI', canvas.width / 2, canvas.height / 2);

    saveCanvasState();
}

// =============================
// POSIÇÃO MOUSE / TOQUE
// =============================
function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}
function getTouchPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].top - rect.top) * scaleY };
}

// =============================
// FUNÇÃO DE RASPAR
// =============================
function scratch(x, y) {
    ctx.globalCompositeOperation = 'destination-out';
    const scratchRadiusBase = canvas.width / 40;
    const scratchRandom = canvas.width / 25;
    for (let i = 0; i < 20; i++) {
        const radius = scratchRadiusBase + Math.random() * (scratchRadiusBase / 2);
        const offsetX = Math.random() * scratchRandom - (scratchRandom / 2);
        const offsetY = Math.random() * scratchRandom - (scratchRandom / 2);
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// =============================
// DESENHAR LINHA CONTÍNUA
// =============================
function drawScratchLine(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const stepSize = canvas.width / 50;
    if (distance < stepSize) {
        scratch(to.x, to.y);
        return;
    }
    const steps = distance / stepSize;
    const stepX = dx / steps;
    const stepY = dy / steps;
    for (let i = 1; i < steps; i++) {
        const x = from.x + stepX * i;
        const y = from.y + stepY * i;
        scratch(x, y);
    }
    scratch(to.x, to.y);
    
    saveCanvasState(); 
    checkScratchCompletion();
}

// =============================
// SOM
// =============================
function playSound() { 
    if (scratchSound.paused) {
        scratchSound.currentTime = 0; 
        scratchSound.play().catch(() => {}); 
    }
}
function stopSound() { 
    scratchSound.pause(); 
    scratchSound.currentTime = 0; 
}

function playOpenBoxSound() {
    if (openBoxSound) {
        openBoxSound.volume = 0; 
        openBoxSound.currentTime = 0;
        
        openBoxSound.play().then(() => {
            openBoxSound.volume = 1; 
        }).catch(error => {
            openBoxSound.volume = 1;
            openBoxSound.play().catch(() => {});
        });
    }
}

// =============================
// ABRIR CAIXA DE PRESENTE
// =============================
function openGiftBox() {
    if (sessionStorage.getItem('giftBoxOpenedThisSession')) {
        return;
    }
    
    if (giftBoxOpened) return;

    sessionStorage.setItem('giftBoxOpenedThisSession', 'true');

    playOpenBoxSound();

    giftBox.removeEventListener('click', openGiftBox);
    giftBox.removeEventListener('touchstart', openGiftBox);

    giftBox.classList.add('opened'); 
    
    isProtectedFromTouch = true;
    
    setTimeout(() => {
        isProtectedFromTouch = false;
    }, 300);

    setTimeout(() => {
        giftBox.classList.add('hidden');
        giftBox.style.pointerEvents = 'none'; 
    }, 1000); 

    giftBoxOpened = true; 
}

// =============================
// EVENTOS
// =============================
window.addEventListener('mouseup', () => { isDrawing = false; stopSound(); lastPosition = null; isResizingAllowed = true; });

giftBox.addEventListener('click', openGiftBox);
giftBox.addEventListener('touchstart', openGiftBox);

canvas.addEventListener('mousedown', (e) => { 
    if (!giftBoxOpened || isProtectedFromTouch) return; 
    
    isDrawing = true; 
    isResizingAllowed = false; 
    playSound();
    lastPosition = getMousePos(e); 
    scratch(lastPosition.x, lastPosition.y); 
});

canvas.addEventListener('mouseenter', (e) => {
    if (!giftBoxOpened || isProtectedFromTouch) return; 

    if (e.buttons === 1) { 
        isDrawing = true;
        isResizingAllowed = false;
        playSound();
        lastPosition = getMousePos(e); 
    }
});

canvas.addEventListener('mousemove', (e) => { 
    if (!isDrawing) return; 
    const currentPos = getMousePos(e); 
    if (lastPosition) drawScratchLine(lastPosition, currentPos); 
    lastPosition = currentPos; 
});

canvas.addEventListener('mouseout', () => { stopSound(); lastPosition = null; });

canvas.addEventListener('touchstart', (e) => { 
    if (!giftBoxOpened) {
        openGiftBox();
        e.preventDefault();
        return;
    }
    
    if (isProtectedFromTouch) {
        e.preventDefault();
        return;
    }
    
    e.preventDefault(); 
    isDrawing = true; 
    isResizingAllowed = false; 
    
    playSound(); 
    
    lastPosition = getTouchPos(e); 
    scratch(lastPosition.x, lastPosition.y); 
}, { passive: false });

canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!isDrawing) return; const currentPos = getTouchPos(e); if (lastPosition) drawScratchLine(lastPosition, currentPos); lastPosition = currentPos; }, { passive: false });
canvas.addEventListener('touchend', () => { isDrawing = false; stopSound(); lastPosition = null; isResizingAllowed = true; });
canvas.addEventListener('touchcancel', () => { isDrawing = false; stopSound(); lastPosition = null; isResizingAllowed = true; });

// =============================
// PARAMS DA URL E TRAVA DE ACESSO
// =============================
const urlParams = new URLSearchParams(window.location.search);
const valorParam = urlParams.get('valor');
const genero = urlParams.get('genero');

// SE NÃO HOUVER O PARÂMETRO "VALOR" NA URL, BLOQUEIA A TELA
if (!valorParam) {
    document.body.innerHTML = `
        <div style="
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            background: #111; 
            color: #fff; 
            font-family: sans-serif; 
            text-align: center; 
            padding: 20px;
        ">
            <h2 style="color: #e74c3c;">Link Inválido ou Expirado</h2>
            <p style="color: #aaa; max-width: 400px;">
                Este vale-desconto é exclusivo e só pode ser acessado através de um link de orçamento personalizado enviado no WhatsApp.
            </p>
        </div>
    `;
    throw new Error("Acesso negado: parâmetro 'valor' ausente.");
}

const valorPremioElement = document.getElementById('valor-premio');
const valorMinimoElement = document.getElementById('valor-minimo');
const elementosRegras = document.querySelectorAll('.regras-validez');

// SE FOR PORCENTAGEM (Ex: valor=10% ou valor=15%)
if (valorParam.includes('%')) {
    if (valorPremioElement) {
        valorPremioElement.textContent = `(${valorParam} DE DESCONTO)`;
    }
    // Oculta as regras de valor mínimo quando for porcentagem
    elementosRegras.forEach(el => el.style.display = 'none');
} 
// SE FOR VALOR EM REAIS (Ex: valor=500)
else {
    const valorTattoo = parseFloat(valorParam);
    const percentualDesconto = 0.08; // Alterado para 8%
    const valorDesconto = Math.round(valorTattoo * percentualDesconto);
    const valorMinimo = valorTattoo;

    if (valorPremioElement) {
        valorPremioElement.textContent = `(R$ ${valorDesconto} DE DESCONTO)`;
    }

    if (valorMinimoElement) {
        valorMinimoElement.textContent = `R$ ${valorMinimo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }

    // Garante que a frase de regra continuará visível
    elementosRegras.forEach(el => el.style.display = 'block');
}

// Ajuste do título de acordo com gênero
const tituloElement = document.getElementById('titulo-presente');
if (tituloElement) {
    if (genero === 'a') {
        tituloElement.textContent = 'VOCÊ FOI PRESENTEADA COM UM DESCONTO';
    } else if (genero === 'o') {
        tituloElement.textContent = 'VOCÊ FOI PRESENTEADO COM UM DESCONTO';
    }
}

// =============================
// REDIMENSIONAMENTO
// =============================
function resizeAndSetupCanvas(force = false) {
    if (!isResizingAllowed && !force) return;
    const containerWidth = prizeContainer.clientWidth;
    const containerHeight = prizeContainer.clientHeight;
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    prizeContent.style.visibility = 'visible';
    const savedCanvas = sessionStorage.getItem('canvasState');
    if (savedCanvas) {
        const img = new Image();
        img.onload = function () { ctx.drawImage(img, 0, 0, canvas.width, canvas.height); };
        img.src = savedCanvas;
    } else setupCanvas();
}
function debounce(func, wait = 100) {
    let timeout;
    return function (...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
}
window.addEventListener('resize', debounce(() => resizeAndSetupCanvas(), 150));

// =============================
// DETECTAR CONCLUSÃO E CONFETE
// =============================
function checkScratchCompletion() {
    if (typeof confetti === 'undefined' || confettiTriggered) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparentPixels++;
    }

    const totalPixels = canvas.width * canvas.height;
    const percentCleared = (transparentPixels / totalPixels) * 100;

    if (percentCleared > WIN_THRESHOLD) {
        confettiTriggered = true;
        startConfetti();
    }
}

function startConfetti() {
    if (confettiSound) {
        confettiSound.volume = 0.3;
        confettiSound.currentTime = 0;
        confettiSound.play().catch(() => {});
    }

    const rect = prizeContainer.getBoundingClientRect();
    const originX = (rect.left + rect.width / 2) / window.innerWidth;
    const originY = (rect.top + rect.height / 2) / window.innerHeight;

    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    
    const defaults = { 
        startVelocity: 35,
        ticks: 60, 
        zIndex: 2000,
        colors: ['#ff0a54', '#ff477e', '#ff7096', '#ff85a1', '#fbb1bd', '#f9bec7', '#00b0ff', '#ffeb3b', '#4caf50', '#9c27b0']
    };

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        
        confetti(Object.assign({}, defaults, {
            particleCount: 20,
            origin: { x: originX, y: originY },
            angle: 90, 
            spread: 360,
            startVelocity: 25,
            decay: 0.94
        }));

        confetti(Object.assign({}, defaults, {
            particleCount: 15,
            origin: { x: originX, y: originY },
            angle: 120,
            spread: 60,
            startVelocity: 60 
        }));

        confetti(Object.assign({}, defaults, {
            particleCount: 15,
            origin: { x: originX, y: originY },
            angle: 60,
            spread: 60,
            startVelocity: 60
        }));
    }, 200);
}

// =============================
// INICIALIZAR
// =============================
function init() {
    if (sessionStorage.getItem('giftBoxOpenedThisSession')) {
        giftBox.style.opacity = '0';
        giftBox.style.pointerEvents = 'none';
        giftBoxOpened = true; 
        
        giftBox.removeEventListener('click', openGiftBox);
        giftBox.removeEventListener('touchstart', openGiftBox);
    }
    
    resizeAndSetupCanvas(true);
}

init();

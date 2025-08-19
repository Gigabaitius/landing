// Frontend-only версия для Netlify (без backend)
// Admin functionality
let isAdminMode = false;
let nextCardId = 7;
let nextWorkId = 5;
let nextLogoId = 6;

// Check for admin access
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('admin') === 'true') {
    document.getElementById('adminPanel').style.display = 'block';
}

// Функция показа спиннера загрузки
function showLoading(show = true) {
    const spinner = document.getElementById('loadingSpinner');
    spinner.style.display = show ? 'block' : 'none';
}

function toggleAdminMode() {
    isAdminMode = !isAdminMode;
    document.body.classList.toggle('admin-mode', isAdminMode);
    
    // Enable/disable content editing
    const editables = document.querySelectorAll('.editable');
    editables.forEach(el => {
        el.contentEditable = isAdminMode;
    });
    
    updateCarousels();
}

// Frontend-only загрузка изображения (через FileReader)
function uploadImageLocal(file) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            reject(new Error('Неверный тип файла'));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result); // возвращаем data URL
        };
        reader.onerror = function() {
            reject(new Error('Ошибка чтения файла'));
        };
        reader.readAsDataURL(file);
    });
}

// Сохранение в localStorage (вместо сервера)
function saveAllChanges() {
    showLoading(true);
    
    try {
        const contentData = {
            editableContent: Array.from(document.querySelectorAll('.editable')).map(el => ({
                selector: getElementSelector(el),
                content: el.innerHTML
            })),
            aboutPhoto: document.querySelector('.about-photo img').src,
            bizcards: Array.from(document.querySelectorAll('.bizcard')).map((card, index) => ({
                id: `biz${index + 1}`,
                src: card.querySelector('img').src,
                alt: card.querySelector('img').alt
            })),
            workcards: Array.from(document.querySelectorAll('.work-card')).map((card, index) => ({
                id: `work${index + 1}`,
                src: card.querySelector('img').src,
                alt: card.querySelector('img').alt,
                title: card.querySelector('.work-title').textContent,
                description: card.querySelector('.work-description').textContent,
                link: card.querySelector('.work-btn').href
            })),
            logocards: Array.from(document.querySelectorAll('.logo-card')).map((card, index) => ({
                id: `logo${index + 1}`,
                src: card.querySelector('img').src,
                alt: card.querySelector('img').alt,
                text: card.querySelector('.logo-text').textContent
            })),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('nikadesigner_content', JSON.stringify(contentData));
        
        setTimeout(() => {
            showLoading(false);
            alert('✅ Изменения сохранены локально!\n\n' + 
                  'Время сохранения: ' + new Date().toLocaleString() +
                  '\n\nПримечание: данные сохранены в браузере');
        }, 1000);
        
    } catch (error) {
        showLoading(false);
        alert('❌ Ошибка сохранения: ' + error.message);
    }
}

// Загрузка из localStorage
function loadSavedContent() {
    try {
        const savedData = localStorage.getItem('nikadesigner_content');
        if (savedData) {
            const data = JSON.parse(savedData);
            console.log('Загружен сохраненный контент:', data.timestamp);
            restoreContent(data);
        }
    } catch (error) {
        console.error('Ошибка загрузки контента:', error);
    }
}

// Восстановление контента
function restoreContent(data) {
    // Восстанавливаем тексты
    if (data.editableContent) {
        data.editableContent.forEach(item => {
            const element = document.querySelector(item.selector);
            if (element) {
                element.innerHTML = item.content;
            }
        });
    }
    
    // Восстанавливаем фото "Обо мне"
    if (data.aboutPhoto) {
        const aboutImg = document.querySelector('.about-photo img');
        if (aboutImg) {
            aboutImg.src = data.aboutPhoto;
        }
    }
    
    // Восстанавливаем визитки
    if (data.bizcards) {
        const biztrack = document.getElementById('biztrack');
        const addCard = document.getElementById('addCard');
        
        const oldCards = biztrack.querySelectorAll('.bizcard');
        oldCards.forEach(card => card.remove());
        
        data.bizcards.forEach(cardData => {
            const newCard = document.createElement('div');
            newCard.className = 'bizcard';
            newCard.setAttribute('data-modal', cardData.id);
            
            const img = document.createElement('img');
            img.src = cardData.src;
            img.alt = cardData.alt;
            
            newCard.appendChild(img);
            biztrack.insertBefore(newCard, addCard);
        });
    }
    
    // Восстанавливаем работы
    if (data.workcards) {
        const workstrack = document.getElementById('workstrack');
        const addWorkCard = document.getElementById('addWorkCard');
        
        const oldWorkCards = workstrack.querySelectorAll('.work-card');
        oldWorkCards.forEach(card => card.remove());
        
        data.workcards.forEach(workData => {
            const newCard = document.createElement('div');
            newCard.className = 'work-card tilt';
            
            const img = document.createElement('img');
            img.src = workData.src;
            img.alt = workData.alt;
            
            const content = document.createElement('div');
            content.className = 'work-content';
            content.innerHTML = `
                <h3 class="work-title editable" contenteditable="${isAdminMode}">${workData.title}</h3>
                <p class="work-description editable" contenteditable="${isAdminMode}">${workData.description}</p>
                <a href="${workData.link}" class="work-btn">Открыть проект</a>
            `;
            
            newCard.appendChild(img);
            newCard.appendChild(content);
            workstrack.insertBefore(newCard, addWorkCard);
        });
    }
    
    // Восстанавливаем логотипы
    if (data.logocards) {
        const logostrack = document.getElementById('logostrack');
        const addLogoCard = document.getElementById('addLogoCard');
        
        const oldLogoCards = logostrack.querySelectorAll('.logo-card');
        oldLogoCards.forEach(card => card.remove());
        
        data.logocards.forEach(logoData => {
            const newCard = document.createElement('div');
            newCard.className = 'logo-card';
            
            const imageDiv = document.createElement('div');
            imageDiv.className = 'logo-image';
            
            const img = document.createElement('img');
            img.src = logoData.src;
            img.alt = logoData.alt;
            
            const textDiv = document.createElement('div');
            textDiv.className = 'logo-text editable';
            textDiv.contentEditable = isAdminMode;
            textDiv.textContent = logoData.text;
            
            imageDiv.appendChild(img);
            newCard.appendChild(imageDiv);
            newCard.appendChild(textDiv);
            logostrack.insertBefore(newCard, addLogoCard);
        });
    }
    
    updateCarousels();
}

// Получение селектора элемента
function getElementSelector(element) {
    if (element.id) {
        return '#' + element.id;
    }
    
    let selector = element.tagName.toLowerCase();
    
    if (element.className) {
        selector += '.' + element.className.split(' ').join('.');
    }
    
    const parent = element.parentNode;
    if (parent) {
        const siblings = Array.from(parent.children).filter(child => 
            child.tagName === element.tagName && 
            child.className === element.className
        );
        
        if (siblings.length > 1) {
            const index = siblings.indexOf(element);
            selector += `:nth-of-type(${index + 1})`;
        }
    }
    
    return selector;
}

function updateCarousels() {
    bizcards = document.querySelectorAll('.bizcard');
    workcards = document.querySelectorAll('.work-card');
    logocards = document.querySelectorAll('.logo-card');
    initCardEvents();
    setBizCarouselPosition();
    setWorkCarouselPosition();
    setLogoCarouselPosition();
}

// File upload handlers
document.getElementById('adminUpload').addEventListener('change', function(e) {
    const files = e.target.files;
    
    if (files.length === 1) {
        const fileType = prompt('Куда добавить изображение?\n1 - Визитки\n2 - Работы\n3 - Логотипы');
        
        if (fileType === '1') {
            addNewBizCard(files[0]);
        } else if (fileType === '2') {
            addNewWorkCard(files[0]);
        } else if (fileType === '3') {
            addNewLogo(files[0]);
        }
    } else if (files.length > 1) {
        const fileType = prompt(`Куда добавить ${files.length} изображений?\n1 - Визитки\n2 - Работы\n3 - Логотипы`);
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                if (fileType === '1') {
                    addNewBizCard(file);
                } else if (fileType === '2') {
                    addNewWorkCard(file);
                } else if (fileType === '3') {
                    addNewLogo(file);
                }
            }
        }
    }
    
    e.target.value = '';
});

// About photo upload
document.getElementById('aboutPhotoUpload').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        try {
            const imageUrl = await uploadImageLocal(file);
            document.querySelector('.about-photo img').src = imageUrl;
        } catch (error) {
            alert('Ошибка загрузки фото: ' + error.message);
        }
    }
});

// About photo click handler
document.getElementById('aboutPhoto').addEventListener('click', function() {
    if (isAdminMode) {
        document.getElementById('aboutPhotoUpload').click();
    }
});

async function addNewBizCard(file) {
    if (!file || !file.type.startsWith('image/')) {
        console.error('Неверный тип файла');
        return;
    }
    
    try {
        const imageUrl = await uploadImageLocal(file);
        
        const newCard = document.createElement('div');
        newCard.className = 'bizcard';
        newCard.setAttribute('data-modal', `biz${nextCardId}`);
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = `Business Card ${nextCardId}`;
        
        newCard.appendChild(img);
        
        // Добавляем обработчик для замены изображения
        if (isAdminMode) {
            newCard.addEventListener('click', function() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        try {
                            const newImageUrl = await uploadImageLocal(file);
                            img.src = newImageUrl;
                        } catch (error) {
                            alert('Ошибка замены изображения: ' + error.message);
                        }
                    }
                };
                input.click();
            });
        }
        
        const addCard = document.getElementById('addCard');
        addCard.parentNode.insertBefore(newCard, addCard);
        
        nextCardId++;
        updateCarousels();
        
        console.log('Новая визитка добавлена!');
    } catch (error) {
        alert('Ошибка добавления визитки: ' + error.message);
    }
}

async function addNewWorkCard(file) {
    if (!file || !file.type.startsWith('image/')) {
        console.error('Неверный тип файла');
        return;
    }
    
    try {
        const imageUrl = await uploadImageLocal(file);
        
        const newCard = document.createElement('div');
        newCard.className = 'work-card tilt';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = `Work ${nextWorkId}`;
        
        const content = document.createElement('div');
        content.className = 'work-content';
        content.innerHTML = `
            <h3 class="work-title editable" contenteditable="${isAdminMode}">Новый проект</h3>
            <p class="work-description editable" contenteditable="${isAdminMode}">Описание проекта</p>
            <a href="#" class="work-btn">Открыть проект</a>
        `;
        
        newCard.appendChild(img);
        newCard.appendChild(content);
        
        // Добавляем обработчик для замены изображения
        if (isAdminMode) {
            img.addEventListener('click', function(e) {
                e.stopPropagation();
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async function(event) {
                    const file = event.target.files[0];
                    if (file) {
                        try {
                            const newImageUrl = await uploadImageLocal(file);
                            img.src = newImageUrl;
                        } catch (error) {
                            alert('Ошибка замены изображения: ' + error.message);
                        }
                    }
                };
                input.click();
            });
        }
        
        const addCard = document.getElementById('addWorkCard');
        addCard.parentNode.insertBefore(newCard, addCard);
        
        nextWorkId++;
        updateCarousels();
        
        console.log('Новая работа добавлена!');
    } catch (error) {
        alert('Ошибка добавления работы: ' + error.message);
    }
}

async function addNewLogo(file) {
    if (!file || !file.type.startsWith('image/')) {
        console.error('Неверный тип файла');
        return;
    }
    
    try {
        const imageUrl = await uploadImageLocal(file);
        
        const newCard = document.createElement('div');
        newCard.className = 'logo-card';
        
        const imageDiv = document.createElement('div');
        imageDiv.className = 'logo-image';
        
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = `Logo ${nextLogoId}`;
        
        const textDiv = document.createElement('div');
        textDiv.className = 'logo-text editable';
        textDiv.contentEditable = isAdminMode;
        textDiv.textContent = 'Новый логотип';
        
        imageDiv.appendChild(img);
        newCard.appendChild(imageDiv);
        newCard.appendChild(textDiv);
        
        // Добавляем обработчик для замены изображения
        if (isAdminMode) {
            imageDiv.addEventListener('click', function() {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        try {
                            const newImageUrl = await uploadImageLocal(file);
                            img.src = newImageUrl;
                        } catch (error) {
                            alert('Ошибка замены изображения: ' + error.message);
                        }
                    }
                };
                input.click();
            });
        }
        
        const addCard = document.getElementById('addLogoCard');
        addCard.parentNode.insertBefore(newCard, addCard);
        
        nextLogoId++;
        updateCarousels();
        
        console.log('Новый логотип добавлен!');
    } catch (error) {
        alert('Ошибка добавления логотипа: ' + error.message);
    }
}

// Add card button handlers
document.getElementById('addCard').addEventListener('click', function() {
    const input = document.getElementById('adminUpload');
    input.click();
});

document.getElementById('addWorkCard').addEventListener('click', function() {
    const input = document.getElementById('adminUpload');
    input.click();
});

document.getElementById('addLogoCard').addEventListener('click', function() {
    const input = document.getElementById('adminUpload');
    input.click();
});

// Marquee Animation
let marqueeOffset = 0;
const marquee = document.getElementById('marquee');

function animateMarquee() {
    marqueeOffset += 0.4;
    if (marqueeOffset >= marquee.scrollWidth / 2) {
        marqueeOffset = 0;
    }
    marquee.style.transform = `translateX(-${marqueeOffset}px)`;
    requestAnimationFrame(animateMarquee);
}

// Reveal Animation
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in');
        }
    });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
});

// Tilt Effect
document.querySelectorAll('.tilt').forEach(el => {
    el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        const rotateX = (y / rect.height) * -10;
        const rotateY = (x / rect.width) * 10;
        
        el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    
    el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    });
});

// ИСПРАВЛЕННАЯ КАРУСЕЛЬ - Визитки
const biztrack = document.getElementById('biztrack');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
let bizcards = document.querySelectorAll('.bizcard');
let currentBizIndex = 0;

function setBizCarouselPosition() {
    if (bizcards.length === 0) return;
    
    const cardWidth = bizcards[0].offsetWidth;
    const gap = 20;
    const containerWidth = document.querySelector('.bizviewport').offsetWidth;
    
    const leftPadding = window.innerWidth <= 768 ? 16 : 24;
    const offset = currentBizIndex * (cardWidth + gap);
    
    biztrack.style.transform = `translateX(-${offset}px)`;
}

function clampBizIndex(index) {
    if (bizcards.length === 0) return 0;
    
    const cardWidth = bizcards[0].offsetWidth;
    const gap = 20;
    const containerWidth = document.querySelector('.bizviewport').offsetWidth;
    const leftPadding = window.innerWidth <= 768 ? 16 : 24;
    
    const totalCardsWidth = (cardWidth + gap) * bizcards.length - gap;
    const availableWidth = containerWidth - leftPadding;
    
    const maxSteps = Math.max(0, Math.ceil((totalCardsWidth - availableWidth) / (cardWidth + gap)));
    
    return Math.max(0, Math.min(index, maxSteps));
}

prevBtn.addEventListener('click', () => {
    currentBizIndex = clampBizIndex(currentBizIndex - 1);
    setBizCarouselPosition();
});

nextBtn.addEventListener('click', () => {
    currentBizIndex = clampBizIndex(currentBizIndex + 1);
    setBizCarouselPosition();
});

// ИСПРАВЛЕННАЯ КАРУСЕЛЬ - Работы
const workstrack = document.getElementById('workstrack');
const prevWorkBtn = document.getElementById('prevWorkBtn');
const nextWorkBtn = document.getElementById('nextWorkBtn');
let workcards = document.querySelectorAll('.work-card');
let currentWorkIndex = 0;

function setWorkCarouselPosition() {
    if (workcards.length === 0) return;
    
    const cardWidth = workcards[0].offsetWidth;
    const gap = 20;
    const containerWidth = document.querySelector('.works-viewport').offsetWidth;
    
    const leftPadding = window.innerWidth <= 768 ? 16 : 24;
    const offset = currentWorkIndex * (cardWidth + gap);
    
    workstrack.style.transform = `translateX(-${offset}px)`;
}

function clampWorkIndex(index) {
    if (workcards.length === 0) return 0;
    
    const cardWidth = workcards[0].offsetWidth;
    const gap = 20;
    const containerWidth = document.querySelector('.works-viewport').offsetWidth;
    const leftPadding = window.innerWidth <= 768 ? 16 : 24;
    
    const totalCardsWidth = (cardWidth + gap) * workcards.length - gap;
    const availableWidth = containerWidth - leftPadding;
    
    const maxSteps = Math.max(0, Math.ceil((totalCardsWidth - availableWidth) / (cardWidth + gap)));
    
    return Math.max(0, Math.min(index, maxSteps));
}

prevWorkBtn.addEventListener('click', () => {
    currentWorkIndex = clampWorkIndex(currentWorkIndex - 1);
    setWorkCarouselPosition();
});

nextWorkBtn.addEventListener('click', () => {
    currentWorkIndex = clampWorkIndex(currentWorkIndex + 1);
    setWorkCarouselPosition();
});

// КАРУСЕЛЬ ЛОГОТИПОВ
const logostrack = document.getElementById('logostrack');
const prevLogoBtn = document.getElementById('prevLogoBtn');
const nextLogoBtn = document.getElementById('nextLogoBtn');
let logocards = document.querySelectorAll('.logo-card');
let currentLogoIndex = 0;

function setLogoCarouselPosition() {
    if (logocards.length === 0) return;
    
    const cardWidth = logocards[0].offsetWidth;
    const gap = 20;
    const containerWidth = document.querySelector('.logos-viewport').offsetWidth;
    
    const leftPadding = window.innerWidth <= 768 ? 16 : 24;
    const offset = currentLogoIndex * (cardWidth + gap);
    
    logostrack.style.transform = `translateX(-${offset}px)`;
}

function clampLogoIndex(index) {
    if (logocards.length === 0) return 0;
    
    const cardWidth = logocards[0].offsetWidth;
    const gap = 20;
    const containerWidth = document.querySelector('.logos-viewport').offsetWidth;
    const leftPadding = window.innerWidth <= 768 ? 16 : 24;
    
    const totalCardsWidth = (cardWidth + gap) * logocards.length - gap;
    const availableWidth = containerWidth - leftPadding;
    
    const maxSteps = Math.max(0, Math.ceil((totalCardsWidth - availableWidth) / (cardWidth + gap)));
    
    return Math.max(0, Math.min(index, maxSteps));
}

prevLogoBtn.addEventListener('click', () => {
    currentLogoIndex = clampLogoIndex(currentLogoIndex - 1);
    setLogoCarouselPosition();
});

nextLogoBtn.addEventListener('click', () => {
    currentLogoIndex = clampLogoIndex(currentLogoIndex + 1);
    setLogoCarouselPosition();
});

// Modal Logic
const modal = document.getElementById('modal');
const modalImage = document.getElementById('modalImage');
const modalClose = document.getElementById('modalClose');

// Work Modal Logic
const workModal = document.getElementById('workModal');
const workModalImage = document.getElementById('workModalImage');
const workModalTitle = document.getElementById('workModalTitle');
const workModalDescription = document.getElementById('workModalDescription');
const workModalBtn = document.getElementById('workModalBtn');
const workModalClose = document.getElementById('workModalClose');

function initCardEvents() {
    const currentBizCards = document.querySelectorAll('.bizcard');
    const currentWorkCards = document.querySelectorAll('.work-card');
    const currentLogoCards = document.querySelectorAll('.logo-card');
    
    // Для визиток убираем hover эффекты на десктопе, оставляем только клик на мобиле
    if (window.innerWidth <= 768) {
        currentBizCards.forEach(card => {
            card.removeEventListener('click', handleBizMobileClick);
            card.addEventListener('click', handleBizMobileClick);
        });
    }
    
    // Для работ оставляем клик на всех устройствах
    currentWorkCards.forEach(card => {
        card.removeEventListener('click', handleWorkClick);
        card.addEventListener('click', handleWorkClick);
    });
    
    // Для логотипов добавляем обработчик клика по изображению в админ-режиме
    if (isAdminMode) {
        currentLogoCards.forEach(card => {
            const logoImage = card.querySelector('.logo-image');
            if (logoImage) {
                logoImage.removeEventListener('click', handleLogoImageClick);
                logoImage.addEventListener('click', handleLogoImageClick);
            }
        });
        
        // Обработчики для замены изображений визиток и работ
        currentBizCards.forEach(card => {
            card.removeEventListener('click', handleBizImageClick);
            card.addEventListener('click', handleBizImageClick);
        });
        
        currentWorkCards.forEach(card => {
            const img = card.querySelector('img');
            if (img) {
                img.removeEventListener('click', handleWorkImageClick);
                img.addEventListener('click', handleWorkImageClick);
            }
        });
    }
}

function handleBizImageClick(e) {
    if (!isAdminMode) return;
    e.stopPropagation();
    
    const img = e.currentTarget.querySelector('img');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function(event) {
        const file = event.target.files[0];
        if (file) {
            try {
                const newImageUrl = await uploadImageLocal(file);
                img.src = newImageUrl;
            } catch (error) {
                alert('Ошибка замены изображения: ' + error.message);
            }
        }
    };
    input.click();
}

function handleWorkImageClick(e) {
    if (!isAdminMode) return;
    e.stopPropagation();
    
    const img = e.currentTarget;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function(event) {
        const file = event.target.files[0];
        if (file) {
            try {
                const newImageUrl = await uploadImageLocal(file);
                img.src = newImageUrl;
            } catch (error) {
                alert('Ошибка замены изображения: ' + error.message);
            }
        }
    };
    input.click();
}

function handleLogoImageClick(e) {
    e.stopPropagation();
    const logoImage = e.currentTarget;
    const img = logoImage.querySelector('img');
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function(event) {
        const file = event.target.files[0];
        if (file) {
            try {
                const newImageUrl = await uploadImageLocal(file);
                img.src = newImageUrl;
            } catch (error) {
                alert('Ошибка замены изображения: ' + error.message);
            }
        }
    };
    input.click();
}

function handleWorkClick(e) {
    if (isAdminMode) return; // В админ режиме не открываем модал
    
    e.preventDefault();
    const workCard = e.currentTarget;
    const img = workCard.querySelector('img');
    const title = workCard.querySelector('.work-title');
    const description = workCard.querySelector('.work-description');
    const btn = workCard.querySelector('.work-btn');
    
    workModalImage.src = img.src;
    workModalImage.alt = img.alt;
    workModalTitle.textContent = title.textContent;
    workModalDescription.textContent = description.textContent;
    workModalBtn.href = btn.href;
    
    workModal.style.display = 'block';
}

function handleBizMobileClick(e) {
    if (isAdminMode) return; // В админ режиме не открываем модал
    
    const img = e.currentTarget.querySelector('img');
    modalImage.src = img.src;
    modalImage.alt = img.alt;
    modal.style.display = 'block';
}

modalClose.addEventListener('click', () => {
    modal.style.display = 'none';
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

workModalClose.addEventListener('click', () => {
    workModal.style.display = 'none';
});

workModal.addEventListener('click', (e) => {
    if (e.target === workModal) {
        workModal.style.display = 'none';
    }
});

// Form Submission
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxYUaAiV0Vq8uvNPSVyawcCiHDV4N3HFr1TT4dmDTesQ42sBgHbiOQkdNAodil8DTDV/exec';

contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    formStatus.style.display = 'block';
    formStatus.className = 'form-status';
    formStatus.textContent = 'Отправка...';
    
    const formData = new FormData(contactForm);
    const data = new URLSearchParams();
    
    for (let [key, value] of formData.entries()) {
        data.append(key, value);
    }
    
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
            body: data,
            mode: 'no-cors'
        });
        
        formStatus.className = 'form-status success';
        formStatus.textContent = 'Спасибо! Ваша заявка отправлена.';
        contactForm.reset();
        
        setTimeout(() => {
            formStatus.style.display = 'none';
        }, 5000);
        
    } catch (error) {
        console.error('Ошибка отправки:', error);
        formStatus.className = 'form-status error';
        formStatus.textContent = 'Ошибка отправки: ' + error.message;
        
        setTimeout(() => {
            formStatus.style.display = 'none';
        }, 8000);
    }
});

// Initialize
window.addEventListener('load', () => {
    loadSavedContent(); // Загружаем сохраненные данные
    animateMarquee();
    setBizCarouselPosition();
    setWorkCarouselPosition();
    setLogoCarouselPosition();
    initCardEvents();
    
    setTimeout(() => {
        setBizCarouselPosition();
        setWorkCarouselPosition();
        setLogoCarouselPosition();
    }, 100);
});

window.addEventListener('resize', () => {
    currentBizIndex = clampBizIndex(currentBizIndex);
    currentWorkIndex = clampWorkIndex(currentWorkIndex);
    currentLogoIndex = clampLogoIndex(currentLogoIndex);
    
    setBizCarouselPosition();
    setWorkCarouselPosition();
    setLogoCarouselPosition();
});

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

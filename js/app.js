// КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ
const APP_CONFIG = {
    name: 'ТраксЯкутия',
    version: '1.0.0',
    defaultCenter: [62.027833, 129.732178], // Центр Якутии
    defaultZoom: 5,
    maxZoom: 19
};

// БЕЗОПАСНЫЕ РАБОЧИЕ КАРТЫ (только российские и нейтральные)
const MAP_CONFIGS = {
    yandex_map: {
        name: 'Яндекс.Карты',
        url: 'https://core-renderer-tiles.maps.yandex.net/tiles?l=map&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
        maxZoom: 19
    },
    yandex_satellite: {
        name: 'Яндекс.Спутник',
        url: 'https://core-sat.maps.yandex.net/tiles?l=sat&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
        maxZoom: 19
    },
    yandex_hybrid: {
        name: 'Яндекс.Гибрид',
        url: 'https://core-renderer-tiles.maps.yandex.net/tiles?l=skl&x={x}&y={y}&z={z}&scale=1&lang=ru_RU',
        maxZoom: 19
    },
    rosreestr: {
        name: 'Росреестр',
        url: 'https://tile.rosreestr.ru/tiles/{z}/{x}/{y}.png',
        maxZoom: 17
    },
    esri_world: {
        name: 'Esri Мир',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19
    },
    esri_satellite: {
        name: 'Esri Спутник',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19
    }
};

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let map; // Объект карты Leaflet
let currentMapLayer; // Текущий активный слой карты
let allMarkers = []; // Массив всех маркеров на карте
let activeFilters = new Set(['fuel', 'parking', 'hotel', 'food', 'service', 'tire', 'wash', 'ferry', 'border', 'danger']); // Активные фильтры (все включены по умолчанию)
let locateControl; // Контрол геолокации

// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
function initApp() {
    initMap(); // Инициализация карты
    initMarkers(); // Загрузка маркеров
    initControls(); // Инициализация элементов управления
    initEventListeners(); // Настройка обработчиков событий
    updateTemperature(); // Обновление индикатора температуры
    
    // Проверка геолокации
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                showNotification(`Ваше местоположение определено`);
            },
            (error) => {
                console.warn('Геолокация недоступна:', error.message);
            }
        );
    }
}

// ИНИЦИАЛИЗАЦИЯ КАРТЫ
function initMap() {
    // Создаем карту с настройками по умолчанию
    map = L.map('map', {
        center: APP_CONFIG.defaultCenter,
        zoom: APP_CONFIG.defaultZoom,
        zoomControl: false, // Отключаем стандартный контрол зума
        attributionControl: false // Отключаем стандартную атрибуцию
    });

    // Добавляем кастомный контрол масштабирования
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Добавляем кастомную атрибуцию (только нейтральную информацию)
    L.control.attribution({
        position: 'bottomright',
        prefix: 'Карты'
    })
    .addAttribution('© Яндекс')
    .addAttribution('© Росреестр')
    .addAttribution('© Esri')
    .addTo(map);

    // СОЗДАЕМ ВСЕ СЛОИ КАРТ ИЗ КОНФИГУРАЦИИ
    Object.keys(MAP_CONFIGS).forEach(key => {
        const config = MAP_CONFIGS[key];
        // Создаем слой карты Leaflet и сохраняем в конфигурации
        MAP_CONFIGS[key].layer = L.tileLayer(config.url, {
            maxZoom: config.maxZoom || APP_CONFIG.maxZoom,
            id: key
        });
    });

    // Загружаем сохраненную карту из localStorage или используем Яндекс.Карты по умолчанию
    const savedMap = localStorage.getItem('trax_yakutia_map') || 'yandex_map';
    switchMapLayer(savedMap);

    // Устанавливаем начальный выбор в выпадающем списке
    const mapStyleSelect = document.getElementById('mapStyle');
    if (mapStyleSelect) {
        mapStyleSelect.value = savedMap;
    }
}

// ПЕРЕКЛЮЧЕНИЕ СЛОЕВ КАРТЫ
function switchMapLayer(layerKey) {
    // Проверка существования слоя
    if (!MAP_CONFIGS[layerKey] || !MAP_CONFIGS[layerKey].layer) {
        console.error('Слой карты не найден:', layerKey);
        return;
    }

    // Сохраняем текущие параметры карты (положение и масштаб)
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    // Удаляем текущий активный слой
    if (currentMapLayer) {
        map.removeLayer(currentMapLayer);
    }

    // Добавляем новый выбранный слой
    currentMapLayer = MAP_CONFIGS[layerKey].layer;
    currentMapLayer.addTo(map);

    // Восстанавливаем положение и зум карты
    map.setView(currentCenter, currentZoom);

    // Сохраняем выбор в localStorage
    localStorage.setItem('trax_yakutia_map', layerKey);

    // Показываем уведомление пользователю
    showNotification(`Карта: ${MAP_CONFIGS[layerKey].name}`);
}

// ИНИЦИАЛИЗАЦИЯ МАРКЕРОВ
function initMarkers() {
    // Загружаем данные из внешнего файла data.js
    if (typeof pointsData !== 'undefined') {
        renderMarkers(pointsData);
    } else {
        console.error('Данные точек не найдены');
        // Если данные не загрузились, загружаем демо-данные
        loadDemoData();
    }
}

// ЗАГРУЗКА ДЕМО-ДАННЫХ
function loadDemoData() {
    // Тестовые данные для Якутии
    const demoData = [
        {
            id: 1,
            name: 'АЗС Лукойл',
            type: 'fuel',
            lat: 62.0350,
            lng: 129.7400,
            description: 'Круглосуточная заправка',
            phone: '+7 (4112) 12-34-56',
            services: ['ДТ', 'АИ-92', 'АИ-95', 'Магазин']
        },
        // ... остальные демо-точки
    ];

    renderMarkers(demoData);
}

// ОТРИСОВКА МАРКЕРОВ
function renderMarkers(points) {
    // Очищаем старые маркеры с карты
    clearMarkers();

    // Фильтруем точки по активным фильтрам
    const filteredPoints = points.filter(point => activeFilters.has(point.type));

    // Создаем маркеры для отфильтрованных точек
    filteredPoints.forEach(point => {
        const marker = createMarker(point);
        if (marker) {
            marker.addTo(map);
            allMarkers.push(marker); // Сохраняем в общий массив
        }
    });

    // Обновляем счетчик маркеров
    updateMarkerCount();
}

// СОЗДАНИЕ МАРКЕРА
function createMarker(point) {
    // Создаем кастомную иконку для маркера
    const icon = L.divIcon({
        className: 'custom-marker',
        html: getMarkerIcon(point.type), // HTML для иконки
        iconSize: [44, 44],
        iconAnchor: [22, 44], // Точка привязки к координатам
        popupAnchor: [0, -40] // Смещение попапа относительно маркера
    });

    // Создаем маркер с заданными координатами и иконкой
    const marker = L.marker([point.lat, point.lng], { icon });
    
    // Добавляем всплывающее окно (popup) с информацией
    const popupContent = createPopupContent(point);
    marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup'
    });

    return marker;
}

// ПОЛУЧЕНИЕ HTML ДЛЯ ИКОНКИ МАРКЕРА
function getMarkerIcon(type) {
    // Соответствие типов эмодзи
    const icons = {
        fuel: '⛽',
        parking: '🅿️',
        hotel: '🏨',
        food: '🍽️',
        service: '🔧',
        tire: '🛞',
        wash: '🧼',
        ferry: '🚢',
        border: '🛃',
        danger: '⚠️'
    };

    const icon = icons[type] || '📍'; // Значок по умолчанию
    
    // Цвета для разных типов маркеров
    const colors = {
        fuel: '#FF9800',
        parking: '#4CAF50',
        hotel: '#2196F3',
        food: '#9C27B0',
        service: '#F44336',
        tire: '#795548',
        wash: '#00BCD4',
        ferry: '#3F51B5',
        border: '#FF5722',
        danger: '#FF0000'
    };

    const color = colors[type] || '#666'; // Цвет по умолчанию
    
    // Возвращаем HTML для стилизованной иконки
    return `
        <div class="marker-${type}" style="
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: white;
            border: 3px solid ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            color: ${color};
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            position: relative;
        ">
            ${icon}
        </div>
    `;
}

// СОЗДАНИЕ КОНТЕНТА ДЛЯ ВСПЛЫВАЮЩЕГО ОКНА
function createPopupContent(point) {
    // Русские названия типов
    const typeNames = {
        fuel: 'Заправка',
        parking: 'Парковка',
        hotel: 'Гостиница',
        food: 'Питание',
        service: 'Автосервис',
        tire: 'Шиномонтаж',
        wash: 'Мойка',
        ferry: 'Паром',
        border: 'Пост/Весовые',
        danger: 'Сложный участок'
    };

    const icons = {
        fuel: '⛽',
        parking: '🅿️',
        hotel: '🏨',
        food: '🍽️',
        service: '🔧',
        tire: '🛞',
        wash: '🧼',
        ferry: '🚢',
        border: '🛃',
        danger: '⚠️'
    };

    // Формируем HTML-контент для попапа
    return `
        <div class="popup-content">
            <div class="popup-header">
                <span class="popup-icon">${icons[point.type] || '📍'}</span>
                <h3 class="popup-title">${point.name}</h3>
            </div>
            <div class="popup-details">
                <div class="popup-detail">
                    <strong>Тип:</strong> ${typeNames[point.type] || 'Объект'}
                </div>
                ${point.description ? `
                <div class="popup-detail">
                    <strong>Описание:</strong> ${point.description}
                </div>` : ''}
                ${point.phone ? `
                <div class="popup-detail">
                    <strong>Телефон:</strong> 
                    <a href="tel:${point.phone.replace(/[^\d+]/g, '')}" style="color: #4fc3f7;">
                        ${point.phone}
                    </a>
                </div>` : ''}
                ${point.services && point.services.length ? `
                <div class="popup-detail">
                    <strong>Услуги:</strong> ${point.services.join(', ')}
                </div>` : ''}
                ${point.working_hours ? `
                <div class="popup-detail">
                    <strong>Часы работы:</strong> ${point.working_hours}
                </div>` : ''}
            </div>
            <div class="popup-buttons">
                <button class="popup-btn route" onclick="buildRoute(${point.lat}, ${point.lng})">
                    🚚 Построить маршрут
                </button>
                <button class="popup-btn save" onclick="savePoint(${point.id})">
                    💾 Сохранить
                </button>
            </div>
        </div>
    `;
}

// ИНИЦИАЛИЗАЦИЯ ЭЛЕМЕНТОВ УПРАВЛЕНИЯ
function initControls() {
    // Инициализация кнопки геолокации
    locateControl = L.control.locate({
        position: 'bottomright',
        strings: {
            title: "Показать мое местоположение"
        },
        locateOptions: {
            maxZoom: 16,
            enableHighAccuracy: true
        }
    }).addTo(map);

    // Инициализация индикатора температуры
    updateTemperature();
}

// ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ СОБЫТИЙ
function initEventListeners() {
    // Обработчик изменения стиля карты
    const mapStyleSelect = document.getElementById('mapStyle');
    if (mapStyleSelect) {
        mapStyleSelect.addEventListener('change', (e) => {
            switchMapLayer(e.target.value);
        });
    }

    // ОБРАБОТЧИКИ ДЛЯ ПАНЕЛИ ФИЛЬТРОВ
    const filterToggle = document.getElementById('filterToggle');
    const closeFilters = document.getElementById('closeFilters');
    const filtersPanel = document.getElementById('filtersPanel');
    const applyFilters = document.getElementById('applyFilters');

    // Открытие/закрытие панели фильтров
    if (filterToggle && filtersPanel) {
        filterToggle.addEventListener('click', () => {
            filtersPanel.classList.toggle('active');
        });
    }

    // Кнопка закрытия панели фильтров
    if (closeFilters && filtersPanel) {
        closeFilters.addEventListener('click', () => {
            filtersPanel.classList.remove('active');
        });
    }

    // Применение фильтров
    if (applyFilters) {
        applyFilters.addEventListener('click', () => {
            updateFilters(); // Обновляем фильтры
            filtersPanel.classList.remove('active'); // Закрываем панель
            showNotification('Фильтры применены');
        });
    }

    // ОБРАБОТЧИКИ ДЛЯ ЛЕГЕНДЫ
    const legendToggle = document.getElementById('legendToggle');
    const legendContent = document.getElementById('legendContent');

    if (legendToggle && legendContent) {
        legendToggle.addEventListener('click', () => {
            legendContent.classList.toggle('show'); // Показать/скрыть легенду
        });
    }

    // КНОПКА ГЕОЛОКАЦИИ
    const locateBtn = document.getElementById('locateBtn');
    if (locateBtn) {
        locateBtn.addEventListener('click', () => {
            locateControl.start(); // Запуск геолокации
        });
    }

    // КНОПКА ДОБАВЛЕНИЯ ТОЧКИ
    const addPointBtn = document.getElementById('addPointBtn');
    if (addPointBtn) {
        addPointBtn.addEventListener('click', () => {
            showAddPointModal();
        });
    }

    // КНОПКА ЭКСТРЕННОЙ СВЯЗИ (SOS)
    const emergencyBtn = document.getElementById('emergencyBtn');
    if (emergencyBtn) {
        emergencyBtn.addEventListener('click', () => {
            showEmergencyModal();
        });
    }

    // КЛИК ПО КАРТЕ ДЛЯ ДОБАВЛЕНИЯ ТОЧКИ
    map.on('click', (e) => {
        if (window.addingPointMode) {
            // Если включен режим добавления, показываем модальное окно с координатами клика
            showAddPointModal(e.latlng.lat, e.latlng.lng);
        }
    });

    // ЗАКРЫТИЕ ПАНЕЛИ ФИЛЬТРОВ ПРИ КЛИКЕ ВНЕ ЕЕ
    document.addEventListener('click', (e) => {
        if (filtersPanel && !filtersPanel.contains(e.target) && 
            e.target !== filterToggle && 
            !filterToggle.contains(e.target)) {
            filtersPanel.classList.remove('active');
        }
    });
}

// ОБНОВЛЕНИЕ ФИЛЬТРОВ
function updateFilters() {
    // Получаем все чекбоксы фильтров
    const checkboxes = document.querySelectorAll('.filter-item input[type="checkbox"]');
    activeFilters.clear(); // Очищаем текущие фильтры
    
    // Добавляем только выбранные фильтры
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            activeFilters.add(checkbox.dataset.type);
        }
    });
    
    // Перерисовываем маркеры с учетом новых фильтров
    if (typeof pointsData !== 'undefined') {
        renderMarkers(pointsData);
    } else {
        loadDemoData();
    }
}

// ОЧИСТКА МАРКЕРОВ
function clearMarkers() {
    // Удаляем все маркеры с карты и очищаем массив
    allMarkers.forEach(marker => {
        marker.remove();
    });
    allMarkers = [];
}

// ОБНОВЛЕНИЕ СЧЕТЧИКА МАРКЕРОВ
function updateMarkerCount() {
    const markerCount = allMarkers.length;
    console.log(`Отображено маркеров: ${markerCount}`);
    // В будущем можно добавить отображение счетчика в интерфейсе
}

// ОБНОВЛЕНИЕ ИНДИКАТОРА ТЕМПЕРАТУРЫ
function updateTemperature() {
    const tempIndicator = document.getElementById('tempIndicator');
    if (!tempIndicator) return;

    // Симуляция температуры Якутии (случайный выбор из типичных значений)
    const temperatures = [-45, -38, -52, -40, -35];
    const randomTemp = temperatures[Math.floor(Math.random() * temperatures.length)];
    
    // Определяем CSS-класс в зависимости от температуры
    let tempClass = 'temp-cold';
    if (randomTemp <= -50) tempClass = 'temp-extreme';
    else if (randomTemp >= -30) tempClass = 'temp-normal';

    // Обновляем текст и класс индикатора
    tempIndicator.textContent = `🌡️ ${randomTemp}°C`;
    tempIndicator.className = `temp-indicator ${tempClass}`;
    
    // Обновляем температуру каждые 5 минут
    setTimeout(updateTemperature, 300000);
}

// ПОКАЗАТЬ УВЕДОМЛЕНИЕ
function showNotification(message, duration = 2000) {
    // Удаляем старое уведомление, если оно есть
    const oldNotification = document.querySelector('.map-notification');
    if (oldNotification) {
        oldNotification.remove();
    }

    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = 'map-notification';
    notification.textContent = message;
    
    // Добавляем в DOM
    document.body.appendChild(notification);
    
    // Автоматически удаляем через указанное время
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

// ПОСТРОЕНИЕ МАРШРУТА
function buildRoute(lat, lng) {
    // Получаем текущее положение карты (или можно использовать геолокацию пользователя)
    const userLocation = map.getCenter();
    
    // Формируем URL для Яндекс.Навигатора
    const yandexUrl = `https://yandex.ru/maps/?rtext=${userLocation.lat},${userLocation.lng}~${lat},${lng}&rtt=auto`;
    
    // Открываем маршрут в новом окне
    window.open(yandexUrl, '_blank');
    
    showNotification('Маршрут строится в Яндекс.Картах');
}

// СОХРАНЕНИЕ ТОЧКИ В ИЗБРАННОЕ
function savePoint(pointId) {
    // Загружаем сохраненные точки из localStorage
    const savedPoints = JSON.parse(localStorage.getItem('trax_yakutia_saved_points') || '[]');
    
    // Проверяем, не сохранена ли точка уже
    if (!savedPoints.includes(pointId)) {
        savedPoints.push(pointId);
        localStorage.setItem('trax_yakutia_saved_points', JSON.stringify(savedPoints));
        showNotification('Точка сохранена в избранное');
    } else {
        showNotification('Точка уже сохранена');
    }
}

// МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ ТОЧКИ
function showAddPointModal(lat = null, lng = null) {
    // Создаем элементы модального окна
    const modal = document.createElement('div');
    modal.className = 'add-point-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <!-- Заголовок окна -->
            <div class="modal-header">
                <h3>➕ Добавить новую точку</h3>
                <button class="modal-close">&times;</button>
            </div>
            <!-- Тело формы -->
            <div class="modal-body">
                <div class="form-group">
                    <label>Название точки:</label>
                    <input type="text" id="pointName" placeholder="Например: АЗС Лукойл" maxlength="100">
                </div>
                <div class="form-group">
                    <label>Тип объекта:</label>
                    <select id="pointType">
                        <option value="fuel">⛽ Заправка</option>
                        <option value="parking">🅿️ Парковка</option>
                        <option value="hotel">🏨 Гостиница</option>
                        <option value="food">🍽️ Питание</option>
                        <!-- ... другие типы -->
                    </select>
                </div>
                <!-- ... остальные поля формы ... -->
                <button class="submit-point-btn">✅ Добавить точку</button>
                <button class="cancel-point-btn">❌ Отмена</button>
            </div>
        </div>
    `;

    // Добавляем стили для модального окна
    const style = document.createElement('style');
    style.textContent = `
        /* Стили модального окна */
        .add-point-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            animation: fadeIn 0.3s ease;
        }
        /* ... остальные стили ... */
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    // ОБРАБОТЧИКИ СОБЫТИЙ ДЛЯ МОДАЛЬНОГО ОКНА
    const closeBtn = modal.querySelector('.modal-close');
    const cancelBtn = modal.querySelector('.cancel-point-btn');
    const submitBtn = modal.querySelector('.submit-point-btn');

    // Функция закрытия модального окна
    const closeModal = () => {
        modal.remove();
        style.remove();
    };

    // Навешиваем обработчики закрытия
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // ОБРАБОТЧИК ДОБАВЛЕНИЯ ТОЧКИ
    submitBtn.addEventListener('click', () => {
        // Получаем значения из формы
        const name = document.getElementById('pointName').value.trim();
        const type = document.getElementById('pointType').value;
        const description = document.getElementById('pointDescription').value.trim();
        const lat = parseFloat(document.getElementById('pointLat').value);
        const lng = parseFloat(document.getElementById('pointLng').value);

        // ВАЛИДАЦИЯ ДАННЫХ
        if (!name) {
            showNotification('Введите название точки');
            return;
        }

        if (isNaN(lat) || isNaN(lng)) {
            showNotification('Введите корректные координаты');
            return;
        }

        // Добавляем точку
        addUserPoint({
            name,
            type,
            description,
            lat,
            lng
        });

        closeModal();
        showNotification('Точка успешно добавлена!');
    });

    // ЗАКРЫТИЕ ПО КЛИКУ ВНЕ ОКНА
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// ДОБАВЛЕНИЕ ПОЛЬЗОВАТЕЛЬСКОЙ ТОЧКИ
function addUserPoint(pointData) {
    // Загружаем пользовательские точки из localStorage
    const userPoints = JSON.parse(localStorage.getItem('trax_yakutia_user_points') || '[]');
    
    // Создаем новую точку с уникальным ID
    const newPoint = {
        id: Date.now(), // Используем timestamp как ID
        ...pointData,
        userAdded: true, // Флаг, что точка добавлена пользователем
        timestamp: new Date().toISOString() // Время добавления
    };
    
    // Сохраняем в localStorage
    userPoints.push(newPoint);
    localStorage.setItem('trax_yakutia_user_points', JSON.stringify(userPoints));
    
    // Добавляем маркер на карту
    const marker = createMarker(newPoint);
    if (marker) {
        marker.addTo(map);
        allMarkers.push(marker);
    }
    
    // Обновляем общий массив данных (если он существует)
    if (typeof pointsData !== 'undefined') {
        pointsData.push(newPoint);
    }
}

// МОДАЛЬНОЕ ОКНО ЭКСТРЕННОЙ СВЯЗИ
function showEmergencyModal() {
    // Список экстренных номеров
    const emergencyNumbers = [
        { name: 'Единая служба спасения', number: '112' },
        { name: 'Полиция', number: '102' },
        { name: 'Скорая помощь', number: '103' },
        { name: 'Газовая служба', number: '104' },
        { name: 'ДПС Якутии', number: '+7 (4112) 42-22-22' },
        { name: 'Экстренная служба МЧС', number: '+7 (4112) 44-33-22' }
    ];

    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'emergency-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🆘 Экстренная связь</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <!-- Инструкция для экстренной ситуации -->
                <p style="color: #ff6b35; margin-bottom: 20px; font-weight: 500;">
                    В экстренной ситуации сохраняйте спокойствие и четко сообщите:
                </p>
                <ul style="margin-bottom: 25px; padding-left: 20px; color: #e0e0e0;">
                    <li>Что произошло</li>
                    <li>Точное местоположение (координаты)</li>
                    <li>Количество пострадавших</li>
                    <li>Ваш номер телефона</li>
                </ul>
                <!-- Список экстренных номеров -->
                <div class="emergency-numbers">
                    ${emergencyNumbers.map(item => `
                        <div class="emergency-item">
                            <span class="emergency-name">${item.name}:</span>
                            <a href="tel:${item.number.replace(/[^\d+]/g, '')}" 
                               class="emergency-number">
                                ${item.number}
                            </a>
                        </div>
                    `).join('')}
                </div>
                <button class="close-emergency-btn">Понятно</button>
            </div>
        </div>
    `;

    // Добавляем стили
    const style = document.createElement('style');
    style.textContent = `
        /* Стили для экстренного окна с красной темой */
        .emergency-modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(20px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            animation: fadeIn 0.3s ease;
        }
        /* ... остальные стили ... */
    `;

    document.head.appendChild(style);
    document.body.appendChild(modal);

    // ОБРАБОТЧИКИ СОБЫТИЙ
    const closeBtn = modal.querySelector('.modal-close');
    const closeEmergencyBtn = modal.querySelector('.close-emergency-btn');

    const closeModal = () => {
        modal.remove();
        style.remove();
    };

    closeBtn.addEventListener('click', closeModal);
    closeEmergencyBtn.addEventListener('click', closeModal);

    // Закрытие по клику вне окна
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

// ЗАПУСК ПРИЛОЖЕНИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
document.addEventListener('DOMContentLoaded', initApp);
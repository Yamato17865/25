// Маршрутизация
class RouteManager {
    constructor() {
        this.routeControl = null;
        this.currentRoute = null;
        this.routeFromInput = document.getElementById('routeFrom');
        this.routeToInput = document.getElementById('routeTo');
        this.buildRouteBtn = document.getElementById('buildRouteBtn');
        this.clearRouteBtn = document.getElementById('clearRouteBtn');
        this.useMyLocationBtn = document.getElementById('useMyLocation');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Построение маршрута
        this.buildRouteBtn.addEventListener('click', () => this.buildRoute());
        
        // Очистка маршрута
        this.clearRouteBtn.addEventListener('click', () => this.clearRoute());
        
        // Использование моего местоположения
        this.useMyLocationBtn.addEventListener('click', () => this.useCurrentLocation());
        
        // Автозаполнение при выборе из поиска
        this.routeFromInput.addEventListener('focus', () => {
            this.showAutocomplete('from');
        });
        
        this.routeToInput.addEventListener('focus', () => {
            this.showAutocomplete('to');
        });
        
        // Построение по Enter
        this.routeFromInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.buildRoute();
        });
        
        this.routeToInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.buildRoute();
        });
    }
    
    async buildRoute() {
        const from = this.routeFromInput.value.trim();
        const to = this.routeToInput.value.trim();
        
        if (!from || !to) {
            showNotification('Заполните обе точки маршрута');
            return;
        }
        
        // Преобразуем адреса в координаты
        let fromCoords, toCoords;
        
        try {
            // Для "Мое местоположение"
            if (from.toLowerCase().includes('мое') || from.toLowerCase().includes('местоположение')) {
                fromCoords = await this.getCurrentLocation();
            } else {
                fromCoords = await this.geocodeAddress(from);
            }
            
            toCoords = await this.geocodeAddress(to);
            
            if (!fromCoords || !toCoords) {
                throw new Error('Не удалось определить координаты');
            }
            
            // Строим маршрут
            this.createRoute(fromCoords, toCoords);
            
        } catch (error) {
            console.error('Ошибка построения маршрута:', error);
            showNotification('Не удалось построить маршрут. Проверьте адреса.');
        }
    }
    
    async geocodeAddress(address) {
        // Простая имитация геокодинга
        // В реальном приложении используйте Яндекс.Геокодер или другой сервис
        
        // Проверяем, не является ли адрес координатами
        const coordMatch = address.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (coordMatch) {
            return {
                lat: parseFloat(coordMatch[1]),
                lng: parseFloat(coordMatch[2])
            };
        }
        
        // Ищем в существующих точках
        if (window.pointsData) {
            const point = window.pointsData.find(p => 
                p.name.toLowerCase().includes(address.toLowerCase()) ||
                (p.address && p.address.toLowerCase().includes(address.toLowerCase()))
            );
            
            if (point) {
                return { lat: point.lat, lng: point.lng };
            }
        }
        
        // Если не нашли, возвращаем случайные координаты в Якутии (для демо)
        return {
            lat: 62.027833 + (Math.random() - 0.5) * 0.5,
            lng: 129.732178 + (Math.random() - 0.5) * 0.5
        };
    }
    
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject('Геолокация не поддерживается');
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Ошибка геолокации:', error);
                    // Используем центр карты как запасной вариант
                    resolve(map.getCenter());
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }
    
    createRoute(fromCoords, toCoords) {
        // Удаляем предыдущий маршрут
        if (this.routeControl) {
            map.removeControl(this.routeControl);
        }
        
        // Создаем новый маршрут
        this.routeControl = L.Routing.control({
            waypoints: [
                L.latLng(fromCoords.lat, fromCoords.lng),
                L.latLng(toCoords.lat, toCoords.lng)
            ],
            routeWhileDragging: true,
            showAlternatives: false,
            lineOptions: {
                styles: [
                    {
                        color: '#ff6b35',
                        opacity: 0.8,
                        weight: 6
                    }
                ]
            },
            altLineOptions: {
                styles: [
                    {
                        color: '#4fc3f7',
                        opacity: 0.6,
                        weight: 4
                    }
                ]
            },
            createMarker: (i, waypoint, n) => {
                const marker = L.marker(waypoint.latLng, {
                    draggable: true,
                    icon: L.divIcon({
                        className: 'route-marker',
                        html: i === 0 ? '🟢' : '🔴',
                        iconSize: [30, 30],
                        iconAnchor: [15, 30]
                    })
                });
                
                // При перетаскивании маркера обновляем маршрут
                marker.on('dragend', (e) => {
                    const newWaypoints = this.routeControl.getWaypoints();
                    newWaypoints[i] = e.target.getLatLng();
                    this.routeControl.setWaypoints(newWaypoints);
                });
                
                return marker;
            },
            language: 'ru',
            units: 'metric'
        }).addTo(map);
        
        // Сохраняем маршрут
        this.currentRoute = {
            from: fromCoords,
            to: toCoords,
            waypoints: [fromCoords, toCoords]
        };
        
        // Центрируем карту на маршруте
        const bounds = L.latLngBounds([fromCoords, toCoords]);
        map.fitBounds(bounds.pad(0.1));
        
        showNotification('Маршрут построен!');
        
        // Показываем информацию о маршруте
        this.showRouteInfo();
    }
    
    showRouteInfo() {
        // Добавляем панель информации о маршруте
        const infoPanel = L.control({ position: 'topright' });
        
        infoPanel.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'route-info-panel');
            div.innerHTML = `
                <div style="
                    background: rgba(26, 35, 47, 0.95);
                    border: 2px solid #ff6b35;
                    border-radius: 10px;
                    padding: 15px;
                    color: #e0e0e0;
                    min-width: 250px;
                    backdrop-filter: blur(10px);
                ">
                    <h3 style="margin: 0 0 10px 0; color: #ff6b35;">Маршрут</h3>
                    <div style="margin-bottom: 10px;">
                        <div><strong>От:</strong> ${document.getElementById('routeFrom').value}</div>
                        <div><strong>До:</strong> ${document.getElementById('routeTo').value}</div>
                    </div>
                    <div style="font-size: 12px; color: #b0b0b0;">
                        Перетаскивайте маркеры для изменения маршрута
                    </div>
                </div>
            `;
            return div;
        };
        
        infoPanel.addTo(map);
        
        // Сохраняем ссылку на панель
        this.infoPanel = infoPanel;
    }
    
    clearRoute() {
        if (this.routeControl) {
            map.removeControl(this.routeControl);
            this.routeControl = null;
        }
        
        if (this.infoPanel) {
            map.removeControl(this.infoPanel);
            this.infoPanel = null;
        }
        
        this.routeFromInput.value = '';
        this.routeToInput.value = '';
        this.currentRoute = null;
        
        showNotification('Маршрут очищен');
    }
    
    async useCurrentLocation() {
        try {
            const coords = await this.getCurrentLocation();
            this.routeFromInput.value = 'Мое местоположение';
            showNotification('Ваше местоположение определено');
            
            // Если есть пункт назначения, сразу строим маршрут
            if (this.routeToInput.value.trim()) {
                setTimeout(() => this.buildRoute(), 1000);
            }
        } catch (error) {
            showNotification('Не удалось определить местоположение');
        }
    }
    
    setDestination(lat, lng) {
        this.routeToInput.focus();
        
        // Находим название точки по координатам
        if (window.pointsData) {
            const point = window.pointsData.find(p => 
                Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lng) < 0.0001
            );
            
            if (point) {
                this.routeToInput.value = point.name;
            } else {
                this.routeToInput.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
        }
    }
    
    showAutocomplete(type) {
        // Показываем подсказки из существующих точек
        if (!window.pointsData || window.pointsData.length === 0) return;
        
        const input = type === 'from' ? this.routeFromInput : this.routeToInput;
        const rect = input.getBoundingClientRect();
        
        // Создаем контейнер для подсказок
        let autocompleteContainer = document.getElementById('route-autocomplete');
        if (!autocompleteContainer) {
            autocompleteContainer = document.createElement('div');
            autocompleteContainer.id = 'route-autocomplete';
            document.body.appendChild(autocompleteContainer);
        }
        
        // Стили для контейнера
        autocompleteContainer.style.cssText = `
            position: fixed;
            top: ${rect.bottom + window.scrollY}px;
            left: ${rect.left + window.scrollX}px;
            width: ${rect.width}px;
            background: rgba(26, 35, 47, 0.95);
            backdrop-filter: blur(20px);
            border: 2px solid #4fc3f7;
            border-radius: 0 0 10px 10px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 2000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        
        // Собираем подсказки
        const suggestions = window.pointsData.map(point => ({
            name: point.name,
            address: point.address || '',
            type: point.type,
            lat: point.lat,
            lng: point.lng
        }));
        
        // Добавляем "Мое местоположение"
        suggestions.unshift({
            name: 'Мое местоположение',
            address: 'Использовать GPS',
            type: 'location'
        });
        
        // Отображаем подсказки
        autocompleteContainer.innerHTML = suggestions.map(item => `
            <div class="autocomplete-item" data-lat="${item.lat}" data-lng="${item.lng}" data-name="${item.name}">
                <div style="font-weight: 500; color: #e0e0e0;">${item.name}</div>
                <div style="font-size: 12px; color: #b0b0b0;">${item.address}</div>
            </div>
        `).join('');
        
        // Добавляем стили для элементов
        const style = document.createElement('style');
        style.textContent = `
            .autocomplete-item {
                padding: 10px 15px;
                cursor: pointer;
                border-bottom: 1px solid rgba(79, 195, 247, 0.2);
                transition: all 0.2s;
            }
            .autocomplete-item:hover {
                background: rgba(79, 195, 247, 0.1);
            }
            .autocomplete-item:last-child {
                border-bottom: none;
            }
        `;
        document.head.appendChild(style);
        
        // Обработчики кликов
        const items = autocompleteContainer.querySelectorAll('.autocomplete-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const name = item.getAttribute('data-name');
                const lat = item.getAttribute('data-lat');
                const lng = item.getAttribute('data-lng');
                
                input.value = name;
                
                if (type === 'to' && lat && lng) {
                    this.setDestination(parseFloat(lat), parseFloat(lng));
                }
                
                autocompleteContainer.remove();
                style.remove();
                
                // Если заполнены оба поля, предлагаем построить маршрут
                if (this.routeFromInput.value && this.routeToInput.value) {
                    setTimeout(() => {
                        if (confirm('Построить маршрут?')) {
                            this.buildRoute();
                        }
                    }, 300);
                }
            });
        });
        
        // Закрытие при клике вне
        const closeAutocomplete = (e) => {
            if (!autocompleteContainer.contains(e.target) && e.target !== input) {
                autocompleteContainer.remove();
                style.remove();
                document.removeEventListener('click', closeAutocomplete);
            }
        };
        
        setTimeout(() => {
            document.addEventListener('click', closeAutocomplete);
        }, 100);
    }
}

// Глобальная переменная
let routeManager;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    routeManager = new RouteManager();
});

// Глобальные функции для доступа из других скриптов
window.buildRouteToPoint = function(lat, lng, name) {
    if (routeManager) {
        document.getElementById('routeTo').value = name;
        routeManager.setDestination(lat, lng);
        showNotification(`Точка "${name}" установлена как пункт назначения`);
    }
};
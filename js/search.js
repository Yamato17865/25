// Поиск и результаты
class SearchManager {
    constructor() {
        this.resultsPanel = document.getElementById('searchResultsPanel');
        this.resultsContent = document.getElementById('searchResultsContent');
        this.searchInput = document.getElementById('searchInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.closeResults = document.getElementById('closeResults');
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Поиск по кнопке
        this.searchBtn.addEventListener('click', () => this.performSearch());
        
        // Поиск по Enter
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
        
        // Закрытие результатов
        this.closeResults.addEventListener('click', () => {
            this.hideResults();
        });
        
        // Клик вне панели
        document.addEventListener('click', (e) => {
            if (!this.resultsPanel.contains(e.target) && 
                e.target !== this.searchBtn && 
                !this.searchBtn.contains(e.target) &&
                e.target !== this.searchInput && 
                !this.searchInput.contains(e.target)) {
                this.hideResults();
            }
        });
    }
    
    async performSearch() {
        const query = this.searchInput.value.trim();
        
        if (!query) {
            showNotification('Введите поисковый запрос');
            return;
        }
        
        // Показываем индикатор загрузки
        this.showLoading();
        
        // Ищем в данных
        const results = this.searchInData(query);
        
        // Отображаем результаты
        this.displayResults(results, query);
        
        // Показываем панель
        this.showResults();
        
        // Прокручиваем на первую найденную точку
        if (results.length > 0) {
            this.focusOnFirstResult(results[0]);
        }
    }
    
    searchInData(query) {
        if (!window.pointsData || !Array.isArray(window.pointsData)) {
            console.warn('Нет данных для поиска');
            return [];
        }
        
        const searchTerm = query.toLowerCase();
        
        return window.pointsData.filter(point => {
            // Поиск по названию
            if (point.name && point.name.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Поиск по описанию
            if (point.description && point.description.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Поиск по адресу
            if (point.address && point.address.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Поиск по типу
            if (point.type && point.type.toLowerCase().includes(searchTerm)) {
                return true;
            }
            
            // Поиск по услугам
            if (point.services && Array.isArray(point.services)) {
                const serviceMatch = point.services.some(service => 
                    service.toLowerCase().includes(searchTerm)
                );
                if (serviceMatch) return true;
            }
            
            return false;
        });
    }
    
    displayResults(results, query) {
        this.resultsContent.innerHTML = '';
        
        if (results.length === 0) {
            this.resultsContent.innerHTML = `
                <div class="no-results">
                    <div style="font-size: 40px; margin-bottom: 10px;">🔍</div>
                    <p>По запросу "<strong>${query}</strong>" ничего не найдено</p>
                    <p style="font-size: 13px; margin-top: 10px; color: #b0b0b0;">
                        Попробуйте другой запрос или добавьте точку сами
                    </p>
                </div>
            `;
            return;
        }
        
        const resultsCount = document.createElement('div');
        resultsCount.className = 'results-count';
        resultsCount.innerHTML = `<p>Найдено результатов: <strong>${results.length}</strong></p>`;
        this.resultsContent.appendChild(resultsCount);
        
        results.forEach(point => {
            const resultItem = this.createResultItem(point);
            this.resultsContent.appendChild(resultItem);
        });
    }
    
    createResultItem(point) {
        const item = document.createElement('div');
        item.className = `search-result-item ${point.type}`;
        
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
        
        const typeNames = {
            fuel: 'Заправка',
            parking: 'Парковка',
            hotel: 'Гостиница',
            food: 'Кафе/Столовка',
            service: 'Автосервис',
            tire: 'Шиномонтаж',
            wash: 'Мойка',
            ferry: 'Паром',
            border: 'Пост/Весовые',
            danger: 'Сложный участок'
        };
        
        item.innerHTML = `
            <div class="result-header">
                <span class="result-icon">${icons[point.type] || '📍'}</span>
                <span class="result-name">${point.name}</span>
            </div>
            <div class="result-details">
                <strong>${typeNames[point.type] || 'Объект'}</strong>
                ${point.description ? `<div style="margin-top: 5px;">${point.description}</div>` : ''}
            </div>
            ${point.address ? `<div class="result-address">${point.address}</div>` : ''}
            ${point.phone ? `<div style="margin-top: 5px; font-size: 12px; color: #4caf50;">📞 ${point.phone}</div>` : ''}
            <div class="result-actions">
                <button class="result-btn route" onclick="searchManager.useAsRouteDestination(${point.lat}, ${point.lng}, '${point.name}')">
                    🚚 Маршрут сюда
                </button>
                <button class="result-btn details" onclick="searchManager.showPointDetails(${point.id})">
                    ℹ️ Подробнее
                </button>
            </div>
        `;
        
        // Клик по самому элементу
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.result-btn')) {
                this.focusOnPoint(point);
            }
        });
        
        return item;
    }
    
    focusOnPoint(point) {
        // Находим маркер на карте
        const marker = allMarkers.find(m => {
            const latLng = m.getLatLng();
            return latLng.lat === point.lat && latLng.lng === point.lng;
        });
        
        if (marker) {
            marker.openPopup();
            map.setView([point.lat, point.lng], 15);
        } else {
            // Если маркер не найден, просто перемещаем карту
            map.setView([point.lat, point.lng], 15);
            showNotification(`Точка: ${point.name}`);
        }
    }
    
    focusOnFirstResult(point) {
        this.focusOnPoint(point);
    }
    
    useAsRouteDestination(lat, lng, name) {
        document.getElementById('routeTo').value = name;
        window.routeManager.setDestination(lat, lng);
        this.hideResults();
        showNotification(`Точка "${name}" установлена как пункт назначения`);
    }
    
    showPointDetails(pointId) {
        // Находим точку в данных
        const point = window.pointsData.find(p => p.id === pointId);
        if (point) {
            this.showDetailedPopup(point);
        }
    }
    
    showDetailedPopup(point) {
        // Закрываем панель результатов
        this.hideResults();
        
        // Находим маркер и открываем попап
        const marker = allMarkers.find(m => {
            const latLng = m.getLatLng();
            return Math.abs(latLng.lat - point.lat) < 0.0001 && 
                   Math.abs(latLng.lng - point.lng) < 0.0001;
        });
        
        if (marker) {
            marker.openPopup();
            map.setView([point.lat, point.lng], 16);
        }
    }
    
    showLoading() {
        this.resultsContent.innerHTML = `
            <div class="no-results">
                <div style="font-size: 40px; margin-bottom: 10px;">⏳</div>
                <p>Идет поиск...</p>
            </div>
        `;
    }
    
    showResults() {
        this.resultsPanel.classList.add('active');
    }
    
    hideResults() {
        this.resultsPanel.classList.remove('active');
    }
    
    clearSearch() {
        this.searchInput.value = '';
        this.hideResults();
    }
}

// Глобальная переменная
let searchManager;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    searchManager = new SearchManager();
});
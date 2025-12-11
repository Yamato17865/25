// Функции для оффлайн режима
console.log('Offline module loaded');

// Проверка соединения
function checkConnection() {
    return navigator.onLine;
}

// Сохранение данных для оффлайн
function saveForOffline(data, key) {
    if (!('localStorage' in window)) return false;
    
    try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log(`Данные сохранены для оффлайн: ${key}`);
        return true;
    } catch (e) {
        console.error('Ошибка сохранения:', e);
        return false;
    }
}

// Загрузка оффлайн данных
function loadOfflineData(key) {
    if (!('localStorage' in window)) return null;
    
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Ошибка загрузки:', e);
        return null;
    }
}

// Отслеживание состояния сети
window.addEventListener('online', () => {
    console.log('Соединение восстановлено');
    showNotification('✅ Соединение восстановлено');
});

window.addEventListener('offline', () => {
    console.log('Нет соединения');
    showNotification('⚠️ Вы в оффлайн режиме');
});

// Показать уведомление
function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('ТраксКарта', {
            body: message,
            icon: '/icons/icon-72x72.png'
        });
    } else {
        // Просто алерт для демо
        alert(message);
    }
}
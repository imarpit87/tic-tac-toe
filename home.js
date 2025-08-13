// Home page functionality
document.addEventListener('DOMContentLoaded', function() {
    const themeSelect = document.getElementById('themeSelect');
    
    // Load saved theme
    try {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
    } catch (error) {
        console.error('Error loading theme:', error);
    }
    
    // Theme switcher functionality
    themeSelect?.addEventListener('change', () => {
        const theme = themeSelect.value;
        setTheme(theme);
    });
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (themeSelect) themeSelect.value = theme;
        try {
            localStorage.setItem('theme', theme);
        } catch (error) {
            console.error('Error saving theme:', error);
        }
    }
});

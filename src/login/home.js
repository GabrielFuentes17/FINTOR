const $welcomeTitle = document.getElementById('welcomeTitle');
const $logoutButton = document.getElementById('logoutButton');

const currentUsername = new URLSearchParams(window.location.search).get('username') || 'user';

$welcomeTitle.textContent = `Welcome, ${currentUsername}`;

$logoutButton.addEventListener('click', () => {
  window.location.href = 'login.html';
});
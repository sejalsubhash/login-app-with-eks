// Frontend calls /api/* which nginx proxies to the backend Service inside the cluster.
// See nginx.conf — this keeps the frontend config identical across environments.
const API_BASE = '/api';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const alertBox = document.getElementById('alert');
const profileBox = document.getElementById('profile');
const profileInfo = document.getElementById('profile-info');
const logoutBtn = document.getElementById('logout-btn');

function showAlert(message, type = 'error') {
  alertBox.textContent = message;
  alertBox.className = `alert ${type}`;
}

function clearAlert() {
  alertBox.className = 'alert hidden';
}

showRegisterLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.classList.toggle('hidden');
  registerForm.classList.toggle('hidden');
  clearAlert();
});

async function showProfile(token, user) {
  loginForm.classList.add('hidden');
  registerForm.classList.add('hidden');
  profileBox.classList.remove('hidden');
  profileInfo.textContent = `Signed in as ${user.username} (${user.email})`;
  localStorage.setItem('token', token);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert(data.message || 'Login failed');
      return;
    }
    showProfile(data.token, data.user);
  } catch (err) {
    showAlert('Could not reach the server. Please try again.');
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      showAlert(data.message || 'Registration failed');
      return;
    }
    showAlert('Account created! You can log in now.', 'success');
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
  } catch (err) {
    showAlert('Could not reach the server. Please try again.');
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  profileBox.classList.add('hidden');
  loginForm.classList.remove('hidden');
  loginForm.reset();
});

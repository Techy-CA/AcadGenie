// Firebase references
const auth = firebase.auth();
const db = firebase.firestore();

// State
let currentUser = null;
let achievements = [];
let deleteConfirmCallback = null;
let currentFilter = 'all';
let currentView = 'grid';
let currentSort = 'date-desc';
let filteredAchievements = [];

// Initialize app
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        showDashboard();
        loadUserData();
        initializeDashboard();
    } else {
        currentUser = null;
        showLoginScreen();
    }
});

function showLoginScreen() {
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
    showLogin();
}

function showDashboard() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';
    updatePersonalization();
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginUserId').value.trim() + '@acadport.app';
    const password = document.getElementById('loginPassword').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => showNotification('Login successful!'))
        .catch((error) => showNotification('Invalid credentials: ' + error.message, 'error'));
}

function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const userId = document.getElementById('registerUserId').value.trim();
    const email = userId + '@acadport.app';
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters!', 'error');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => userCredential.user.updateProfile({ displayName: name }))
        .then(() => showNotification(`Welcome, ${name}!`))
        .catch((error) => {
            if (error.code === 'auth/email-already-in-use') {
                showNotification('User ID already exists!', 'error');
            } else {
                showNotification('Error: ' + error.message, 'error');
            }
        });
}

function handleLogout() {
    openLogoutModal();
}

function confirmLogout() {
    auth.signOut().then(() => {
        achievements = [];
        closeLogoutModal();
        showNotification('Logged out successfully!');
    }).catch((error) => showNotification('Logout error: ' + error.message, 'error'));
}

function loadUserData() {
    if (!currentUser) return;
    
    db.collection('users').doc(currentUser.uid).collection('achievements')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            achievements = [];
            snapshot.forEach((doc) => {
                achievements.push({ id: doc.id, ...doc.data() });
            });
            renderAchievements();
            updateStats();
        }, (error) => showNotification('Error loading data: ' + error.message, 'error'));
}

function saveAchievement(e) {
    e.preventDefault();
    
    const achievementData = {
        type: document.getElementById('entryType').value,
        title: document.getElementById('entryTitle').value,
        description: document.getElementById('entryDescription').value,
        date: document.getElementById('entryDate').value,
        grade: document.getElementById('entryGrade').value,
        institution: document.getElementById('entryInstitution').value,
        category: document.getElementById('entryCategory').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const entryId = document.getElementById('entryId').value;
    
    if (entryId) {
        db.collection('users').doc(currentUser.uid).collection('achievements')
            .doc(entryId).update(achievementData)
            .then(() => {
                closeModal();
                showNotification('Entry updated!');
            })
            .catch((error) => showNotification('Error: ' + error.message, 'error'));
    } else {
        achievementData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        
        db.collection('users').doc(currentUser.uid).collection('achievements')
            .add(achievementData)
            .then(() => {
                closeModal();
                showNotification('Entry added!');
            })
            .catch((error) => showNotification('Error: ' + error.message, 'error'));
    }
}

function deleteAchievement(id) {
    openConfirmModal(() => {
        db.collection('users').doc(currentUser.uid).collection('achievements')
            .doc(id).delete()
            .then(() => showNotification('Entry deleted!'))
            .catch((error) => showNotification('Error: ' + error.message, 'error'));
    });
    closeAllDropdowns();
}

function updatePersonalization() {
    if (currentUser) {
        const name = currentUser.displayName || 'User';
        document.getElementById('userNameDisplay').textContent = `${name}'s`;
        document.getElementById('welcomeMessage').textContent = `Welcome back, ${name}!`;
    }
}

function initializeDashboard() { renderAchievements(); updateStats(); updateView(); }

const addBtn = document.getElementById('addBtn');
const addModal = document.getElementById('addModal');
const closeBtn = document.getElementById('closeBtn');
const achievementForm = document.getElementById('achievementForm');
const achievementsGrid = document.getElementById('achievementsGrid');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const navBtns = document.querySelectorAll('.nav-btn');
const viewBtns = document.querySelectorAll('.view-btn');
const themeToggle = document.getElementById('themeToggle');
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
const logoutBtn = document.getElementById('logoutBtn');
const importModal = document.getElementById('importModal');
const exportModal = document.getElementById('exportModal');
const closeImportBtn = document.getElementById('closeImportBtn');
const closeExportBtn = document.getElementById('closeExportBtn');

document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
document.getElementById('showRegisterLink').addEventListener('click', (e) => { e.preventDefault(); showRegister(); });
document.getElementById('showLoginLink').addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
if (addBtn) addBtn.addEventListener('click', () => openModal());
if (closeBtn) closeBtn.addEventListener('click', closeModal);
if (closeImportBtn) closeImportBtn.addEventListener('click', closeImportModal);
if (closeExportBtn) closeExportBtn.addEventListener('click', closeExportModal);

document.getElementById('logoutCancel')?.addEventListener('click', closeLogoutModal);
document.getElementById('logoutConfirm')?.addEventListener('click', confirmLogout);

window.addEventListener('click', (e) => {
    if (e.target === addModal) closeModal();
    if (e.target === importModal) closeImportModal();
    if (e.target === exportModal) closeExportModal();
    if (e.target === document.getElementById('confirmModal')) closeConfirmModal();
    if (e.target === document.getElementById('logoutModal')) closeLogoutModal();
    if (!e.target.closest('.card-menu-wrapper')) closeAllDropdowns();
});

if (achievementForm) achievementForm.addEventListener('submit', saveAchievement);
if (searchInput) searchInput.addEventListener('input', filterAchievements);
if (sortSelect) sortSelect.addEventListener('change', (e) => { currentSort = e.target.value; filterAchievements(); });

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        filterAchievements();
    });
});

viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        updateView();
    });
});

if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
if (menuToggle) menuToggle.addEventListener('click', () => mainNav.classList.toggle('active'));

document.getElementById('confirmCancel')?.addEventListener('click', closeConfirmModal);
document.getElementById('confirmDelete')?.addEventListener('click', () => {
    if (deleteConfirmCallback) deleteConfirmCallback();
    closeConfirmModal();
});

function openModal(achievement = null) {
    if (achievement) {
        document.getElementById('modalTitle').textContent = 'Edit Entry';
        document.getElementById('submitBtn').textContent = 'Update Entry';
        document.getElementById('entryId').value = achievement.id;
        document.getElementById('entryType').value = achievement.type;
        document.getElementById('entryTitle').value = achievement.title;
        document.getElementById('entryDescription').value = achievement.description;
        document.getElementById('entryDate').value = achievement.date;
        document.getElementById('entryGrade').value = achievement.grade || '';
        document.getElementById('entryInstitution').value = achievement.institution || '';
        document.getElementById('entryCategory').value = achievement.category || '';
    } else {
        document.getElementById('modalTitle').textContent = 'Add New Entry';
        document.getElementById('submitBtn').textContent = 'Add Entry';
        achievementForm.reset();
        document.getElementById('entryId').value = '';
    }
    addModal.classList.add('active');
}

function closeModal() { addModal.classList.remove('active'); achievementForm.reset(); }
function closeImportModal() { importModal.classList.remove('active'); }
function closeExportModal() { exportModal.classList.remove('active'); }
function openLogoutModal() { document.getElementById('logoutModal').classList.add('active'); }
function closeLogoutModal() { document.getElementById('logoutModal').classList.remove('active'); }
function openConfirmModal(callback) { deleteConfirmCallback = callback; document.getElementById('confirmModal').classList.add('active'); }
function closeConfirmModal() { document.getElementById('confirmModal').classList.remove('active'); deleteConfirmCallback = null; }
function editAchievement(id) { const achievement = achievements.find(a => a.id === id); if (achievement) openModal(achievement); closeAllDropdowns(); }
function toggleDropdown(id) {
    document.querySelectorAll('.card-menu-dropdown').forEach(dropdown => {
        if (dropdown.id !== `dropdown-${id}`) dropdown.classList.remove('active');
    });
    const dropdown = document.getElementById(`dropdown-${id}`);
    if (dropdown) dropdown.classList.toggle('active');
}
function closeAllDropdowns() { document.querySelectorAll('.card-menu-dropdown').forEach(dropdown => dropdown.classList.remove('active')); }
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}
function sortAchievements(data) {
    return data.sort((a, b) => {
        switch(currentSort) {
            case 'date-desc': return new Date(b.date) - new Date(a.date);
            case 'date-asc': return new Date(a.date) - new Date(b.date);
            case 'title-asc': return a.title.localeCompare(b.title);
            case 'title-desc': return b.title.localeCompare(a.title);
            default: return 0;
        }
    });
}

function renderAchievements(data = achievements) {
    if (!achievementsGrid) return;
    achievementsGrid.innerHTML = '';
    if (data.length === 0) {
        achievementsGrid.innerHTML = '<div class="empty-state"><h3>No entries found</h3><p>Start adding your academic achievements!</p></div>';
        return;
    }
    const sortedData = sortAchievements([...data]);
    filteredAchievements = sortedData;
    sortedData.forEach(achievement => {
        const card = document.createElement('div');
        card.className = `achievement-card ${achievement.type}`;
        card.innerHTML = `
            <div class="card-header">
                <span class="card-badge ${achievement.type}">${achievement.type}</span>
                <div class="card-menu-wrapper">
                    <button class="card-menu-btn" onclick="toggleDropdown('${achievement.id}')" aria-label="More options">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>
                    <div class="card-menu-dropdown" id="dropdown-${achievement.id}">
                        <button class="dropdown-item" onclick="editAchievement('${achievement.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit
                        </button>
                        <button class="dropdown-item delete" onclick="deleteAchievement('${achievement.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
            <h3 class="card-title">${achievement.title}</h3>
            <p class="card-description">${achievement.description}</p>
            ${achievement.institution || achievement.category ? `
                <div class="card-meta">
                    ${achievement.institution ? `<span class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                            <polyline points="9 22 9 12 15 12 15 22"></polyline>
                        </svg>
                        ${achievement.institution}
                    </span>` : ''}
                    ${achievement.category ? `<span class="meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        ${achievement.category}
                    </span>` : ''}
                </div>
            ` : ''}
            <div class="card-footer">
                <span class="card-date">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    ${formatDate(achievement.date)}
                </span>
                ${achievement.grade ? `<span class="card-grade">${achievement.grade}</span>` : ''}
            </div>
        `;
        achievementsGrid.appendChild(card);
    });
}

function filterAchievements() {
    const searchTerm = searchInput?.value.toLowerCase() || '';
    let filtered = achievements;
    if (currentFilter !== 'all') filtered = filtered.filter(achievement => achievement.type === currentFilter);
    if (searchTerm) {
        filtered = filtered.filter(achievement =>
            achievement.title.toLowerCase().includes(searchTerm) ||
            achievement.description.toLowerCase().includes(searchTerm) ||
            (achievement.grade && achievement.grade.toLowerCase().includes(searchTerm)) ||
            (achievement.institution && achievement.institution.toLowerCase().includes(searchTerm)) ||
            (achievement.category && achievement.category.toLowerCase().includes(searchTerm))
        );
    }
    renderAchievements(filtered);
}

function updateStats() {
    const totalCount = document.getElementById('totalCount');
    const achievementCount = document.getElementById('achievementCount');
    const resultCount = document.getElementById('resultCount');
    const recordCount = document.getElementById('recordCount');
    if (totalCount) totalCount.textContent = achievements.length;
    if (achievementCount) achievementCount.textContent = achievements.filter(a => a.type === 'achievement').length;
    if (resultCount) resultCount.textContent = achievements.filter(a => a.type === 'result').length;
    if (recordCount) recordCount.textContent = achievements.filter(a => a.type === 'record').length;
}

function updateView() {
    if (currentView === 'list') achievementsGrid?.classList.add('list-view');
    else achievementsGrid?.classList.remove('list-view');
}

function toggleTheme() {
    const button = document.getElementById('themeToggle');
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const circle = document.getElementById('themeCircle');
    const maxRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    circle.style.width = circle.style.height = maxRadius * 2 + 'px';
    circle.style.left = x + 'px';
    circle.style.top = y + 'px';
    circle.classList.add('active');
    setTimeout(() => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        setTimeout(() => circle.classList.remove('active'), 800);
    }, 0);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 1rem 1.5rem;
        background: ${type === 'error' ? 'var(--danger-600)' : 'var(--success-600)'};
        color: white; border-radius: var(--radius); box-shadow: var(--shadow-xl);
        z-index: 10000; font-size: 0.875rem; font-weight: 500;
        animation: slideInNotif 0.3s ease;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOutNotif 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Import/Export/Backup Functions

// CSV Import
function handleCsvImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const csv = event.target.result;
        const lines = csv.split('\n');
        
        let imported = 0;
        const promises = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const achievementData = {
                type: values[0] || 'achievement',
                title: values[1] || 'Untitled',
                description: values[2] || '',
                date: values[3] || new Date().toISOString().split('T')[0],
                grade: values[4] || '',
                institution: values[5] || '',
                category: values[6] || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            promises.push(
                db.collection('users').doc(currentUser.uid).collection('achievements').add(achievementData)
            );
            imported++;
        }

        Promise.all(promises)
            .then(() => {
                closeImportModal();
                showNotification(`Successfully imported ${imported} entries!`);
                e.target.value = '';
            })
            .catch(error => showNotification('Import error: ' + error.message, 'error'));
    };
    reader.readAsText(file);
}

// JSON Import
function handleJsonImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const imported = JSON.parse(event.target.result);
            if (!Array.isArray(imported)) {
                showNotification('Invalid JSON format. Expected an array.', 'error');
                return;
            }

            const promises = [];
            imported.forEach(entry => {
                const achievementData = {
                    type: entry.type || 'achievement',
                    title: entry.title || 'Untitled',
                    description: entry.description || '',
                    date: entry.date || new Date().toISOString().split('T')[0],
                    grade: entry.grade || '',
                    institution: entry.institution || '',
                    category: entry.category || '',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                promises.push(
                    db.collection('users').doc(currentUser.uid).collection('achievements').add(achievementData)
                );
            });

            Promise.all(promises)
                .then(() => {
                    closeImportModal();
                    showNotification(`Successfully imported ${imported.length} entries!`);
                    e.target.value = '';
                })
                .catch(error => showNotification('Import error: ' + error.message, 'error'));
        } catch (error) {
            showNotification('Error parsing JSON file.', 'error');
        }
    };
    reader.readAsText(file);
}

// JSON Paste Import
function handleJsonPaste() {
    const jsonText = document.getElementById('jsonTextInput').value;
    if (!jsonText.trim()) {
        showNotification('Please paste JSON data first.', 'error');
        return;
    }

    try {
        const imported = JSON.parse(jsonText);
        if (!Array.isArray(imported)) {
            showNotification('Invalid JSON format. Expected an array.', 'error');
            return;
        }

        const promises = [];
        imported.forEach(entry => {
            const achievementData = {
                type: entry.type || 'achievement',
                title: entry.title || 'Untitled',
                description: entry.description || '',
                date: entry.date || new Date().toISOString().split('T')[0],
                grade: entry.grade || '',
                institution: entry.institution || '',
                category: entry.category || '',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            promises.push(
                db.collection('users').doc(currentUser.uid).collection('achievements').add(achievementData)
            );
        });

        Promise.all(promises)
            .then(() => {
                closeImportModal();
                document.getElementById('jsonTextInput').value = '';
                showNotification(`Successfully imported ${imported.length} entries!`);
            })
            .catch(error => showNotification('Import error: ' + error.message, 'error'));
    } catch (error) {
        showNotification('Error parsing JSON data.', 'error');
    }
}

// Export to CSV
function exportToCsv() {
    if (achievements.length === 0) {
        showNotification('No data to export.', 'error');
        return;
    }
    
    const csv = convertToCSV(achievements);
    downloadFile(csv, 'academic-achievements.csv', 'text/csv');
    closeExportModal();
    showNotification('Data exported to CSV successfully!');
}

// Export to JSON
function exportToJson() {
    if (achievements.length === 0) {
        showNotification('No data to export.', 'error');
        return;
    }
    
    const json = JSON.stringify(achievements, null, 2);
    downloadFile(json, 'academic-achievements.json', 'application/json');
    closeExportModal();
    showNotification('Data exported to JSON successfully!');
}

// Export Filtered Data
function exportFiltered() {
    if (filteredAchievements.length === 0) {
        showNotification('No data to export.', 'error');
        return;
    }
    
    const json = JSON.stringify(filteredAchievements, null, 2);
    downloadFile(json, 'filtered-achievements.json', 'application/json');
    closeExportModal();
    showNotification(`Exported ${filteredAchievements.length} filtered entries!`);
}

// Convert to CSV Helper
function convertToCSV(data) {
    const headers = ['type', 'title', 'description', 'date', 'grade', 'institution', 'category'];
    const csvRows = [headers.join(',')];
    
    data.forEach(item => {
        const values = headers.map(header => {
            const value = item[header] || '';
            return `"${value.toString().replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
}

// Download File Helper
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Download CSV Template
function downloadCsvTemplate() {
    const template = 'type,title,description,date,grade,institution,category\nachievement,Example Achievement,This is a sample description,2025-01-15,A+,University Name,Computer Science';
    downloadFile(template, 'template.csv', 'text/csv');
    showNotification('CSV template downloaded!');
}

// Download JSON Template
function downloadJsonTemplate() {
    const template = [
        {
            type: 'achievement',
            title: 'Example Achievement',
            description: 'This is a sample description',
            date: '2025-01-15',
            grade: 'A+',
            institution: 'University Name',
            category: 'Computer Science'
        }
    ];
    const json = JSON.stringify(template, null, 2);
    downloadFile(json, 'template.json', 'application/json');
    showNotification('JSON template downloaded!');
}

// Create Backup
function createBackup() {
    if (achievements.length === 0) {
        showNotification('No data to backup.', 'error');
        return;
    }
    
    const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        user: currentUser.displayName || currentUser.email,
        userId: currentUser.uid,
        totalEntries: achievements.length,
        data: achievements
    };
    
    const json = JSON.stringify(backup, null, 2);
    const filename = `backup_${currentUser.displayName || 'user'}_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(json, filename, 'application/json');
    showNotification('Backup created successfully!');
}

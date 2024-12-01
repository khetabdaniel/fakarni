// User Authentication
let currentUser = null;

// Check if user is already logged in
function checkAuth() {
    const user = localStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        showTaskContainer();
    }
}

function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showTaskContainer();
        loadProfileData();
    } else {
        alert('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
}

function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
        alert('الرجاء ملء جميع الحقول');
        return;
    }

    if (!validateEmail(email)) {
        alert('الرجاء إدخال بريد إلكتروني صحيح');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.some(u => u.email === email)) {
        alert('البريد الإلكتروني مسجل بالفعل');
        return;
    }

    const newUser = {
        name,
        email,
        password,
        profileImage: null,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    currentUser = newUser;
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    showTaskContainer();
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showAuthContainer();
}

function toggleAuth() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

// Profile Management
function showProfile() {
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'block';
    loadProfileData();
    updateTaskStats();
}

function closeProfile() {
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'none';
}

function loadProfileData() {
    if (currentUser) {
        document.getElementById('profile-name').value = currentUser.name;
        document.getElementById('profile-email').value = currentUser.email;
        document.getElementById('user-name-display').textContent = currentUser.name;
        if (currentUser.profileImage) {
            document.getElementById('profile-image').src = currentUser.profileImage;
        }
    }
}

function updateProfileImage() {
    const input = document.getElementById('profile-image-input');
    const file = input.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = e.target.result;
            document.getElementById('profile-image').src = imageData;
            currentUser.profileImage = imageData;
            updateCurrentUser();
        };
        reader.readAsDataURL(file);
    }
}

function updateProfile() {
    const newName = document.getElementById('profile-name').value;
    const currentPassword = document.getElementById('profile-current-password').value;
    const newPassword = document.getElementById('profile-new-password').value;

    if (!newName) {
        alert('الرجاء إدخال الاسم');
        return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === currentUser.email);

    if (userIndex === -1) {
        alert('حدث خطأ في تحديث الملف الشخصي');
        return;
    }

    if (currentPassword) {
        if (currentPassword !== users[userIndex].password) {
            alert('كلمة المرور الحالية غير صحيحة');
            return;
        }
        if (newPassword) {
            users[userIndex].password = newPassword;
        }
    }

    users[userIndex].name = newName;
    users[userIndex].profileImage = currentUser.profileImage;
    
    localStorage.setItem('users', JSON.stringify(users));
    currentUser = users[userIndex];
    updateCurrentUser();

    alert('تم تحديث الملف الشخصي بنجاح');
    document.getElementById('profile-current-password').value = '';
    document.getElementById('profile-new-password').value = '';
}

function updateTaskStats() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]')
        .filter(task => task.userId === currentUser.email);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const pendingTasks = tasks.filter(task => !task.completed).length;
    const overdueTasks = tasks.filter(task => !task.completed && isOverdue(task.deadline)).length;

    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('completed-tasks').textContent = completedTasks;
    document.getElementById('pending-tasks').textContent = pendingTasks;
    document.getElementById('overdue-tasks').textContent = overdueTasks;
}

function updateCurrentUser() {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    loadProfileData();
}

// Task Management
function addTask() {
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;

    if (!title || !deadline) {
        alert('الرجاء إدخال عنوان المهمة والموعد النهائي');
        return;
    }

    const task = {
        id: Date.now(),
        title,
        description,
        deadline,
        priority,
        completed: false,
        userId: currentUser.email
    };

    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks.push(task);
    localStorage.setItem('tasks', JSON.stringify(tasks));

    // جدولة الإشعارات للمهمة الجديدة
    scheduleTaskNotification(task);

    // Reset form
    document.getElementById('task-title').value = '';
    document.getElementById('task-description').value = '';
    document.getElementById('task-deadline').value = '';
    document.getElementById('task-priority').value = 'low';

    displayTasks();
    showSystemNotification('مهمة جديدة', {
        body: 'تم إضافة مهمة جديدة بنجاح',
        tag: 'new-task',
    });
}

function displayTasks(filter = 'all') {
    const tasksContainer = document.getElementById('tasks');
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]')
        .filter(task => task.userId === currentUser.email);

    let filteredTasks = tasks;
    if (filter === 'pending') {
        filteredTasks = tasks.filter(task => !task.completed);
    } else if (filter === 'completed') {
        filteredTasks = tasks.filter(task => task.completed);
    }

    tasksContainer.innerHTML = filteredTasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''} ${!task.completed && isOverdue(task.deadline) ? 'overdue' : ''}" data-id="${task.id}">
            <div class="task-header">
                <span class="task-title">${task.title}</span>
                <span class="task-priority">${getPriorityIcon(task.priority)}</span>
            </div>
            <div class="task-description">${task.description}</div>
            <div class="task-deadline">الموعد النهائي: ${formatDateTime(task.deadline)}</div>
            <div class="task-actions">
                <button onclick="toggleTaskComplete(${task.id})" class="complete-btn">
                    ${task.completed ? 'تراجع' : 'اكتمل'}
                </button>
                <button onclick="deleteTask(${task.id})" class="delete-btn">حذف</button>
            </div>
        </div>
    `).join('');

    checkIncompleteTasks();
}

function getPriorityIcon(priority) {
    const icons = {
        low: '🔵',
        medium: '🟡',
        high: '🔴'
    };
    return icons[priority] || '🔵';
}

function formatDateTime(dateTime) {
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        numberingSystem: 'latn'
    };
    return new Date(dateTime).toLocaleString('en-US', options);
}

function isOverdue(deadline) {
    return new Date(deadline) < new Date();
}

function toggleTaskComplete(taskId) {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        
        if (tasks[taskIndex].completed) {
            showSystemNotification('اكتمال المهمة', {
                body: `تم إكمال المهمة: ${tasks[taskIndex].title}`,
                tag: 'task-complete',
            });
        }
        
        localStorage.setItem('tasks', JSON.stringify(tasks));
        displayTasks();
        updateTaskStats();
    }
}

function showSystemNotification(title, options = {}) {
    if (!('Notification' in window)) {
        return;
    }

    if (Notification.permission === 'granted') {
        const defaultOptions = {
            icon: '/icon.png',
            badge: '/badge.png',
            dir: 'rtl',
            lang: 'ar',
            vibrate: [100, 50, 100],
            requireInteraction: true
        };

        const notification = new Notification(title, { ...defaultOptions, ...options });
        
        notification.onclick = function() {
            window.focus();
            notification.close();
        };
    }
}

function checkIncompleteTasks() {
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]')
        .filter(task => task.userId === currentUser.email);
    
    const incompleteTasks = tasks.filter(task => !task.completed);
    const overdueTasks = incompleteTasks.filter(task => isOverdue(task.deadline));
    const upcomingTasks = incompleteTasks.filter(task => {
        const deadline = new Date(task.deadline);
        const now = new Date();
        const timeDiff = deadline - now;
        return timeDiff > 0 && timeDiff <= 24 * 60 * 60 * 1000; // 24 hours
    });

    if (overdueTasks.length > 0) {
        showSystemNotification('مهام متأخرة', {
            body: `لديك ${overdueTasks.length} مهمة متأخرة تحتاج إلى اهتمامك`,
            tag: 'overdue-tasks',
        });
    }

    if (upcomingTasks.length > 0) {
        showSystemNotification('مهام قادمة', {
            body: `لديك ${upcomingTasks.length} مهمة تنتهي خلال 24 ساعة`,
            tag: 'upcoming-tasks',
        });
    }
}

function deleteTask(taskId) {
    if (confirm('هل أنت متأكد من حذف هذه المهمة؟')) {
        const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        const filteredTasks = tasks.filter(t => t.id !== taskId);
        localStorage.setItem('tasks', JSON.stringify(filteredTasks));
        displayTasks();
    }
}

function filterTasks(filter) {
    const buttons = document.querySelectorAll('.task-filters button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    displayTasks(filter);
}

// PWA Installation
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // منع ظهور مربع الحوار التلقائي للتثبيت
    e.preventDefault();
    // تخزين الحدث للاستخدام لاحقاً
    deferredPrompt = e;
    // إظهار زر التثبيت المخصص
    showInstallPrompt();
});

function showInstallPrompt() {
    const installPrompt = document.getElementById('install-prompt');
    installPrompt.style.display = 'block';

    document.getElementById('install-button').addEventListener('click', async () => {
        // إخفاء مربع حوار التثبيت
        installPrompt.style.display = 'none';
        // إظهار مربع حوار التثبيت الأصلي
        deferredPrompt.prompt();
        // انتظار اختيار المستخدم
        const { outcome } = await deferredPrompt.userChoice;
        // تصفير المتغير
        deferredPrompt = null;
    });
}

function closeInstallPrompt() {
    document.getElementById('install-prompt').style.display = 'none';
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker تم تسجيل:', registration);
            })
            .catch(error => {
                console.error('Service Worker خطأ في تسجيل:', error);
            });
    });
}

// Notification System
async function initializeNotifications() {
    if (!('Notification' in window)) {
        console.log('هذا المتصفح لا يدعم الإشعارات');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            registerServiceWorker();
        }
    } catch (error) {
        console.error('خطأ في طلب إذن الإشعارات:', error);
    }
}

async function registerServiceWorker() {
    try {
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker تم تسجيل', registration);
        }
    } catch (error) {
        console.error('فشل تسجيل Service Worker:', error);
    }
}

// Schedule Notifications
function scheduleTaskNotification(task) {
    if (!task.completed) {
        const deadline = new Date(task.deadline);
        const now = new Date();
        
        // إشعار قبل ساعة من الموعد النهائي
        const oneHourBefore = new Date(deadline.getTime() - (60 * 60 * 1000));
        if (oneHourBefore > now) {
            const timeUntilNotification = oneHourBefore.getTime() - now.getTime();
            setTimeout(() => {
                showSystemNotification('تذكير بالمهمة', {
                    body: `المهمة "${task.title}" تنتهي خلال ساعة`,
                    tag: `task-reminder-${task.id}`,
                });
            }, timeUntilNotification);
        }

        // إشعار عند الموعد النهائي
        if (deadline > now) {
            const timeUntilDeadline = deadline.getTime() - now.getTime();
            setTimeout(() => {
                if (!task.completed) {
                    showSystemNotification('موعد نهائي للمهمة', {
                        body: `حان موعد تسليم المهمة: ${task.title}`,
                        tag: `task-deadline-${task.id}`,
                    });
                }
            }, timeUntilDeadline);
        }
    }
}

// UI Helpers
function showTaskContainer() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('task-container').style.display = 'block';
    displayTasks();
}

function showAuthContainer() {
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('task-container').style.display = 'none';
}

// Event Listeners
window.onclick = function(event) {
    const modal = document.getElementById('profile-modal');
    if (event.target === modal) {
        closeProfile();
    }
};

// Initialize
window.onload = async function() {
    await initializeNotifications();
    checkAuth();
    setInterval(checkIncompleteTasks, 60000); // التحقق كل دقيقة
};

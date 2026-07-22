/**
 * ============================================
 * تطبيق متابع الورد اليومي - ملف JavaScript الرئيسي
 * ============================================
 */

(function() {
  'use strict';

  // ============================================
  // إعدادات التطبيق
  // ============================================
  const APP = {
    name: 'متابع الورد اليومي',
    version: '1.0',
    storageKey: 'wardAppData'
  };

  // ============================================
  // البيانات الافتراضية
  // ============================================
  const defaultData = {
    user: {
      name: 'مستخدم',
      email: '',
      goal: 1 // عدد الأجزاء اليومية
    },
    settings: {
      themeColor: '#2e7d32',
      darkMode: false
    },
    history: {}, // { '2026-01-15': true, ... }
    streak: 0,
    lastCompletion: null,
    created: new Date().toISOString()
  };

  // ============================================
  // إدارة التخزين المحلي (LocalStorage)
  // ============================================
  const Storage = {
    get: function() {
      try {
        const data = localStorage.getItem(APP.storageKey);
        if (data) {
          return JSON.parse(data);
        }
      } catch (e) {
        console.warn('فشل قراءة البيانات:', e);
      }
      return null;
    },

    set: function(data) {
      try {
        localStorage.setItem(APP.storageKey, JSON.stringify(data));
        return true;
      } catch (e) {
        console.warn('فشل حفظ البيانات:', e);
        return false;
      }
    },

    getSession: function() {
      try {
        const session = localStorage.getItem('wardSession');
        return session ? JSON.parse(session) : null;
      } catch (e) {
        return null;
      }
    },

    setSession: function(session) {
      try {
        localStorage.setItem('wardSession', JSON.stringify(session));
        return true;
      } catch (e) {
        return false;
      }
    },

    clearSession: function() {
      localStorage.removeItem('wardSession');
    },

    clearAll: function() {
      localStorage.removeItem(APP.storageKey);
      localStorage.removeItem('wardSession');
    }
  };

  // ============================================
  // إدارة البيانات
  // ============================================
  const DataManager = {
    load: function() {
      let data = Storage.get();
      if (!data) {
        data = JSON.parse(JSON.stringify(defaultData));
        Storage.set(data);
      }
      return data;
    },

    save: function(data) {
      return Storage.set(data);
    },

    getToday: function() {
      return new Date().toISOString().split('T')[0];
    },

    isCompletedToday: function(data) {
      const today = this.getToday();
      return data.history && data.history[today] === true;
    },

    toggleToday: function(data) {
      const today = this.getToday();
      if (data.history[today]) {
        delete data.history[today];
      } else {
        data.history[today] = true;
        data.lastCompletion = today;
      }
      this.updateStats(data);
      this.save(data);
      return data;
    },

    updateStats: function(data) {
      // حساب streak
      let streak = 0;
      const today = new Date();
      const dates = Object.keys(data.history).sort();

      if (dates.length > 0) {
        // التحقق من اليوم الحالي
        const todayStr = this.getToday();
        let current = new Date(todayStr);
        
        // إذا كان اليوم منجزاً
        if (data.history[todayStr]) {
          streak = 1;
          let checkDate = new Date(todayStr);
          checkDate.setDate(checkDate.getDate() - 1);
          
          while (data.history[checkDate.toISOString().split('T')[0]]) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 1);
          }
        } else {
          // ابحث عن آخر يوم منجز
          let lastDate = null;
          for (let i = dates.length - 1; i >= 0; i--) {
            const d = new Date(dates[i]);
            if (d <= new Date(todayStr)) {
              lastDate = dates[i];
              break;
            }
          }
          
          if (lastDate) {
            const lastDateObj = new Date(lastDate);
            const diff = Math.floor((new Date(todayStr) - lastDateObj) / (1000 * 60 * 60 * 24));
            if (diff <= 1) {
              streak = 1;
              let checkDate = new Date(lastDate);
              checkDate.setDate(checkDate.getDate() - 1);
              
              while (data.history[checkDate.toISOString().split('T')[0]]) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
              }
            }
          }
        }
      }
      
      data.streak = streak;
    },

    getCompletedCount: function(data) {
      return Object.keys(data.history).filter(key => data.history[key] === true).length;
    },

    getMonthlyCompleted: function(data, year, month) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      return Object.keys(data.history).filter(key => 
        key.startsWith(prefix) && data.history[key] === true
      ).length;
    },

    getWeeklyCompleted: function(data) {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday...
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek + 1); // Monday
      
      let count = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const key = d.toISOString().split('T')[0];
        if (data.history[key]) count++;
      }
      return count;
    },

    getMaxStreak: function(data) {
      let maxStreak = 0;
      let currentStreak = 0;
      const dates = Object.keys(data.history).sort();
      
      if (dates.length === 0) return 0;
      
      let prevDate = null;
      for (const dateStr of dates) {
        if (!data.history[dateStr]) continue;
        const current = new Date(dateStr);
        if (prevDate) {
          const diff = Math.floor((current - prevDate) / (1000 * 60 * 60 * 24));
          if (diff === 1) {
            currentStreak++;
          } else {
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }
        if (currentStreak > maxStreak) maxStreak = currentStreak;
        prevDate = current;
      }
      
      return maxStreak;
    }
  };

  // ============================================
  // إدارة الجلسة
  // ============================================
  const SessionManager = {
    login: function(email, name) {
      const session = {
        email: email,
        name: name || 'مستخدم',
        loggedIn: true,
        timestamp: new Date().toISOString()
      };
      Storage.setSession(session);
      return session;
    },

    logout: function() {
      Storage.clearSession();
      window.location.href = 'login.html';
    },

    isLoggedIn: function() {
      const session = Storage.getSession();
      return session && session.loggedIn === true;
    },

    getUser: function() {
      return Storage.getSession();
    },

    // Developer Mode - دخول تجريبي
    // تنبيه: يجب إزالة هذا الخيار قبل النشر في بيئة الإنتاج (Production)
    devLogin: function() {
      const session = {
        email: 'dev@example.com',
        name: 'مستخدم تجريبي',
        loggedIn: true,
        timestamp: new Date().toISOString(),
        isDev: true
      };
      Storage.setSession(session);
      
      // إنشاء بيانات تجريبية
      let data = DataManager.load();
      if (!data.user.name || data.user.name === 'مستخدم') {
        data.user.name = 'مستخدم تجريبي';
        data.user.email = 'dev@example.com';
        DataManager.save(data);
      }
      
      window.location.href = 'index.html';
    }
  };

  // ============================================
  // حماية الصفحات
  // ============================================
  const PageGuard = {
    protect: function() {
      const currentPage = window.location.pathname.split('/').pop() || 'login.html';
      
      // الصفحات التي لا تحتاج تسجيل دخول
      const publicPages = ['login.html'];
      
      if (publicPages.includes(currentPage)) {
        // إذا كان المستخدم مسجلاً الدخول وفتح login.html، ننقله للرئيسية
        if (SessionManager.isLoggedIn() && currentPage === 'login.html') {
          window.location.href = 'index.html';
          return false;
        }
        return true;
      }
      
      // الصفحات المحمية
      if (!SessionManager.isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
      }
      
      return true;
    }
  };

  // ============================================
  // صفحة تسجيل الدخول (login.html)
  // ============================================
  function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const rememberMe = document.getElementById('rememberMe');
    const createAccountBtn = document.getElementById('createAccountBtn');
    const guestLoginBtn = document.getElementById('guestLoginBtn');
    const devModeLink = document.getElementById('devModeLink');

    // بيانات تسجيل دخول تجريبية
    const DEMO_CREDENTIALS = {
      email: 'user@example.com',
      password: '123456'
    };

    // معالج تسجيل الدخول
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();
        
        if (!email || !password) {
          showMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
          return;
        }
        
        // التحقق من البيانات التجريبية
        if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
          const name = email.split('@')[0] || 'مستخدم';
          SessionManager.login(email, name);
          
          // حفظ بيانات المستخدم
          let data = DataManager.load();
          data.user.name = name;
          data.user.email = email;
          DataManager.save(data);
          
          showMessage('تم تسجيل الدخول بنجاح!', 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 500);
        } else {
          showMessage('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error');
        }
      });
    }

    // إنشاء حساب
    if (createAccountBtn) {
      createAccountBtn.addEventListener('click', function() {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();
        
        if (!email || !password) {
          showMessage('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
          return;
        }
        
        if (password.length < 4) {
          showMessage('كلمة المرور يجب أن تكون 4 أحرف على الأقل', 'error');
          return;
        }
        
        // حفظ المستخدم الجديد
        let data = DataManager.load();
        data.user.name = email.split('@')[0] || 'مستخدم';
        data.user.email = email;
        DataManager.save(data);
        
        SessionManager.login(email, data.user.name);
        showMessage('تم إنشاء الحساب بنجاح!', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 500);
      });
    }

    // دخول كضيف
    if (guestLoginBtn) {
      guestLoginBtn.addEventListener('click', function() {
        const guestName = 'ضيف_' + Math.floor(Math.random() * 10000);
        const guestEmail = 'guest_' + Date.now() + '@temp.com';
        
        let data = DataManager.load();
        data.user.name = guestName;
        data.user.email = guestEmail;
        DataManager.save(data);
        
        SessionManager.login(guestEmail, guestName);
        showMessage('تم الدخول كضيف', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 500);
      });
    }

    // Developer Mode - دخول تجريبي
    // تنبيه هام: يجب إزالة هذا الخيار قبل نشر الموقع في بيئة الإنتاج (Production)
    if (devModeLink) {
      devModeLink.addEventListener('click', function(e) {
        e.preventDefault();
        SessionManager.devLogin();
      });
    }

    // نسيت كلمة المرور
    const forgotLink = document.getElementById('forgotPassword');
    if (forgotLink) {
      forgotLink.addEventListener('click', function(e) {
        e.preventDefault();
        showMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني', 'success');
      });
    }

    // تذكرني
    if (rememberMe) {
      const savedEmail = localStorage.getItem('rememberedEmail');
      if (savedEmail) {
        loginEmail.value = savedEmail;
        rememberMe.checked = true;
      }
      
      rememberMe.addEventListener('change', function() {
        if (this.checked) {
          localStorage.setItem('rememberedEmail', loginEmail.value);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
      });
    }
  }

  // ============================================
  // عرض الرسائل
  // ============================================
  function showMessage(text, type = 'info') {
    // إزالة الرسائل القديمة
    const oldMsg = document.querySelector('.app-message');
    if (oldMsg) oldMsg.remove();
    
    const msg = document.createElement('div');
    msg.className = `app-message ${type}`;
    msg.textContent = text;
    
    const colors = {
      success: 'linear-gradient(135deg, #2e7d32, #4caf50)',
      error: 'linear-gradient(135deg, #c62828, #e53935)',
      info: 'linear-gradient(135deg, #1565c0, #42a5f5)'
    };
    
    msg.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${colors[type] || colors.info};
      color: white;
      padding: 14px 28px;
      border-radius: 12px;
      font-family: 'Tajawal', sans-serif;
      font-weight: 500;
      font-size: 16px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
      z-index: 9999;
      animation: slideDown 0.5s ease-out;
      text-align: center;
      max-width: 90%;
      direction: rtl;
    `;
    
    document.body.appendChild(msg);
    
    // إضافة تأثير الـ Ripple
    msg.classList.add('ripple');
    
    // إزالة تلقائية بعد 3 ثوان
    setTimeout(() => {
      msg.style.opacity = '0';
      msg.style.transform = 'translateX(-50%) translateY(-20px)';
      msg.style.transition = 'all 0.4s ease';
      setTimeout(() => msg.remove(), 400);
    }, 3000);
  }

  // ============================================
  // الصفحة الرئيسية (index.html)
  // ============================================
  function initIndexPage() {
    const data = DataManager.load();
    const session = SessionManager.getUser();
    
    // عرض اسم المستخدم
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
      userNameDisplay.textContent = session ? session.name : data.user.name;
    }
    
    // تحديث التاريخ والوقت
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // تحديث واجهة المستخدم
    updateUI(data);
    
    // زر الإنجاز
    const completeBtn = document.getElementById('completeBtn');
    if (completeBtn) {
      completeBtn.addEventListener('click', function() {
        // إضافة تأثير Ripple
        this.classList.add('ripple');
        setTimeout(() => this.classList.remove('ripple'), 600);
        
        let currentData = DataManager.load();
        currentData = DataManager.toggleToday(currentData);
        updateUI(currentData);
        
        const isCompleted = DataManager.isCompletedToday(currentData);
        showMessage(isCompleted ? 'تم تسجيل الإنجاز بنجاح! 🌟' : 'تم إلغاء الإنجاز', isCompleted ? 'success' : 'info');
      });
    }
    
    // تحديث الإحصائيات كل 30 ثانية
    setInterval(() => {
      const freshData = DataManager.load();
      updateUI(freshData);
    }, 30000);
  }

  // ============================================
  // تحديث التاريخ والوقت
  // ============================================
  function updateDateTime() {
    const now = new Date();
    
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      dateEl.textContent = now.toLocaleDateString('ar-SA', options);
    }
    
    const timeEl = document.getElementById('currentTime');
    if (timeEl) {
      timeEl.textContent = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }

  // ============================================
  // تحديث واجهة المستخدم
  // ============================================
  function updateUI(data) {
    // التقدم
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const isCompleted = DataManager.isCompletedToday(data);
    const goal = data.user.goal || 1;
    const percent = isCompleted ? 100 : 0;
    
    if (progressFill) {
      progressFill.style.width = percent + '%';
    }
    if (progressPercent) {
      progressPercent.textContent = percent + '%';
    }
    
    // الأيام المتتالية
    const streakEl = document.getElementById('streakCount');
    if (streakEl) {
      streakEl.textContent = data.streak || 0;
    }
    
    // الأيام المنجزة
    const completedEl = document.getElementById('completedDays');
    if (completedEl) {
      completedEl.textContent = DataManager.getCompletedCount(data);
    }
    
    // آخر إنجاز
    const lastEl = document.getElementById('lastCompletion');
    if (lastEl) {
      if (data.lastCompletion) {
        const date = new Date(data.lastCompletion);
        lastEl.textContent = date.toLocaleDateString('ar-SA');
      } else {
        lastEl.textContent = '—';
      }
    }
    
    // تغيير لون زر الإنجاز
    const completeBtn = document.getElementById('completeBtn');
    if (completeBtn) {
      if (isCompleted) {
        completeBtn.innerHTML = '<i class="fas fa-undo"></i> إلغاء الإنجاز';
        completeBtn.style.background = 'linear-gradient(135deg, #e65100, #f57c00)';
      } else {
        completeBtn.innerHTML = '<i class="fas fa-check-circle"></i> تم الإنجاز';
        completeBtn.style.background = 'linear-gradient(135deg, #2e7d32, #4caf50)';
      }
    }
    
    // تحديث قائمة آخر الإنجازات
    updateRecentList(data);
  }

  // ============================================
  // تحديث قائمة آخر الإنجازات
  // ============================================
  function updateRecentList(data) {
    const listEl = document.getElementById('recentList');
    if (!listEl) return;
    
    const dates = Object.keys(data.history)
      .filter(key => data.history[key] === true)
      .sort((a, b) => new Date(b) - new Date(a));
    
    if (dates.length === 0) {
      listEl.innerHTML = '<li>لا توجد إنجازات بعد</li>';
      return;
    }
    
    const recent = dates.slice(0, 7);
    listEl.innerHTML = recent.map(date => {
      const d = new Date(date);
      const formatted = d.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' });
      return `<li><i class="fas fa-check-circle" style="color:#4caf50;margin-left:10px;"></i> ${formatted}</li>`;
    }).join('');
  }

  // ============================================
  // صفحة المتابعة (tracker.html)
  // ============================================
  function initTrackerPage() {
    const data = DataManager.load();
    const today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();
    
    // عرض الإحصائيات
    updateTrackerStats(data);
    
    // عرض التقويم
    renderCalendar(currentYear, currentMonth, data);
    
    // أزرار التنقل في التقويم
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    
    if (prevBtn) {
      prevBtn.addEventListener('click', function() {
        currentMonth--;
        if (currentMonth < 0) {
          currentMonth = 11;
          currentYear--;
        }
        renderCalendar(currentYear, currentMonth, data);
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
        renderCalendar(currentYear, currentMonth, data);
      });
    }
    
    // تحديث المخطط
    renderChart(data);
  }

  // ============================================
  // عرض التقويم
  // ============================================
  function renderCalendar(year, month, data) {
    const monthYearEl = document.getElementById('monthYear');
    const daysContainer = document.getElementById('calendarDays');
    
    if (!monthYearEl || !daysContainer) return;
    
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    monthYearEl.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay(); // 0=Sunday, 1=Monday...
    
    // تحويل الأيام لتبدأ من الأحد
    const adjustedStart = startDay;
    
    // إنشاء الأيام
    let html = '';
    const todayStr = DataManager.getToday();
    
    // أيام فارغة قبل بداية الشهر
    for (let i = 0; i < adjustedStart; i++) {
      html += '<button disabled style="background:transparent;cursor:default;"></button>';
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateStr = dateObj.toISOString().split('T')[0];
      const isCompleted = data.history[dateStr] === true;
      const isToday = dateStr === todayStr;
      
      let classes = '';
      if (isCompleted) classes += 'completed ';
      if (isToday) classes += 'today ';
      
      html += `<button class="${classes}" data-date="${dateStr}">${day}</button>`;
    }
    
    daysContainer.innerHTML = html;
    
    // إضافة مستمعين للأيام
    daysContainer.querySelectorAll('button:not([disabled])').forEach(btn => {
      btn.addEventListener('click', function() {
        const dateStr = this.dataset.date;
        if (!dateStr) return;
        
        // تبديل حالة اليوم
        let currentData = DataManager.load();
        if (currentData.history[dateStr]) {
          delete currentData.history[dateStr];
        } else {
          currentData.history[dateStr] = true;
          currentData.lastCompletion = dateStr;
        }
        DataManager.updateStats(currentData);
        DataManager.save(currentData);
        
        // إعادة عرض التقويم والإحصائيات
        const yearMonth = dateStr.split('-');
        renderCalendar(parseInt(yearMonth[0]), parseInt(yearMonth[1]) - 1, currentData);
        updateTrackerStats(currentData);
        renderChart(currentData);
        showMessage('تم تحديث الإنجاز', 'success');
      });
    });
  }

  // ============================================
  // تحديث إحصائيات المتابعة
  // ============================================
  function updateTrackerStats(data) {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    const totalDays = new Date(currentYear, currentMonth, 0).getDate();
    const completed = DataManager.getMonthlyCompleted(data, currentYear, currentMonth);
    const percent = totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;
    
    const percentEl = document.getElementById('trackerPercent');
    if (percentEl) percentEl.textContent = percent + '%';
    
    const maxStreakEl = document.getElementById('maxStreak');
    if (maxStreakEl) maxStreakEl.textContent = DataManager.getMaxStreak(data);
    
    const weeklyEl = document.getElementById('weeklyCount');
    if (weeklyEl) weeklyEl.textContent = DataManager.getWeeklyCompleted(data);
    
    const monthlyEl = document.getElementById('monthlyCount');
    if (monthlyEl) monthlyEl.textContent = completed;
  }

  // ============================================
  // عرض المخطط البياني
  // ============================================
  function renderChart(data) {
    const chartEl = document.getElementById('barChart');
    if (!chartEl) return;
    
    const today = new Date();
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d);
    }
    
    const maxHeight = 120;
    let maxCount = 1;
    const counts = days.map(d => {
      const key = d.toISOString().split('T')[0];
      return data.history[key] === true ? 1 : 0;
    });
    
    // إذا كان هناك أي قيمة أكبر من 1، استخدمها كحد أقصى
    const maxVal = Math.max(...counts, 1);
    
    let html = '';
    days.forEach((d, i) => {
      const value = counts[i];
      const height = (value / maxVal) * maxHeight;
      const dayName = d.toLocaleDateString('ar-SA', { weekday: 'short' });
      const isToday = d.toISOString().split('T')[0] === DataManager.getToday();
      
      html += `
        <div class="bar" style="height:${Math.max(height, 5)}px;${isToday ? 'background:linear-gradient(180deg, #ffd54f, #ffca28);' : ''}">
          <span>${dayName}</span>
        </div>
      `;
    });
    
    chartEl.innerHTML = html;
  }

  // ============================================
  // صفحة الإعدادات (settings.html)
  // ============================================
  function initSettingsPage() {
    const data = DataManager.load();
    
    // تعبئة الحقول
    const nameInput = document.getElementById('settingsName');
    const goalInput = document.getElementById('settingsGoal');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeStatus = document.getElementById('darkModeStatus');
    
    if (nameInput) nameInput.value = data.user.name || '';
    if (goalInput) goalInput.value = data.user.goal || 1;
    if (darkModeToggle) {
      darkModeToggle.checked = data.settings.darkMode || false;
      if (darkModeStatus) {
        darkModeStatus.textContent = data.settings.darkMode ? 'مفعل' : 'معطل';
      }
    }
    
    // تطبيق الوضع الليلي
    if (data.settings.darkMode) {
      document.body.classList.add('dark-mode');
    }
    
    // تغيير الاسم
    const saveNameBtn = document.getElementById('saveNameBtn');
    if (saveNameBtn) {
      saveNameBtn.addEventListener('click', function() {
        const newName = nameInput.value.trim();
        if (!newName) {
          showMessage('يرجى إدخال اسم صحيح', 'error');
          return;
        }
        
        let currentData = DataManager.load();
        currentData.user.name = newName;
        DataManager.save(currentData);
        
        // تحديث الجلسة
        const session = Storage.getSession();
        if (session) {
          session.name = newName;
          Storage.setSession(session);
        }
        
        showMessage('تم تحديث الاسم بنجاح', 'success');
      });
    }
    
    // تغيير الهدف
    const saveGoalBtn = document.getElementById('saveGoalBtn');
    if (saveGoalBtn) {
      saveGoalBtn.addEventListener('click', function() {
        const goal = parseInt(goalInput.value);
        if (!goal || goal < 1 || goal > 30) {
          showMessage('الهدف يجب أن يكون بين 1 و 30 جزءاً', 'error');
          return;
        }
        
        let currentData = DataManager.load();
        currentData.user.goal = goal;
        DataManager.save(currentData);
        showMessage('تم تحديث الهدف اليومي', 'success');
      });
    }
    
    // ألوان الموقع
    const colorBtns = document.querySelectorAll('.color-btn');
    const currentColor = data.settings.themeColor || '#2e7d32';
    
    colorBtns.forEach(btn => {
      const color = btn.dataset.color;
      if (color === currentColor) {
        btn.classList.add('active');
      }
      
      btn.addEventListener('click', function() {
        colorBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const newColor = this.dataset.color;
        let currentData = DataManager.load();
        currentData.settings.themeColor = newColor;
        DataManager.save(currentData);
        
        // تحديث المتغيرات
        document.documentElement.style.setProperty('--primary', newColor);
        showMessage('تم تغيير لون الموقع', 'success');
      });
    });
    
    // الوضع الليلي
    if (darkModeToggle) {
      darkModeToggle.addEventListener('change', function() {
        const isDark = this.checked;
        let currentData = DataManager.load();
        currentData.settings.darkMode = isDark;
        DataManager.save(currentData);
        
        if (isDark) {
          document.body.classList.add('dark-mode');
          if (darkModeStatus) darkModeStatus.textContent = 'مفعل';
        } else {
          document.body.classList.remove('dark-mode');
          if (darkModeStatus) darkModeStatus.textContent = 'معطل';
        }
        
        showMessage(isDark ? 'تم تفعيل الوضع الليلي' : 'تم إلغاء الوضع الليلي', 'success');
      });
    }
    
    // حذف جميع البيانات
    const deleteBtn = document.getElementById('deleteAllBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function() {
        if (confirm('هل أنت متأكد من حذف جميع البيانات؟ هذا الإجراء لا يمكن التراجع عنه!')) {
          if (confirm('تأكيد حذف جميع البيانات مرة أخرى؟')) {
            Storage.clearAll();
            // إعادة تعيين البيانات الافتراضية
            const defaultDataCopy = JSON.parse(JSON.stringify(defaultData));
            Storage.set(defaultDataCopy);
            showMessage('تم حذف جميع البيانات', 'success');
            
            // إعادة تحميل الصفحة
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }
        }
      });
    }
  }

  // ============================================
  // إدارة التنقل (Navbar)
  // ============================================
  function initNavigation() {
    // زر القائمة في الشاشات الصغيرة
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
      navToggle.addEventListener('click', function() {
        navMenu.classList.toggle('open');
      });
    }
    
    // زر تسجيل الخروج
    const logoutBtns = document.querySelectorAll('#logoutBtn');
    logoutBtns.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('هل أنت متأكد من تسجيل الخروج؟')) {
          SessionManager.logout();
        }
      });
    });
  }

  // ============================================
  // تطبيق Ripple Effect على جميع الأزرار
  // ============================================
  function initRippleEffect() {
    document.addEventListener('click', function(e) {
      const target = e.target.closest('button, .btn-primary, .btn-outline, .btn-ghost, .btn-success, .btn-danger');
      if (target && !target.classList.contains('ripple')) {
        target.classList.add('ripple');
        setTimeout(() => target.classList.remove('ripple'), 600);
      }
    });
  }

  // ============================================
  // تهيئة التطبيق
  // ============================================
  function initApp() {
    // حماية الصفحات
    if (!PageGuard.protect()) return;
    
    // تهيئة التنقل
    initNavigation();
    
    // تهيئة Ripple
    initRippleEffect();
    
    // تحديد الصفحة الحالية
    const currentPage = window.location.pathname.split('/').pop() || 'login.html';
    
    // تهيئة الصفحة المناسبة
    switch (currentPage) {
      case 'login.html':
        initLoginPage();
        break;
      case 'index.html':
        initIndexPage();
        break;
      case 'tracker.html':
        initTrackerPage();
        break;
      case 'settings.html':
        initSettingsPage();
        break;
      default:
        // إذا كانت الصفحة غير معروفة، انتقل لتسجيل الدخول
        if (!SessionManager.isLoggedIn()) {
          window.location.href = 'login.html';
        }
    }
    
    // إضافة رسالة Developer Mode في console للتذكير
    console.log('%c🔧 Developer Mode متاح - تذكر إزالة هذا الخيار قبل النشر في الإنتاج!', 'color: #ffd54f; font-size: 14px; font-weight: bold;');
  }

  // ============================================
  // تشغيل التطبيق عند تحميل الصفحة
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
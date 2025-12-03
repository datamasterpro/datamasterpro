/* ==========================================
   DATAMASTER PRO - JAVASCRIPT LOGIC
   Handles all user interactions and n8n API calls
   ========================================== */

// ===================================
// CONFIGURATION
// ===================================

// TODO: Replace these with your actual n8n webhook URLs
const N8N_CONFIG = {
    signupWebhook: ' https://datamasterdec.app.n8n.cloud/webhook/signup',
    loginWebhook: 'https://datamasterdec.app.n8n.cloud/webhook/login',
    resumeUploadWebhook: 'https://datamasterdec.app.n8n.cloud/webhook/resume-upload',
    getUserDataWebhook: 'https://datamasterdec.app.n8n.cloud/webhook/get-user-data'
};

// TODO: Replace with your Supabase configuration
const SUPABASE_CONFIG = {
    url: 'https://eqnyrhjsainqksbgkfzm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxbnlyaGpzYWlucWtzYmdrZnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTE4NjksImV4cCI6MjA4MDE4Nzg2OX0.MVxcrA4bh6lkPv-917c8E6L08BmCn-lbwT5dh_0TJfg'
};

// ===================================
// UTILITY FUNCTIONS
// ===================================

/**
 * Show a specific section and hide all others
 * @param {string} sectionId - The ID of the section to display
 */
function showSection(sectionId) {
    // Hide all sections by removing 'active' class
    const allSections = document.querySelectorAll('.section');
    allSections.forEach(section => section.classList.remove('active'));
    
    // Show the requested section by adding 'active' class
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

/**
 * Show loading overlay while processing requests
 */
function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
}

/**
 * Hide loading overlay after processing is complete
 */
function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
}

/**
 * Display a toast notification to the user
 * @param {string} message - The message to display
 * @param {string} type - Type of notification ('success' or 'error')
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Store user data in browser's local storage
 * @param {Object} userData - User information to store
 */
function saveUserSession(userData) {
    localStorage.setItem('datamaster_user', JSON.stringify(userData));
}

/**
 * Retrieve user data from browser's local storage
 * @returns {Object|null} User data or null if not found
 */
function getUserSession() {
    const userData = localStorage.getItem('datamaster_user');
    return userData ? JSON.parse(userData) : null;
}

/**
 * Clear user session (logout)
 */
function clearUserSession() {
    localStorage.removeItem('datamaster_user');
}

/**
 * Convert file to Base64 string for API transmission
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 encoded file content
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Validate file size (max 5MB for resumes)
 * @param {File} file - The file to validate
 * @returns {boolean} True if file is valid, false otherwise
 */
function validateFileSize(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    return file.size <= maxSize;
}

// ===================================
// NAVIGATION FUNCTIONS
// ===================================

/**
 * Navigate to the hero/landing page
 */
function showHero() {
    showSection('hero-section');
}

/**
 * Navigate to the login page
 */
function showLogin() {
    showSection('login-section');
}

/**
 * Navigate to the signup page
 */
function showSignup() {
    showSection('signup-section');
}

/**
 * Navigate to the resume choice page
 */
function showResumeChoice() {
    showSection('resume-choice-section');
}

/**
 * Navigate to the new resume upload page
 */
function showResumeUpload() {
    showSection('new-resume-section');
}

/**
 * Navigate to the dashboard
 */
function showDashboard() {
    showSection('dashboard-section');
}

// ===================================
// AUTHENTICATION HANDLERS
// ===================================

/**
 * Handle user signup form submission
 * @param {Event} event - Form submit event
 */
async function handleSignup(event) {
    event.preventDefault(); // Prevent default form submission
    
    // Get form input values
    const name = document.getElementById('signup-name').value;
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const resumeFile = document.getElementById('signup-resume').files[0];
    
    // Validate resume file exists
    if (!resumeFile) {
        showToast('Please upload your resume', 'error');
        return;
    }

   // FIX: enforce password minimum length
if (!isValidPassword(password)) {
    showToast('Password must be at least 8 characters', 'error');
    return;
}
    // Validate file size (max 5MB)
    if (!validateFileSize(resumeFile)) {
        showToast('Resume file size must be less than 5MB', 'error');
        return;
    }
    
    // Validate file type (PDF only)
    if (resumeFile.type !== 'application/pdf') {
        showToast('Please upload a PDF file', 'error');
        return;
    }
    
    try {
        showLoading(); // Show loading spinner
        
        // Convert resume file to Base64 for API transmission
        const resumeBase64 = await fileToBase64(resumeFile);
        
        // Prepare data to send to n8n webhook
        const signupData = {
            name: name,
            username: username,
            email: email,
            password: password,
            resume: resumeBase64,
            resumeFileName: resumeFile.name,
            createdAt: new Date().toISOString()
        };
        
        // Send signup request to n8n webhook
        const response = await fetch(N8N_CONFIG.signupWebhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(signupData)
        });
        
        // Check if request was successful
        if (!response.ok) {
            throw new Error('Signup failed. Please try again.');
        }
        
        const result = await response.json();
        
        // Save user session data
        saveUserSession({
            userId: result.userId,
            name: name,
            username: username,
            email: email,
            hasResume: true,
            resumeFileName: resumeFile.name,
            uploadDate: new Date().toISOString()
        });
        
        hideLoading(); // Hide loading spinner
        showToast('Account created successfully! Welcome to DataMaster Pro!', 'success');
        
        // Navigate to dashboard after 1 second
        setTimeout(() => {
            document.getElementById('dashboard-user-name').textContent = name;
            showDashboard();
        }, 1000);
        
    } catch (error) {
        hideLoading();
        console.error('Signup error:', error);
        showToast(error.message || 'An error occurred during signup', 'error');
    }
}

/**
 * Handle user login form submission
 * @param {Event} event - Form submit event
 */
async function handleLogin(event) {
    event.preventDefault(); // Prevent default form submission
    
    // Get login credentials from form
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    try {
        showLoading(); // Show loading spinner
        
        // Prepare login data
        const loginData = {
            username: username,
            password: password
        };
        
        // Send login request to n8n webhook
        const response = await fetch(N8N_CONFIG.loginWebhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        });
        
        // Check if login was successful
        if (!response.ok) {
            throw new Error('Invalid username or password');
        }
        
        const result = await response.json();
        
        // Save user session
        saveUserSession({
            userId: result.userId,
            name: result.name,
            username: result.username,
            email: result.email,
            hasResume: result.hasResume,
            resumeFileName: result.resumeFileName,
            uploadDate: result.uploadDate
        });
        
        hideLoading(); // Hide loading spinner
  const userName = result.name || result.username || 'User';
showToast(`Welcome back, ${userName}!`, 'success');
        
        // Check if user has existing resume
  // Always show resume choice for existing users (they always have resume from signup)
document.getElementById('user-name-display').textContent = userName;
document.getElementById('current-resume-name').textContent = result.resumeFileName;
const uploadDate = result.uploadDate ? new Date(result.uploadDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
}) : 'Recently';
document.getElementById('resume-upload-date').textContent = uploadDate;

setTimeout(() => {
    showResumeChoice();
}, 1000);
        
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        showToast(error.message || 'Login failed', 'error');
    }
}

/**
 * Handle user choosing to proceed with existing resume
 */
function proceedWithExistingResume() {
    const userData = getUserSession();
    
    if (userData) {
        showToast('Proceeding with your existing resume', 'success');
        document.getElementById('dashboard-user-name').textContent = userData.name;
        
        setTimeout(() => {
            showDashboard();
        }, 1000);
    }
}

/**
 * Handle new resume upload for existing users
 * @param {Event} event - Form submit event
 */
async function handleNewResume(event) {
    event.preventDefault(); // Prevent default form submission
    
    const resumeFile = document.getElementById('new-resume-file').files[0];
    const userData = getUserSession();
    
    // Validate file exists
    if (!resumeFile) {
        showToast('Please select a resume file', 'error');
        return;
    }
    
    // Validate file size
    if (!validateFileSize(resumeFile)) {
        showToast('Resume file size must be less than 5MB', 'error');
        return;
    }
    
    // Validate file type
    if (resumeFile.type !== 'application/pdf') {
        showToast('Please upload a PDF file', 'error');
        return;
    }
    
    try {
        showLoading(); // Show loading spinner
        
        // Convert resume to Base64
        const resumeBase64 = await fileToBase64(resumeFile);
        
        // Prepare data for API
        const uploadData = {
            userId: userData.userId,
            username: userData.username,
            resume: resumeBase64,
            resumeFileName: resumeFile.name,
            uploadDate: new Date().toISOString()
        };
        
        // Send resume to n8n webhook
        const response = await fetch(N8N_CONFIG.resumeUploadWebhook, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(uploadData)
        });
        
        if (!response.ok) {
            throw new Error('Resume upload failed');
        }
        
        // Update user session with new resume info
        userData.hasResume = true;
        userData.resumeFileName = resumeFile.name;
        userData.uploadDate = new Date().toISOString();
        saveUserSession(userData);
        
        hideLoading();
        showToast('Resume uploaded successfully!', 'success');
        
        // Navigate to dashboard
        document.getElementById('dashboard-user-name').textContent = userData.name;
        setTimeout(() => {
            showDashboard();
        }, 1000);
        
    } catch (error) {
        hideLoading();
        console.error('Resume upload error:', error);
        showToast(error.message || 'Resume upload failed', 'error');
    }
}

/**
 * Handle user logout
 */
function handleLogout() {
    // Confirm logout
    if (confirm('Are you sure you want to logout?')) {
        clearUserSession(); // Clear stored session
        showToast('Logged out successfully', 'success');
        
        // Reset forms
        document.getElementById('login-form').reset();
        document.getElementById('signup-form').reset();
        
        // Navigate back to hero page
        setTimeout(() => {
            showHero();
        }, 1000);
    }
}

// ===================================
// INITIALIZATION
// ===================================

/**
 * Check if user is already logged in when page loads
 */
function checkExistingSession() {
    const userData = getUserSession();
    
    if (userData) {
        // User is already logged in
        console.log('Existing session found for:', userData.username);
        
        // Optionally, you can auto-navigate to dashboard
        // Uncomment the lines below if you want this behavior
        /*
        document.getElementById('dashboard-user-name').textContent = userData.name;
        showDashboard();
        */
    }
}

// Run initialization when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DataMaster Pro initialized');
    checkExistingSession();
    
    // Show hero section by default
    showSection('hero-section');
});

// ===================================
// EXAMPLE: SUPABASE INTEGRATION
// ===================================

/**
 * Example function to interact with Supabase directly
 * (Alternative to n8n if you want direct database access)
 * 
 * NOTE: This requires Supabase JavaScript client library
 * Add this to your HTML: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 */
/*
async function supabaseSignup(userData) {
    const { createClient } = supabase;
    const supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    
    const { data, error } = await supabaseClient.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
            data: {
                name: userData.name,
                username: userData.username
            }
        }
    });
    
    if (error) throw error;
    return data;
}
*/

// ===================================
// ADDITIONAL HELPER FUNCTIONS
// ===================================

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate password strength (min 8 characters)
 * @param {string} password - Password to validate
 * @returns {boolean} True if password meets requirements
 */
function isValidPassword(password) {
    return password.length >= 8;
}

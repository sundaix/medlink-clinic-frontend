// Patient Registration JavaScript for MedLink Clinic
// Uses Firebase Realtime Database

// Generate unique ID for new patient
function generatePatientId() {
    return 'PAT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Validate Philippine mobile number
function validatePhilippinePhone(phone) {
    // Format: 09XX XXX XXXX or 639XX XXX XXXX
    const phoneRegex = /^(09|\+639|639)\d{9}$/;
    // Remove spaces and special characters
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone);
}

// Validate email format
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Check if email already exists in database
async function isEmailRegistered(email) {
    try {
        const snapshot = await firebase.database().ref('patients').once('value');
        const patients = snapshot.val();
        
        if (patients) {
            for (let patientId in patients) {
                if (patients[patientId].email && patients[patientId].email.toLowerCase() === email.toLowerCase()) {
                    return true;
                }
            }
        }
        return false;
    } catch (error) {
        console.error('Error checking email:', error);
        return false;
    }
}

// Check if phone already exists
async function isPhoneRegistered(phone) {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    try {
        const snapshot = await firebase.database().ref('patients').once('value');
        const patients = snapshot.val();
        
        if (patients) {
            for (let patientId in patients) {
                if (patients[patientId].phone && patients[patientId].phone.replace(/[\s\-\(\)]/g, '') === cleanPhone) {
                    return true;
                }
            }
        }
        return false;
    } catch (error) {
        console.error('Error checking phone:', error);
        return false;
    }
}

// Save patient to Firebase Realtime Database
async function savePatientToDatabase(patientData) {
    try {
        const patientId = generatePatientId();
        
        // Save to 'patients' node in Realtime Database
        await firebase.database().ref('patients/' + patientId).set({
            patientId: patientId,
            fullName: patientData.fullName,
            email: patientData.email.toLowerCase(),
            phone: patientData.phone.replace(/[\s\-\(\)]/g, ''),
            dateOfBirth: patientData.dob,
            gender: patientData.gender,
            address: patientData.address || '',
            password: patientData.password, // Note: In production, hash this!
            registrationDate: new Date().toISOString(),
            status: 'active',
            totalAppointments: 0,
            lastVisit: null
        });
        
        // Also add to email index for quick lookup
        await firebase.database().ref('patient_emails/' + patientData.email.toLowerCase().replace(/[\.@]/g, '_')).set(patientId);
        
        return { success: true, patientId: patientId };
    } catch (error) {
        console.error('Database save error:', error);
        return { success: false, error: error.message };
    }
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    let message = '';
    
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[$@#&!]/)) strength++;
    
    const strengthDiv = document.getElementById('passwordStrength');
    
    if (password.length === 0) {
        strengthDiv.innerHTML = '';
        return;
    }
    
    if (strength <= 2) {
        message = 'Weak password - use at least 6 characters with letters and numbers';
        strengthDiv.className = 'password-strength strength-weak';
    } else if (strength === 3 || strength === 4) {
        message = 'Medium password - good, but could be stronger';
        strengthDiv.className = 'password-strength strength-medium';
    } else {
        message = 'Strong password!';
        strengthDiv.className = 'password-strength strength-strong';
    }
    
    strengthDiv.innerHTML = '<i class="fas fa-shield-alt me-1"></i>' + message;
}

// Show error message
function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

// Hide error message
function hideError(elementId) {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Handle form submission
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Reset all error messages
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    
    // Get form values
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const dob = document.getElementById('dob').value;
    const gender = document.getElementById('gender').value;
    const address = document.getElementById('address').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsChecked = document.getElementById('termsCheckbox').checked;
    
    // Validation
    let isValid = true;
    
    if (!fullName) {
        showError('nameError', 'Please enter your full name');
        isValid = false;
    } else if (fullName.length < 2) {
        showError('nameError', 'Name must be at least 2 characters');
        isValid = false;
    }
    
    if (!email) {
        showError('emailError', 'Please enter your email address');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError('emailError', 'Please enter a valid email address (e.g., name@domain.com)');
        isValid = false;
    } else {
        // Check if email already registered
        const emailExists = await isEmailRegistered(email);
        if (emailExists) {
            showError('emailError', 'This email is already registered. Please use a different email or login.');
            isValid = false;
        }
    }
    
    if (!phone) {
        showError('phoneError', 'Please enter your phone number');
        isValid = false;
    } else if (!validatePhilippinePhone(phone)) {
        showError('phoneError', 'Please enter a valid Philippine mobile number (e.g., 09123456789 or 639123456789)');
        isValid = false;
    } else {
        const phoneExists = await isPhoneRegistered(phone);
        if (phoneExists) {
            showError('phoneError', 'This phone number is already registered');
            isValid = false;
        }
    }
    
    if (!dob) {
        showError('dobError', 'Please select your date of birth');
        isValid = false;
    } else {
        // Check if age is reasonable (at least 0 and not future)
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < 0 || age > 120) {
            showError('dobError', 'Please enter a valid date of birth');
            isValid = false;
        }
    }
    
    if (!gender) {
        showError('genderError', 'Please select your gender');
        isValid = false;
    }
    
    if (!password) {
        showError('passwordError', 'Please enter a password');
        isValid = false;
    } else if (password.length < 6) {
        showError('passwordError', 'Password must be at least 6 characters');
        isValid = false;
    }
    
    if (password !== confirmPassword) {
        showError('confirmError', 'Passwords do not match');
        isValid = false;
    }
    
    if (!termsChecked) {
        alert('Please agree to the Terms of Service and Privacy Policy');
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Disable submit button
    const submitBtn = document.getElementById('registerBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating Account...';
    
    // Prepare patient data
    const patientData = {
        fullName: fullName,
        email: email,
        phone: phone,
        dob: dob,
        gender: gender,
        address: address,
        password: password // In production, hash this with bcrypt or similar
    };
    
    try {
        // Save to Firebase Realtime Database
        const result = await savePatientToDatabase(patientData);
        
        if (result.success) {
            // Show success message
            const successDiv = document.getElementById('successMessage');
            successDiv.style.display = 'block';
            
            // Store patient ID in session storage for auto-login
            sessionStorage.setItem('medlink_patient_id', result.patientId);
            sessionStorage.setItem('medlink_patient_name', fullName);
            
            // Redirect after 3 seconds
            setTimeout(() => {
                window.location.href = 'index.html?registered=true&name=' + encodeURIComponent(fullName);
            }, 3000);
        } else {
            alert('Registration failed: ' + result.error);
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again. Error: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
    }
});

// Password strength checker
document.getElementById('password').addEventListener('input', (e) => {
    checkPasswordStrength(e.target.value);
    if (e.target.value.length >= 6) {
        hideError('passwordError');
    }
});

// Real-time validation
document.getElementById('email').addEventListener('input', (e) => {
    if (validateEmail(e.target.value)) {
        hideError('emailError');
    }
});

document.getElementById('phone').addEventListener('input', (e) => {
    if (validatePhilippinePhone(e.target.value)) {
        hideError('phoneError');
    }
});

document.getElementById('confirmPassword').addEventListener('input', (e) => {
    const password = document.getElementById('password').value;
    if (e.target.value === password && password.length >= 6) {
        hideError('confirmError');
    } else if (e.target.value) {
        showError('confirmError', 'Passwords do not match');
    }
});

document.getElementById('fullName').addEventListener('input', (e) => {
    if (e.target.value.trim().length >= 2) {
        hideError('nameError');
    }
});

// Format phone number as user types
document.getElementById('phone').addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^\d]/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    e.target.value = value;
});

// Check for registration success parameter on page load (if redirected from another page)
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.style.display = 'block';
            successDiv.innerHTML = '<i class="fas fa-check-circle me-2"></i>Registration successful! You can now book appointments.';
        }
    }
});
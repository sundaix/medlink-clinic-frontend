const database = firebase.database();

const MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY = 4;
const APPOINTMENT_RATE_LIMIT = 3;

function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

async function safeFirebaseOperation(operation, errorMessage) {
    try {
        return await operation();
    } catch (error) {
        console.error(`${errorMessage}:`, error);
        showNotification(`${errorMessage}. Please try again.`, 'error');
        return null;
    }
}

const appointmentAttempts = new Map();

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    loadDynamicContent();
    setupAutoCleanup();
    setupRealtimeListeners();
});

function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

function initializePage() {
    try {
        console.log('=== Starting Page Initialization ===');
        setMinimumDate();
        setupSmoothScrolling();
        setupScrollAnimations();
        setupFormHandling();
        setupNavbarToggler();
        setupNavbarScroll();
        setupTimeSlotAvailability();
        setupImageErrorHandler();
        setupPhoneFormatter();
        setupFormValidation();
        setupBookingButton();
        setupSpecialtyFilter();
        setupNameValidation();
        setupAutoCleanup();
        setupCheckAppointmentButton(); // NEW
        
        console.log('Initializing services interactivity...');
        setupServicesInteractivity();
        
        console.log('=== Page Initialization Complete ===');
    } catch (error) {
        console.error('Error during page initialization:', error);
        showNotification('Error initializing page. Please refresh.', 'error');
    }
}

// Setup Specialty Filter
function setupSpecialtyFilter() {
    const specialtyBadges = document.querySelectorAll('.specialty-badge');
    console.log('Specialty badges found:', specialtyBadges.length);
    
    specialtyBadges.forEach(badge => {
        badge.style.cursor = 'pointer';
        badge.addEventListener('click', function() {
            const specialty = this.textContent.trim();
            filterDoctorsBySpecialty(specialty);
            scrollToBooking();
            
            specialtyBadges.forEach(b => b.style.opacity = '0.6');
            this.style.opacity = '1';
        });
    });
}

// Enhanced Services Section Interactivity
function setupServicesInteractivity() {
    console.log('=== Setting up Services Interactivity ===');
    
    const specialtyTabs = document.querySelectorAll('.specialty-tab');
    const serviceCards = document.querySelectorAll('.service-card');
    
    console.log('Specialty tabs found:', specialtyTabs.length);
    console.log('Service cards found:', serviceCards.length);
    
    serviceCards.forEach(card => {
        card.style.display = 'block';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
    });
    
    specialtyTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const specialty = this.getAttribute('data-specialty');
            
            specialtyTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            serviceCards.forEach(card => {
                const cardContainer = card.closest('[data-specialty]');
                if (cardContainer) {
                    const cardSpecialty = cardContainer.getAttribute('data-specialty');
                    
                    if (specialty === 'all' || cardSpecialty === specialty) {
                        card.style.display = 'block';
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'scale(1)';
                        }, 50);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                }
            });
            
            if (specialty !== 'all') {
                filterDoctorsBySpecialty(specialty);
            } else {
                populateDoctorSelect();
            }
        });
    });

    const bookButtons = document.querySelectorAll('.btn-book-specialty');
    
    bookButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const specialty = this.getAttribute('data-specialty');
            filterDoctorsBySpecialty(specialty);
            scrollToBooking();
        });
    });

    const cardBacks = document.querySelectorAll('.service-card-back');
    cardBacks.forEach(back => {
        back.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
    
    console.log('=== Services Interactivity Setup Complete ===');
}

// Filter doctors by specialty
async function filterDoctorsBySpecialty(specialty) {
    try {
        const doctorsSnapshot = await database.ref('doctors').once('value');
        const doctors = doctorsSnapshot.val();
        const doctorSelect = document.getElementById('doctorSelect');
        
        doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
        
        if (doctors) {
            const filteredDoctors = Object.entries(doctors).filter(([id, doctor]) => 
                doctor.specialty === specialty
            );
            
            if (filteredDoctors.length > 0) {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `${specialty}`;
                
                filteredDoctors.forEach(([id, doctor]) => {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = `   ${doctor.name}`;
                    optgroup.appendChild(option);
                });
                
                doctorSelect.appendChild(optgroup);
                showNotification(`Showing doctors for ${specialty}`, 'success', 3000);
            } else {
                showNotification(`No doctors available for ${specialty} at the moment.`, 'info');
                await populateDoctorSelect();
            }
        }
        
    } catch (error) {
        console.error('Error filtering doctors:', error);
        showNotification('Error loading doctors. Please try again.', 'error');
        await populateDoctorSelect();
    }
}

// Load Dynamic Content from Firebase
async function loadDynamicContent() {
    try {
        // Load images
        const imagesSnapshot = await safeFirebaseOperation(
            () => database.ref('images').once('value'),
            'Failed to load images'
        );
        const images = imagesSnapshot?.val() || {};
        
        if (images) {
            if (images.logo) {
                const logoImg = document.querySelector('#siteLogo');
                const logoSrc = images.logo.base64 || images.logo.url;
                if (logoSrc && logoImg) {
                    logoImg.src = logoSrc;
                    logoImg.classList.remove('lazy');
                }
            }
            if (images.doctorIllustration) {
                const doctorImg = document.querySelector('#doctorIllustration');
                const doctorSrc = images.doctorIllustration.base64 || images.doctorIllustration.url;
                if (doctorSrc && doctorImg) {
                    doctorImg.src = doctorSrc;
                    doctorImg.classList.remove('lazy');
                }
            }
        }
        
        // Load content (hero, contact)
        const contentSnapshot = await safeFirebaseOperation(
            () => database.ref('content').once('value'),
            'Failed to load content'
        );
        const content = contentSnapshot?.val() || {};
        
        if (content) {
            if (content.hero) {
                const heroHeading = document.getElementById('heroHeading');
                const heroDescription = document.getElementById('heroDescription');
                const heroButtonText = document.getElementById('heroButtonText');
                
                if (heroHeading) heroHeading.textContent = content.hero.heading || 'Your Health, Our Priority';
                if (heroDescription) heroDescription.textContent = content.hero.description || "Your trusted healthcare clinic in Marikina is now open 24/7! We're here for you every day, all day, with expert doctors and modern facilities.";
                if (heroButtonText) heroButtonText.textContent = content.hero.buttonText || 'Book Appointment';
            }
            
            if (content.contact) {
                const contactAddress = document.getElementById('contactAddress');
                const contactPhone = document.getElementById('contactPhone');
                const contactEmail = document.getElementById('contactEmail');
                
                if (contactAddress) contactAddress.textContent = content.contact.address || '123 Healthcare St., Marikina, Philippines';
                if (contactPhone) contactPhone.textContent = content.contact.phone || '+63 905 517 7314';
                if (contactEmail) contactEmail.textContent = content.contact.email || 'info.medlinkclinic@gmail.com';
            }
        }
        
        // Load about section
        const aboutSnapshot = await safeFirebaseOperation(
            () => database.ref('aboutSection').once('value'),
            'Failed to load about section'
        );
        const aboutSection = aboutSnapshot?.val() || {};
        
        if (aboutSection) {
            const aboutHeading = document.getElementById('aboutHeading');
            const aboutSubheading = document.getElementById('aboutSubheading');
            const aboutDescription = document.getElementById('aboutDescription');
            
            if (aboutHeading) aboutHeading.textContent = aboutSection.heading || 'About MedLink Clinic';
            if (aboutSubheading) aboutSubheading.textContent = aboutSection.subheading || 'Your Trusted Healthcare Partner in Marikina';
            if (aboutDescription) aboutDescription.textContent = aboutSection.description || 'At MedLink Clinic, we are dedicated to providing exceptional healthcare services.';
            
            // Load about features
            if (aboutSection.features && Array.isArray(aboutSection.features)) {
                const featuresContainer = document.getElementById('aboutFeatures');
                if (featuresContainer) {
                    featuresContainer.innerHTML = '';
                    aboutSection.features.forEach(feature => {
                        const featureItem = document.createElement('div');
                        featureItem.className = 'feature-item';
                        featureItem.setAttribute('role', 'listitem');
                        featureItem.innerHTML = `
                            <i class="fas fa-check-circle text-primary" aria-hidden="true"></i>
                            <span>${feature}</span>
                        `;
                        featuresContainer.appendChild(featureItem);
                    });
                }
            }
        }
        
        // Load footer content
        const footerSnapshot = await safeFirebaseOperation(
            () => database.ref('footerContent').once('value'),
            'Failed to load footer'
        );
        const footerContent = footerSnapshot?.val() || {};
        
        if (footerContent && footerContent.copyright) {
            const footerCopyright = document.getElementById('footerCopyright');
            if (footerCopyright) footerCopyright.textContent = footerContent.copyright || '© 2025 MedLink Clinic. All rights reserved.';
        }
        
        // Load doctors
        await populateDoctorSelect();
        
    } catch (error) {
        console.error('Error loading dynamic content:', error);
        loadDefaultDoctors();
    }
}

// Populate doctor select with grouped specialties
async function populateDoctorSelect() {
    try {
        const doctorsSnapshot = await safeFirebaseOperation(
            () => database.ref('doctors').once('value'),
            'Failed to load doctors'
        );
        const doctors = doctorsSnapshot?.val();
        const doctorSelect = document.getElementById('doctorSelect');
        
        if (!doctorSelect) return;
        
        doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
        
        if (doctors) {
            const doctorsBySpecialty = {};
            
            Object.entries(doctors).forEach(([id, doctor]) => {
                if (!doctorsBySpecialty[doctor.specialty]) {
                    doctorsBySpecialty[doctor.specialty] = [];
                }
                doctorsBySpecialty[doctor.specialty].push({
                    id: id,
                    name: doctor.name,
                    specialty: doctor.specialty,
                    shiftStart: doctor.shiftStart,
                    shiftEnd: doctor.shiftEnd
                });
            });
            
            Object.keys(doctorsBySpecialty).sort().forEach(specialty => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = `${specialty}`;
                
                doctorsBySpecialty[specialty].forEach(doctor => {
                    const option = document.createElement('option');
                    option.value = doctor.id;
                    option.textContent = `   ${doctor.name}`;
                    option.setAttribute('data-specialty', doctor.specialty);
                    optgroup.appendChild(option);
                });
                
                doctorSelect.appendChild(optgroup);
            });
        } else {
            loadDefaultDoctors();
        }
        
    } catch (error) {
        console.error('Error populating doctor select:', error);
        loadDefaultDoctors();
    }
}

// Load Default Doctors (fallback)
function loadDefaultDoctors() {
    const doctorSelect = document.getElementById('doctorSelect');
    if (!doctorSelect) return;
    
    doctorSelect.innerHTML = `
        <option value="">Select Doctor</option>
        <optgroup label="General Medicine">
            <option value="dr-karl">   Dr. Karl Go</option>
        </optgroup>
        <optgroup label="Pediatrics">
            <option value="dr-haniven">   Dr. Haniven Alfonso</option>
        </optgroup>
        <optgroup label="Internal Medicine">
            <option value="dr-jared">   Dr. Jared Vergara</option>
        </optgroup>
        <optgroup label="Family Medicine">
            <option value="dr-francine">   Dr. Francine Abayan</option>
        </optgroup>
    `;
}

function setupBookingButton() {
    const heroBookingBtn = document.getElementById('heroBookingBtn');
    
    if (heroBookingBtn) {
        heroBookingBtn.addEventListener('click', function(e) {
            e.preventDefault();
            scrollToBooking();
        });
    }
}

function scrollToBooking() {
    const bookingSection = document.getElementById('booking');
    if (bookingSection) {
        const offsetTop = bookingSection.offsetTop - 80;
        window.scrollTo({ 
            top: offsetTop, 
            behavior: 'smooth' 
        });
        
        bookingSection.style.animation = 'bookingFlash 1s ease-out';
        setTimeout(() => {
            bookingSection.style.animation = '';
        }, 1000);
    }
}

function setMinimumDate() {
    const today = new Date().toISOString().split('T')[0];
    const appointmentDateInput = document.getElementById('appointmentDate');
    
    if (appointmentDateInput) {
        appointmentDateInput.min = today;
        
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3);
        appointmentDateInput.max = maxDate.toISOString().split('T')[0];
    }
}

function setupSmoothScrolling() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    
    navLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            
            // Skip if targetId is empty or just '#'
            if (!targetId || targetId === '#' || targetId === '') {
                // Allow default behavior for # links (like dropdown toggles)
                return;
            }
            
            // Only prevent default for actual section links
            e.preventDefault();
            
            const target = document.querySelector(targetId);
            
            if (target) {
                const offsetTop = target.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
                
                const navbarToggler = document.querySelector('.navbar-toggler');
                const navbarCollapse = document.querySelector('.navbar-collapse');
                
                if (navbarToggler && navbarCollapse && navbarCollapse.classList.contains('show')) {
                    navbarToggler.click();
                }
            }
        });
    });
}
// ADD THIS FUNCTION DEFINITION
function closeCancelSection() {
    const cancelAppointmentSection = document.getElementById('cancelAppointment');
    const checkAppointmentBtn = document.getElementById('checkAppointmentBtn');
    
    if (cancelAppointmentSection) {
        cancelAppointmentSection.style.display = 'none';
    }
    
    if (checkAppointmentBtn) {
        checkAppointmentBtn.innerHTML = '<i class="fas fa-search me-1"></i> Check Appointment';
    }
    
    // Clear form and results
    const checkAppointmentForm = document.getElementById('checkAppointmentForm');
    const checkResult = document.getElementById('checkResult');
    
    if (checkAppointmentForm) {
        checkAppointmentForm.reset();
    }
    if (checkResult) {
        checkResult.innerHTML = '';
    }
    
    console.log('Cancel section closed');
}

function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeInElements = document.querySelectorAll('.fade-in');
    fadeInElements.forEach(el => {
        observer.observe(el);
    });
}

function setupFormHandling() {
    const appointmentForm = document.getElementById('appointmentForm');
    
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', handleAppointmentSubmission);
    }
}

// Rate limiting check
function checkRateLimit(phone) {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    for (let [key, timestamp] of appointmentAttempts) {
        if (timestamp < oneHourAgo) {
            appointmentAttempts.delete(key);
        }
    }
    
    const attempts = Array.from(appointmentAttempts.values())
        .filter(timestamp => timestamp > oneHourAgo)
        .length;
    
    if (attempts >= APPOINTMENT_RATE_LIMIT) {
        return false;
    }
    
    appointmentAttempts.set(phone, now);
    return true;
}

// Enhanced data validation
function validateAppointmentData(formData) {
    const errors = [];
    
    const requiredFields = ['doctor', 'date', 'time', 'name', 'phone'];
    requiredFields.forEach(field => {
        if (!formData[field] || formData[field].trim() === '') {
            errors.push(`${field} is required`);
        }
    });
    
    if (formData.date && new Date(formData.date) < new Date().setHours(0,0,0,0)) {
        errors.push('Please select a future date');
    }
    
    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
        errors.push('Please enter a valid Philippine phone number');
    }
    
    if (formData.email && !isValidEmail(formData.email)) {
        errors.push('Please enter a valid email address');
    }
    
    if (formData.name && formData.name.trim().length < 2) {
        errors.push('Please enter a valid name');
    }
    
    return errors;
}

// UPDATED: Main appointment submission handler
async function handleAppointmentSubmission(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitAppointmentBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Booking...';

    try {
        const formData = {
            doctor: sanitizeInput(document.getElementById('doctorSelect').value),
            date: sanitizeInput(document.getElementById('appointmentDate').value),
            time: sanitizeInput(document.getElementById('appointmentTime').value),
            name: sanitizeInput(document.getElementById('patientName').value.trim()),
            phone: sanitizeInput(document.getElementById('patientPhone').value.replace(/\s/g, '')),
            email: sanitizeInput(document.getElementById('patientEmail').value.trim()),
            reason: sanitizeInput(document.getElementById('appointmentReason').value.trim()),
            status: 'pending',
            timestamp: new Date().toISOString(),
            ip: 'user'
        };

        const validationErrors = validateAppointmentData(formData);
        if (validationErrors.length > 0) {
            showNotification(validationErrors[0], 'error');
            highlightMissingFields(validationErrors);
            return;
        }

        if (!checkRateLimit(formData.phone)) {
            showNotification('Too many appointment attempts. Please try again in an hour.', 'error');
            return;
        }

        // Check doctor availability for the SPECIFIC appointment time
        const availability = await checkDoctorAvailability(formData.doctor, formData.date, formData.time);
        if (!availability.available) {
            showNotification(availability.reason, 'error');
            return;
        }

        const duplicateCheck = await checkDuplicateBooking(formData);
        if (duplicateCheck.isDuplicate) {
            showNotification(duplicateCheck.message, 'error');
            return;
        }

        const appointmentResult = await submitAppointment(formData);
        
        // Send email notification if email is provided
        if (formData.email && isValidEmail(formData.email)) {
            await emailService.triggerAppointmentEmail(formData);
            showNotification('Appointment booked successfully! Confirmation email will be sent shortly.', 'success');
        } else {
            showNotification('Appointment booked successfully!', 'success');
        }

    } catch (error) {
        console.error('Error booking appointment:', error);
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}


// Submit appointment to Firebase
async function submitAppointment(formData) {
    try {
        // ── Tag appointment with logged-in account so it can be retrieved
        //    reliably in my-appointments.html without false name matches ──
        const sessionRaw = sessionStorage.getItem('medlink_user');
        if (sessionRaw) {
            try {
                const sessionUser = JSON.parse(sessionRaw);
                if (sessionUser.email)     formData.accountEmail = sessionUser.email.toLowerCase().trim();
                if (sessionUser.patientId) formData.patientId    = sessionUser.patientId;
            } catch(e) { /* session parse failed — proceed without tag */ }
        }

        // Save appointment to Firebase
        const newAppointmentRef = database.ref('appointments').push();
        await newAppointmentRef.set(formData);

        // Show success message
        showNotification('Appointment booked successfully! We will confirm shortly.', 'success');
        
        // Reset form
        document.getElementById('appointmentForm').reset();
        
        // Track successful booking
        trackAppointmentMetrics('success');
        
        // Update time slots
        updateTimeSlots();

    } catch (error) {
        console.error('Error submitting appointment:', error);
        throw new Error('Failed to book appointment. Please try again.');
    }
}

// Real-time name validation
function setupNameValidation() {
    const nameInput = document.getElementById('patientName');
    const dateInput = document.getElementById('appointmentDate');
    
    if (nameInput && dateInput) {
        let validationTimeout;
        
        nameInput.addEventListener('blur', validateNameDateCombination);
        dateInput.addEventListener('change', validateNameDateCombination);
        
        async function validateNameDateCombination() {
            const name = nameInput.value.trim();
            const date = dateInput.value;
            
            if (!name || !date) return;
            
            if (validationTimeout) clearTimeout(validationTimeout);
            
            validationTimeout = setTimeout(async () => {
                try {
                    const snapshot = await safeFirebaseOperation(
                        () => database.ref('appointments').once('value'),
                        'Validation failed'
                    );
                    const appointments = snapshot?.val() || {};
                    
                    const existingAppointment = Object.values(appointments).find(apt => 
                        apt.name.toLowerCase().trim() === name.toLowerCase() &&
                        apt.date === date &&
                        apt.status !== 'cancelled'
                    );
                    
                    if (existingAppointment) {
                        nameInput.classList.add('is-invalid');
                        
                        let warningElement = document.getElementById('nameDateWarning');
                        if (!warningElement) {
                            warningElement = document.createElement('div');
                            warningElement.id = 'nameDateWarning';
                            warningElement.className = 'invalid-feedback d-block';
                            nameInput.parentNode.appendChild(warningElement);
                        }
                        
                        warningElement.innerHTML = `
                            <i class="fas fa-exclamation-triangle me-1"></i>
                            You already have an appointment on ${formatDate(date)}. 
                            Please choose a different date or contact the clinic to reschedule.
                        `;
                    } else {
                        nameInput.classList.remove('is-invalid');
                        const warningElement = document.getElementById('nameDateWarning');
                        if (warningElement) {
                            warningElement.remove();
                        }
                    }
                } catch (error) {
                    console.error('Error validating name/date combination:', error);
                }
            }, 500);
        }
    }
}

// Check for duplicate booking
async function checkDuplicateBooking(formData) {
    try {
        const snapshot = await safeFirebaseOperation(
            () => database.ref('appointments').once('value'),
            'Duplicate check failed'
        );
        const appointments = snapshot?.val() || {};
        
        const duplicate = Object.values(appointments).find(apt => 
            apt.name.toLowerCase().trim() === formData.name.toLowerCase().trim() &&
            apt.date === formData.date &&
            apt.status !== 'cancelled'
        );
        
        if (duplicate) {
            return { 
                isDuplicate: true, 
                message: `A patient named "${formData.name}" already has an appointment on ${formatDate(formData.date)}. Please choose a different date or contact the clinic if you need to reschedule.` 
            };
        }
        
        return { isDuplicate: false };
        
    } catch (error) {
        console.error('Error checking duplicate booking:', error);
        return { isDuplicate: false };
    }
}

// UPDATED: Check if doctor is available for the SPECIFIC appointment time with better validation
async function checkDoctorAvailability(doctorId, appointmentDate, appointmentTime) {
    try {
        const doctorSnapshot = await database.ref(`doctors/${doctorId}`).once('value');
        const doctor = doctorSnapshot.val();
        
        if (!doctor || !doctor.shiftStart || !doctor.shiftEnd) {
            return { available: false, reason: 'Doctor information not found' };
        }

        // Parse appointment date and time
        const [appointmentHour, appointmentMinute] = appointmentTime.split(':').map(Number);
        const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
        const appointmentDay = appointmentDateTime.getDay(); // 0 = Sunday, 1 = Monday, etc.

        // Check if appointment is in the past
        const now = new Date();
        if (appointmentDateTime < now) {
            return { available: false, reason: 'Cannot book appointments in the past' };
        }

        // Parse doctor's shift hours
        const [shiftStartHour, shiftStartMinute] = doctor.shiftStart.split(':').map(Number);
        const [shiftEndHour, shiftEndMinute] = doctor.shiftEnd.split(':').map(Number);

        // Convert everything to minutes for accurate comparison
        const appointmentTotalMinutes = appointmentHour * 60 + appointmentMinute;
        const shiftStartTotalMinutes = shiftStartHour * 60 + shiftStartMinute;
        const shiftEndTotalMinutes = shiftEndHour * 60 + shiftEndMinute;

        let isWithinShift = false;

        // Handle overnight shifts (e.g., 20:00 to 08:00)
        if (shiftEndTotalMinutes < shiftStartTotalMinutes) {
            // Overnight shift - appointment can be after start OR before end
            isWithinShift = appointmentTotalMinutes >= shiftStartTotalMinutes || appointmentTotalMinutes < shiftEndTotalMinutes;
        } else {
            // Normal shift - appointment must be between start and end
            isWithinShift = appointmentTotalMinutes >= shiftStartTotalMinutes && appointmentTotalMinutes < shiftEndTotalMinutes;
        }

        if (!isWithinShift) {
            const shiftStartFormatted = formatTimeForDisplay(doctor.shiftStart);
            const shiftEndFormatted = formatTimeForDisplay(doctor.shiftEnd);
            return { 
                available: false, 
                reason: `Doctor is only available from ${shiftStartFormatted} to ${shiftEndFormatted}. Please choose a time within these hours.` 
            };
        }

        // Check if doctor has reached daily appointment limit
        const appointmentsSnapshot = await database.ref('appointments').once('value');
        const appointments = appointmentsSnapshot.val() || {};
        
        const dailyAppointments = Object.values(appointments).filter(apt => 
            apt.doctor === doctorId && 
            apt.date === appointmentDate &&
            apt.status !== 'cancelled'
        ).length;

        if (dailyAppointments >= MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY) {
            return { 
                available: false, 
                reason: 'Doctor has reached the maximum appointments for this day. Please choose another date or doctor.' 
            };
        }

        return { available: true };

    } catch (error) {
        console.error('Error checking doctor availability:', error);
        return { available: false, reason: 'Error checking availability. Please try again.' };
    }
}

// Helper function to format time for display
function formatTimeForDisplay(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${minutes || '00'} ${period}`;
}

function isValidPhoneNumber(phone) {
    const phoneRegex = /^(\+63|0)?9\d{9}$/;
    const cleanedPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanedPhone);
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function highlightMissingFields(errors) {
    document.querySelectorAll('.is-invalid').forEach(el => {
        el.classList.remove('is-invalid');
    });

    errors.forEach(error => {
        let elementId;
        switch(error) {
            case 'doctor is required': elementId = 'doctorSelect'; break;
            case 'date is required': elementId = 'appointmentDate'; break;
            case 'time is required': elementId = 'appointmentTime'; break;
            case 'name is required': elementId = 'patientName'; break;
            case 'phone is required': elementId = 'patientPhone'; break;
        }
        
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('is-invalid');
        }
    });

    setTimeout(() => {
        document.querySelectorAll('.is-invalid').forEach(el => {
            el.classList.remove('is-invalid');
        });
    }, 5000);
}

function setupTimeSlotAvailability() {
    const doctorSelect = document.getElementById('doctorSelect');
    const dateInput = document.getElementById('appointmentDate');
    
    if (doctorSelect && dateInput) {
        doctorSelect.addEventListener('change', function() {
            updateTimeSlots();
            updateDoctorShiftStatus();
        });
        dateInput.addEventListener('change', updateTimeSlots);
    }
}

async function updateTimeSlots() {
    const doctorSelect = document.getElementById('doctorSelect');
    const dateInput = document.getElementById('appointmentDate');
    const timeSelect = document.getElementById('appointmentTime');
    
    if (!doctorSelect || !dateInput || !timeSelect) return;
    
    if (!doctorSelect.value || !dateInput.value) {
        timeSelect.innerHTML = '<option value="">Choose Time</option>';
        return;
    }

    const availableSlots = await getAvailableTimeSlots(doctorSelect.value, dateInput.value);
    
    timeSelect.innerHTML = '<option value="">Choose Time</option>';
    
    if (availableSlots.length === 0) {
        const statusInfo = await getDoctorAvailabilityStatus(doctorSelect.value, dateInput.value);
        
        if (statusInfo.reason === 'off-duty') {
            timeSelect.innerHTML += '<option value="" disabled>Doctor off-duty</option>';
            showNotification(`Dr. ${statusInfo.doctorName} is off-duty on the selected date. Shift: ${formatTime(statusInfo.shiftStart)} - ${formatTime(statusInfo.shiftEnd)}`, 'info');
        } else if (statusInfo.reason === 'fully-booked') {
            timeSelect.innerHTML += '<option value="" disabled>Fully booked</option>';
            showNotification(`Dr. ${statusInfo.doctorName} is fully booked for ${statusInfo.selectedDate}. Maximum ${MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY} appointments per day reached.`, 'info');
        } else {
            timeSelect.innerHTML += '<option value="" disabled>No slots available</option>';
            showNotification(`No available time slots for the selected date.`, 'info');
        }
    } else {
        availableSlots.forEach(slot => {
            const option = document.createElement('option');
            option.value = slot.value;
            option.textContent = slot.display;
            timeSelect.appendChild(option);
        });
        
        if (availableSlots.length > 0) {
            showNotification(`${availableSlots.length} time slots available for selected date`, 'success', 3000);
        }
    }
}

function handleSpecialtyTabClick(element, specialty) {
    event.preventDefault();
    event.stopPropagation();
    
    const specialtyTabs = document.querySelectorAll('.specialty-tab');
    const serviceCards = document.querySelectorAll('.service-card');
    
    specialtyTabs.forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    
    serviceCards.forEach(card => {
        const cardContainer = card.closest('[data-specialty]');
        if (cardContainer) {
            const cardSpecialty = cardContainer.getAttribute('data-specialty');
            
            if (specialty === 'all' || cardSpecialty === specialty) {
                card.style.display = 'block';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                }, 50);
            } else {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.8)';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        }
    });
    
    if (specialty !== 'all') {
        filterDoctorsBySpecialty(specialty);
        scrollToBooking();
    }
}

async function getDoctorAvailabilityStatus(doctorId, date) {
    try {
        const doctorSnapshot = await safeFirebaseOperation(
            () => database.ref(`doctors/${doctorId}`).once('value'),
            'Failed to get doctor info'
        );
        const doctor = doctorSnapshot?.val();
        
        if (!doctor) {
            return { reason: 'doctor-not-found', doctorName: 'Unknown' };
        }
        
        const doctorName = doctor.name.split(' - ')[0];
        
        if (!doctor.shiftStart || !doctor.shiftEnd) {
            return { 
                reason: 'no-shift-info', 
                doctorName: doctorName,
                shiftStart: '08:00',
                shiftEnd: '20:00'
            };
        }
        
        const snapshot = await safeFirebaseOperation(
            () => database.ref('appointments').once('value'),
            'Failed to get appointments'
        );
        const appointments = snapshot?.val() || {};
        
        const doctorAppointments = Object.values(appointments).filter(apt => 
            apt.doctor === doctorId && 
            apt.date === date &&
            apt.status !== 'cancelled'
        );
        
        if (doctorAppointments.length >= MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY) {
            return { 
                reason: 'fully-booked', 
                doctorName: doctorName,
                appointmentCount: doctorAppointments.length,
                maxAppointments: MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY,
                selectedDate: formatDate(date)
            };
        }
        
        return { 
            reason: 'available', 
            doctorName: doctorName,
            shiftStart: doctor.shiftStart,
            shiftEnd: doctor.shiftEnd,
            appointmentCount: doctorAppointments.length
        };
        
    } catch (error) {
        console.error('Error getting doctor availability status:', error);
        return { reason: 'error', doctorName: 'Unknown' };
    }
}

// UPDATED: Doctor shift status display - now shows shift hours without real-time status
async function updateDoctorShiftStatus() {
    const doctorSelect = document.getElementById('doctorSelect');
    const selectedDoctor = doctorSelect.value;
    
    const existingStatus = document.getElementById('doctorShiftStatus');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    if (!selectedDoctor) return;
    
    try {
        const doctorSnapshot = await safeFirebaseOperation(
            () => database.ref(`doctors/${selectedDoctor}`).once('value'),
            'Failed to get doctor details'
        );
        const doctor = doctorSnapshot?.val();
        
        if (doctor && doctor.shiftStart && doctor.shiftEnd) {
            const shiftStatus = document.createElement('div');
            shiftStatus.id = 'doctorShiftStatus';
            shiftStatus.className = 'mt-2 p-2 rounded bg-info text-white';
            shiftStatus.style.fontSize = '0.9rem';
            
            shiftStatus.innerHTML = `
                <i class="fas fa-clock me-1"></i>
                <strong>Shift Hours:</strong> ${formatTime(doctor.shiftStart)} to ${formatTime(doctor.shiftEnd)}
            `;
            
            doctorSelect.parentNode.appendChild(shiftStatus);
        }
    } catch (error) {
        console.error('Error updating doctor shift status:', error);
    }
}

async function getAvailableTimeSlots(doctorId, date) {
    const allSlots = [
        { value: '00:00', display: '12:00 AM' },
        { value: '01:00', display: '1:00 AM' },
        { value: '02:00', display: '2:00 AM' },
        { value: '03:00', display: '3:00 AM' },
        { value: '04:00', display: '4:00 AM' },
        { value: '05:00', display: '5:00 AM' },
        { value: '06:00', display: '6:00 AM' },
        { value: '07:00', display: '7:00 AM' },
        { value: '08:00', display: '8:00 AM' },
        { value: '09:00', display: '9:00 AM' },
        { value: '10:00', display: '10:00 AM' },
        { value: '11:00', display: '11:00 AM' },
        { value: '12:00', display: '12:00 PM' },
        { value: '13:00', display: '1:00 PM' },
        { value: '14:00', display: '2:00 PM' },
        { value: '15:00', display: '3:00 PM' },
        { value: '16:00', display: '4:00 PM' },
        { value: '17:00', display: '5:00 PM' },
        { value: '18:00', display: '6:00 PM' },
        { value: '19:00', display: '7:00 PM' },
        { value: '20:00', display: '8:00 PM' },
        { value: '21:00', display: '9:00 PM' },
        { value: '22:00', display: '10:00 PM' },
        { value: '23:00', display: '11:00 PM' }
    ];

    const selectedDate = new Date(date);
    const today = new Date();
    
    let availableSlots = allSlots;
    
    // Filter out past times for today
    if (selectedDate.toDateString() === today.toDateString()) {
        const currentHour = today.getHours();
        const currentMinutes = today.getMinutes();
        const currentTime = currentHour * 60 + currentMinutes;
        
        availableSlots = allSlots.filter(slot => {
            const [slotHour, slotMinute] = slot.value.split(':').map(Number);
            const slotTime = slotHour * 60 + slotMinute;
            return slotTime > currentTime;
        });
    }

    try {
        const doctorSnapshot = await safeFirebaseOperation(
            () => database.ref(`doctors/${doctorId}`).once('value'),
            'Failed to get doctor info'
        );
        const doctor = doctorSnapshot?.val();
        
        if (!doctor) {
            return [];
        }

        if (!doctor.shiftStart || !doctor.shiftEnd) {
            return availableSlots;
        }

        // Parse doctor's shift times in minutes
        const [startHour, startMinute] = doctor.shiftStart.split(':').map(Number);
        const [endHour, endMinute] = doctor.shiftEnd.split(':').map(Number);
        
        const shiftStartTime = startHour * 60 + startMinute;
        const shiftEndTime = endHour * 60 + endMinute;
        
        // Filter slots based on doctor's shift hours
        availableSlots = availableSlots.filter(slot => {
            const [slotHour, slotMinute] = slot.value.split(':').map(Number);
            const slotTime = slotHour * 60 + slotMinute;
            
            if (shiftStartTime < shiftEndTime) {
                // Normal shift (e.g., 8:00 AM to 8:00 PM)
                return slotTime >= shiftStartTime && slotTime < shiftEndTime;
            } else {
                // Overnight shift (e.g., 8:00 PM to 8:00 AM)
                return slotTime >= shiftStartTime || slotTime < shiftEndTime;
            }
        });

        // Check for booked appointments
        const snapshot = await safeFirebaseOperation(
            () => database.ref('appointments').once('value'),
            'Failed to get appointments'
        );
        const appointments = snapshot?.val() || {};
        
        const bookedTimes = Object.values(appointments)
            .filter(apt => 
                apt.doctor === doctorId && 
                apt.date === date &&
                apt.status !== 'cancelled'
            )
            .map(apt => apt.time);

        if (bookedTimes.length >= MAX_APPOINTMENTS_PER_DOCTOR_PER_DAY) {
            return [];
        }

        const finalSlots = availableSlots.filter(slot => !bookedTimes.includes(slot.value));
        
        return finalSlots;
        
    } catch (error) {
        console.error('Error getting available time slots:', error);
        return availableSlots;
    }
}

function showNotification(message, type = 'success', duration = 7000) {
    document.querySelectorAll('.notification').forEach(n => n.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'info' ? 'fa-info-circle' : 
                 type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-triangle';
    
    notification.innerHTML = `
        <div class="d-flex align-items-start">
            <i class="fas ${icon} me-2 mt-1"></i>
            <div class="flex-grow-1">${message}</div>
            <button type="button" class="btn-close ms-2" aria-label="Close"></button>
        </div>
    `;

    const closeBtn = notification.querySelector('.btn-close');
    closeBtn.addEventListener('click', () => notification.remove());

    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

function setupNavbarToggler() {
    const navbarToggler = document.querySelector('.navbar-toggler');
    if (navbarToggler && !navbarToggler.innerHTML.trim()) {
        navbarToggler.innerHTML = `
            <span class="navbar-toggler-icon"></span>
        `;
    }
}

function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        let lastScrollTop = 0;
        
        window.addEventListener('scroll', () => {
            const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            if (currentScrollTop > lastScrollTop && currentScrollTop > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
            
            if (currentScrollTop > 50) {
                navbar.style.background = 'linear-gradient(135deg, rgba(125, 211, 201, 0.95) 0%, rgba(91, 192, 181, 0.95) 50%, rgba(74, 157, 150, 0.95) 100%)';
                navbar.style.backdropFilter = 'blur(10px)';
            } else {
                navbar.style.background = 'var(--bg-gradient)';
                navbar.style.backdropFilter = 'none';
            }
            
            lastScrollTop = currentScrollTop;
        });
        
        navbar.style.transition = 'transform 0.3s ease, background 0.3s ease';
    }
}

function handleVisibilityChange() {
    if (!document.hidden) {
        updateTimeSlots();
    }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

window.addEventListener('load', () => {
    document.querySelectorAll('.loading').forEach(el => el.style.display = 'none');
    console.log('MedLink Clinic website loaded successfully');
    
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach((card, index) => {
        card.classList.add('fade-in');
        setTimeout(() => card.classList.add('visible'), index * 200);
    });
});

window.addEventListener('resize', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar && window.innerWidth >= 992) {
        navbar.style.transform = 'translateY(0)';
    }
}); 

function setupImageErrorHandler() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('error', function() {
            if (this.classList.contains('navbar-logo')) {
                const placeholder = document.createElement('div');
                placeholder.className = 'logo-placeholder me-2';
                placeholder.innerHTML = '<i class="fas fa-heartbeat"></i>';
                this.parentNode.replaceChild(placeholder, this);
                
                if (!document.getElementById('logo-fallback-styles')) {
                    const fallbackStyle = document.createElement('style');
                    fallbackStyle.id = 'logo-fallback-styles';
                    fallbackStyle.textContent = `
                        .logo-placeholder {
                            width: 40px;
                            height: 40px;
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 1.2rem;
                            border: 2px solid rgba(255, 255, 255, 0.3);
                            transition: all 0.3s ease;
                        }
                        .navbar-brand:hover .logo-placeholder {
                            background: rgba(255, 255, 255, 0.3);
                            border-color: rgba(255, 255, 255, 0.5);
                            transform: scale(1.05);
                        }
                    `;
                    document.head.appendChild(fallbackStyle);
                }
            } else {
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmaWxsPSIjOTk5Ij5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+';
                this.alt = 'Image not available';
            }
        });
    });
}

// UPDATED: Display appointment results with cancellation functionality - PROPER SPACING
function displayAppointmentResults(appointments, patientName) {
    const checkResult = document.getElementById('checkResult');
    
    if (!checkResult) {
        console.error('Results container not found');
        return;
    }
    
    if (appointments.length === 0) {
        checkResult.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                <strong>No appointments found</strong><br>
                No active appointments found for ${patientName}. 
                Please check the information you entered or book a new appointment.
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="alert alert-success mb-4">
            <i class="fas fa-calendar-check me-2"></i>
            <strong>Found ${appointments.length} appointment(s)</strong> for ${patientName}
        </div>
        
        <div class="appointments-scroll-container">
            <div class="appointments-list">
    `;
    
    appointments.forEach((apt, index) => {
        const formattedDate = formatDisplayDate(apt.date);
        const formattedTime = formatTimeForDisplay(apt.time);
        const statusBadge = apt.status === 'confirmed' ? 
            '<span class="badge bg-success">Confirmed</span>' : 
            '<span class="badge bg-warning">Pending</span>';
        
        html += `
            <div class="appointment-card card mb-3" data-appointment-id="${apt.id}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="card-title mb-0">Appointment #${index + 1}</h6>
                        ${statusBadge}
                    </div>
                    
                    <div class="appointment-details">
                        <p class="mb-1"><strong>Doctor:</strong> ${apt.doctorName || 'Unknown Doctor'}</p>
                        <p class="mb-1"><strong>Date:</strong> ${formattedDate}</p>
                        <p class="mb-1"><strong>Time:</strong> ${formattedTime}</p>
                        <p class="mb-2"><strong>Reason:</strong> ${apt.reason || 'Not specified'}</p>
                    </div>
                    
                    <div class="appointment-actions mt-3">
                        <button type="button" 
                                class="btn btn-outline-danger btn-sm me-2 cancel-single-btn"
                                data-appointment-id="${apt.id}"
                                data-patient-name="${patientName}">
                            <i class="fas fa-times me-1"></i> Cancel Appointment
                        </button>
                        
                        <small class="text-muted">
                            <i class="fas fa-info-circle me-1"></i>
                            Appointment ID: ${apt.id.substring(0, 8)}...
                        </small>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
        
        <!-- Bottom spacing to separate from content below -->
        <div class="results-bottom-spacing"></div>
    `;
    
    checkResult.innerHTML = html;
    
    // Add event listeners to cancel buttons
    const cancelButtons = checkResult.querySelectorAll('.cancel-single-btn');
    cancelButtons.forEach(button => {
        button.addEventListener('click', function() {
            const appointmentId = this.getAttribute('data-appointment-id');
            const patientName = this.getAttribute('data-patient-name');
            
            // Direct cancellation without asking for reason
            if (confirm(`Are you sure you want to cancel the appointment for ${patientName}?`)) {
                cancelSingleAppointment(appointmentId, patientName);
            }
        });
    });
    
    // Add styles for scrollable container and spacing if not already present
    if (!document.getElementById('appointment-results-styles')) {
        const style = document.createElement('style');
        style.id = 'appointment-results-styles';
        style.textContent = `
            .appointment-card {
                border-left: 4px solid var(--primary-color);
                transition: all 0.3s ease;
            }
            
            .appointment-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            .appointment-details {
                background: #f8f9fa;
                padding: 12px;
                border-radius: 6px;
                border-left: 3px solid #6c757d;
            }
            
            .cancel-single-btn {
                transition: all 0.3s ease;
            }
            
            .cancel-single-btn:hover {
                transform: scale(1.05);
            }
            
            /* Scrollable container styles */
            .appointments-scroll-container {
                max-height: 400px;
                overflow-y: auto;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 20px;
                background: #fafafa;
                margin-bottom: 20px;
            }
            
            .appointments-list {
                min-height: 100px;
            }
            
            .scroll-indicator {
                opacity: 0.7;
                animation: fadeInOut 2s infinite;
                margin-bottom: 15px;
            }
            
            @keyframes fadeInOut {
                0%, 100% { opacity: 0.7; }
                50% { opacity: 0.3; }
            }
            
            /* Bottom spacing to prevent intersection with white background */
            .results-bottom-spacing {
                height: 30px;
                background: transparent;
            }
            
            /* Ensure the cancel appointment section has proper padding */
            #cancelAppointment {
                padding-bottom: 40px !important;
                margin-bottom: 30px !important;
            }
            
            /* Custom scrollbar styling */
            .appointments-scroll-container::-webkit-scrollbar {
                width: 8px;
            }
            
            .appointments-scroll-container::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 4px;
            }
            
            .appointments-scroll-container::-webkit-scrollbar-thumb {
                background: var(--primary-color);
                border-radius: 4px;
            }
            
            .appointments-scroll-container::-webkit-scrollbar-thumb:hover {
                background: #45a29e;
            }
            
            /* Add margin to the entire results section */
            #checkResult {
                margin-bottom: 40px;
                padding-bottom: 20px;
            }
        `;
        document.head.appendChild(style);
    }
}

// Helper function to format time for display (12-hour format)
function formatTimeForDisplay(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${minutes || '00'} ${period}`;
}

// ADD THIS FUNCTION DEFINITION
function closeCancelSection() {
    const cancelAppointmentSection = document.getElementById('cancelAppointment');
    const checkAppointmentBtn = document.getElementById('checkAppointmentBtn');
    
    if (cancelAppointmentSection) {
        cancelAppointmentSection.style.display = 'none';
    }
    
    if (checkAppointmentBtn) {
        checkAppointmentBtn.innerHTML = '<i class="fas fa-search me-1"></i> Check Appointment';
    }
    
    // Clear form and results
    const checkAppointmentForm = document.getElementById('checkAppointmentForm');
    const checkResult = document.getElementById('checkResult');
    
    if (checkAppointmentForm) {
        checkAppointmentForm.reset();
    }
    if (checkResult) {
        checkResult.innerHTML = '';
    }
    
    console.log('Cancel section closed');
}

// Setup check appointment button — redirects to my-appointments.html if logged in,
// shows a sign-in notification if not.
function setupCheckAppointmentButton() {
    const checkAppointmentBtn = document.getElementById('checkAppointmentBtn');
    if (!checkAppointmentBtn) return;

    checkAppointmentBtn.addEventListener('click', function () {
        const isLoggedIn = !!sessionStorage.getItem('medlink_user');

        if (isLoggedIn) {
            window.location.href = 'my-appointments.html';
        } else {
            showNotification(
                'Please <a href="patient-login.html" class="fw-bold text-decoration-underline">sign in</a> or ' +
                '<a href="register.html" class="fw-bold text-decoration-underline">create an account</a> ' +
                'to view your appointments.',
                'warning'
            );
        }
    });
}


// Handle checking for existing appointments
async function handleCheckAppointment(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('checkAppointmentSubmitBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Checking...';
    
    try {
        const name = sanitizeInput(document.getElementById('checkName').value.trim());
        const phone = sanitizeInput(document.getElementById('checkPhone').value.replace(/\s/g, ''));
        
        if (!name || !phone) {
            showNotification('Please enter both name and phone number.', 'error');
            return;
        }
        
        if (name.length < 2) {
            showNotification('Please enter a valid name (at least 2 characters).', 'error');
            return;
        }
        
        if (!isValidPhoneNumber(phone)) {
            showNotification('Please enter a valid Philippine phone number.', 'error');
            return;
        }
        
        const result = await checkExistingAppointments(name, phone);
        displayAppointmentResults(result, name);
        
    } catch (error) {
        console.error('Error checking appointments:', error);
        showNotification('Error checking appointments. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Check for existing appointments by name and phone
async function checkExistingAppointments(name, phone) {
    try {
        const snapshot = await safeFirebaseOperation(
            () => database.ref('appointments').once('value'),
            'Failed to load appointments'
        );
        const appointments = snapshot?.val() || {};
        
        // Find all appointments for this patient (focusing on name matching)
        const patientAppointments = [];
        
        for (const [id, apt] of Object.entries(appointments)) {
            const nameMatch = apt.name.toLowerCase().trim() === name.toLowerCase().trim();
            const phoneMatch = apt.phone.replace(/\s/g, '') === phone;
            const isActive = apt.status === 'pending' || apt.status === 'confirmed';
            
            if (nameMatch && phoneMatch && isActive) {
                const doctorName = await getDoctorName(apt.doctor);
                patientAppointments.push({ 
                    id, 
                    ...apt,
                    doctorName: doctorName
                });
            }
        }
        
        return patientAppointments;
        
    } catch (error) {
        console.error('Error checking existing appointments:', error);
        throw new Error('Failed to check appointments');
    }
}

/// UPDATED: Cancel single appointment with reason - FIXED VERSION
async function cancelSingleAppointment(appointmentId, patientName) {
    try {
        const cancellationData = {
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'patient',
            cancellationReason: 'Patient requested cancellation'
        };
        
        await database.ref(`appointments/${appointmentId}`).update(cancellationData);
        
        showNotification('Appointment cancelled successfully!', 'success');
        
        // Refresh the results
        const name = document.getElementById('checkName').value.trim();
        const phone = document.getElementById('checkPhone').value.replace(/\s/g, '');
        const result = await checkExistingAppointments(name, phone);
        displayAppointmentResults(result, name);
        
    } catch (error) {
        console.error('Error cancelling appointment:', error);
        showNotification('Error cancelling appointment. Please try again.', 'error');
    }
}

function setupPhoneFormatter() {
    const phoneInputs = document.querySelectorAll('#patientPhone, #checkPhone');
    
    phoneInputs.forEach(phoneInput => {
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 4) value = value.substring(0, 4) + ' ' + value.substring(4);
                if (value.length >= 8) value = value.substring(0, 8) + ' ' + value.substring(8, 12);
                e.target.value = value;
            });
        }
    });
}

function setupFormValidation() {
    const form = document.getElementById('appointmentForm');
    if (form) {
        const inputs = form.querySelectorAll('input[required], select[required]');
        
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateField(this);
            });
            
            input.addEventListener('input', function() {
                if (this.classList.contains('is-invalid')) {
                    validateField(this);
                }
            });
        });
    }
}

function validateField(field) {
    const value = field.value.trim();
    let isValid = true;

    if (field.hasAttribute('required') && !value) {
        isValid = false;
    } else if (field.type === 'email' && value && !isValidEmail(value)) {
        isValid = false;
    } else if (field.type === 'tel' && value && !isValidPhoneNumber(value)) {
        isValid = false;
    }
    
    if (isValid) {
        field.classList.remove('is-invalid');
    } else {
        field.classList.add('is-invalid');
    }
}

// ALTERNATIVE: More reliable phone formatting
function setupPhoneFormatter() {
    const phoneInputs = document.querySelectorAll('#patientPhone, #checkPhone');
    
    phoneInputs.forEach(phoneInput => {
        if (phoneInput) {
            let previousValue = '';
            let previousCursor = 0;
            
            phoneInput.addEventListener('beforeinput', function(e) {
                // Store state before input
                previousValue = e.target.value;
                previousCursor = e.target.selectionStart;
            });
            
            phoneInput.addEventListener('input', function(e) {
                const currentValue = e.target.value;
                const currentCursor = e.target.selectionStart;
                
                // Get only numbers
                const numbersOnly = currentValue.replace(/\D/g, '').substring(0, 11);
                
                // Format the numbers
                let formattedValue = numbersOnly;
                if (numbersOnly.length > 4) {
                    formattedValue = numbersOnly.substring(0, 4) + ' ' + numbersOnly.substring(4);
                }
                if (numbersOnly.length > 7) {
                    formattedValue = formattedValue.substring(0, 8) + ' ' + numbersOnly.substring(7);
                }
                
                // Update the value
                if (formattedValue !== currentValue) {
                    e.target.value = formattedValue;
                    
                    // Simple cursor positioning - just keep it at the end for typing
                    // This prevents the duplication issue
                    if (formattedValue.length > previousValue.length) {
                        // User is typing, put cursor at end
                        e.target.setSelectionRange(formattedValue.length, formattedValue.length);
                    } else {
                        // User is deleting, try to maintain position
                        let newPosition = Math.min(previousCursor, formattedValue.length);
                        e.target.setSelectionRange(newPosition, newPosition);
                    }
                }
            });
            
            // Basic validation
            phoneInput.addEventListener('keydown', function(e) {
                if (!/[0-9]/.test(e.key) && 
                    !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Escape', 'Enter'].includes(e.key) &&
                    !(e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                }
            });
        }
    });
}

async function cleanupOldAppointments() {
    try {
        const snapshot = await safeFirebaseOperation(
            () => database.ref('appointments').once('value'),
            'Cleanup failed'
        );
        const appointments = snapshot?.val() || {};
        const today = new Date().toISOString().split('T')[0];
        
        let cleanedCount = 0;
        const updatePromises = [];
        
        Object.entries(appointments).forEach(([appointmentId, appointment]) => {
            if (appointment.date < today) {
                if (appointment.status === 'confirmed' || appointment.status === 'cancelled') {
                    updatePromises.push(
                        database.ref(`appointments/${appointmentId}`).remove()
                    );
                    cleanedCount++;
                } else if (appointment.status === 'pending') {
                    updatePromises.push(
                        database.ref(`appointments/${appointmentId}`).update({ 
                            status: 'expired',
                            expiredAt: new Date().toISOString()
                        })
                    );
                    cleanedCount++;
                }
            }
        });
        
        await Promise.all(updatePromises);
        
        if (cleanedCount > 0) {
            console.log(`Auto-cleanup: ${cleanedCount} old appointments processed`);
        }
        
    } catch (error) {
        console.error('Error during appointment cleanup:', error);
    }
}

function setupAutoCleanup() {
    cleanupOldAppointments();
    setInterval(cleanupOldAppointments, 24 * 60 * 60 * 1000);
    setInterval(cleanupOldAppointments, 60 * 60 * 1000);
}

function setupRealtimeListeners() {
    database.ref('doctors').on('value', (snapshot) => {
        console.log('Doctors updated - refreshing doctor list');
        populateDoctorSelect();
        updateTimeSlots();
    });
    
    database.ref('appointments').on('value', (snapshot) => {
        console.log('Appointments updated - refreshing time slots');
        updateTimeSlots();
    });
    
    database.ref('content').on('value', (snapshot) => {
        console.log('Content updated - refreshing page content');
        loadDynamicContent();
    });
    
    database.ref('images').on('value', (snapshot) => {
        console.log('Images updated - refreshing images');
        loadDynamicContent();
    });
    
    database.ref('aboutSection').on('value', (snapshot) => {
        console.log('About section updated - refreshing about content');
        loadDynamicContent();
    });
    
    database.ref('footerContent').on('value', (snapshot) => {
        console.log('Footer updated - refreshing footer');
        loadDynamicContent();
    });
}

function trackAppointmentMetrics(type) {
    const today = new Date().toISOString().split('T')[0];
    console.log(`Appointment ${type} tracked for ${today}`);
    
    if (type === 'success') {
        database.ref(`analytics/appointments/${today}`).transaction(current => {
            return (current || 0) + 1;
        });
    }
}

function measurePerformance() {
    if ('performance' in window) {
        const navTiming = performance.getEntriesByType('navigation')[0];
        if (navTiming) {
            console.log('Page load time:', navTiming.loadEventEnd - navTiming.navigationStart, 'ms');
        }
    }
}

window.addEventListener('load', measurePerformance);

const style = document.createElement('style');
style.textContent = `
    .loading-skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
        border-radius: 4px;
    }
    
    @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
`;
document.head.appendChild(style);

// Helper functions
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${minutes || '00'} ${period}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

async function getDoctorName(doctorId) {
    try {
        const snapshot = await database.ref(`doctors/${doctorId}`).once('value');
        const doctor = snapshot.val();
        return doctor ? doctor.name : 'Unknown Doctor';
    } catch (error) {
        console.error('Error getting doctor name:', error);
        return 'Unknown Doctor';
    }
}
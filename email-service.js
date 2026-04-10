class EmailService {
    constructor() {
       
        this.serviceId = 'service_o75fjym'; 
        this.templateId = 'template_76cqvoa'; 
        this.publicKey = 'BMrviYfKdtTypVr3K'; 
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            if (typeof emailjs === 'undefined') {
                await this.loadEmailJS();
            }
            
            emailjs.init(this.publicKey);
            
            this.initialized = true;
            console.log('EmailJS service initialized');
        } catch (error) {
            console.error('Failed to initialize EmailJS:', error);
        }
    }

    loadEmailJS() {
        return new Promise((resolve, reject) => {
            if (typeof emailjs !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/emailjs-com@3/dist/email.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async triggerAppointmentEmail(appointmentData) {
        try {
            if (!this.initialized) {
                await this.init();
            }

            if (!appointmentData.email || !this.isValidEmail(appointmentData.email)) {
                return { success: false, message: 'No valid email provided' };
            }

            const doctorName = await this.getDoctorName(appointmentData.doctor);

            const templateParams = {
                to_email: appointmentData.email,
                patient_name: appointmentData.name,
                doctor_name: doctorName,
                appointment_date: this.formatDisplayDate(appointmentData.date),
                appointment_time: this.formatTimeForDisplay(appointmentData.time),
                patient_phone: appointmentData.phone,
                reason: appointmentData.reason || 'Not specified',
                clinic_phone: '+63 905 517 7314',
                clinic_address: '123 Healthcare St., Marikina, Philippines'
            };

            console.log('Sending email with params:', templateParams);

            // Send email via EmailJS
            const result = await emailjs.send(this.serviceId, this.templateId, templateParams);
            console.log('Email sent successfully:', result);
            
            return { 
                success: true, 
                message: 'Appointment booked! Confirmation email sent successfully.' 
            };

        } catch (error) {
            console.error('Error sending email with EmailJS:', error);
            return { 
                success: false, 
                error: error.message,
                message: 'Appointment booked! Email notification failed.' 
            };
        }
    }

    async getDoctorName(doctorId) {
        try {
            const snapshot = await database.ref(`doctors/${doctorId}`).once('value');
            const doctor = snapshot.val();
            return doctor ? doctor.name : 'the Doctor';
        } catch (error) {
            return 'the Doctor';
        }
    }

    formatDisplayDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long', 
            day: 'numeric'
        });
    }

    formatTimeForDisplay(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        return `${displayHour}:${minutes || '00'} ${period}`;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Initialize email service
const emailService = new EmailService();
/**
 * Grade Calculation App Logic
 * Handles Navigation, Auth, Data Storage, and UI Generation
 */

class GradeApp {
    constructor() {
        this.currentUser = null;
        this.students = JSON.parse(localStorage.getItem('students')) || [];
        // Hardcoded teacher for demo
        this.teachers = JSON.parse(localStorage.getItem('teachers')) || [{ user: 'admin', pass: 'admin' }];

        this.init();
    }

    init() {
        // If already logged in (optional persistence, but let's stick to simple session)
        this.attachEventListeners();
    }

    /* --- Navigation --- */
    navigateTo(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        // Show target
        const target = document.getElementById(`page-${pageId}`);
        if (target) target.classList.add('active');

        // Manage Header
        const header = document.getElementById('main-header');
        if (pageId === 'intro' || pageId.startsWith('login')) {
            header.classList.add('hidden');
        } else {
            header.classList.remove('hidden');
        }

        // Scroll top
        window.scrollTo(0, 0);
    }

    goBack() {
        const active = document.querySelector('.page.active');
        if (!active) return;

        // Simple history logic or specific mapping
        const id = active.id;
        if (id.includes('login')) this.navigateTo('intro');
        if (id === 'page-add-student') this.navigateTo('teacher-dash');
        if (id === 'page-view-grades') {
            if (this.currentUser?.role === 'teacher') this.navigateTo('teacher-dash');
            else this.navigateTo('student-dash');
        }
    }

    /* --- Authentication --- */
    toggleAuthTab(role, mode) {
        const parent = document.querySelector(`#page-login-${role} .form-container`);
        parent.querySelectorAll('.tab').forEach(t => t.classList.toggle('active'));
        parent.querySelectorAll('form').forEach(f => f.classList.remove('active'));

        const formId = `${role}-${mode}-form`;
        document.getElementById(formId).classList.add('active');
    }

    handleLogin(role, event) {
        event.preventDefault();

        if (role === 'teacher') {
            const user = document.getElementById('t-login-user').value;
            const pass = document.getElementById('t-login-pass').value;

            const valid = this.teachers.find(t => t.user === user && t.pass === pass);
            if (valid) {
                this.currentUser = { role: 'teacher', ...valid };
                this.navigateTo('teacher-dash');
            } else {
                alert('Invalid Teacher Credentials (Try admin/admin)');
            }
        } else {
            const user = document.getElementById('s-login-id').value;
            const pass = document.getElementById('s-login-pass').value;

            const valid = this.students.find(s => s.id === user && s.pass === pass);
            if (valid) {
                this.currentUser = { role: 'student', ...valid };
                this.loadStudentDash();
                this.navigateTo('student-dash');
            } else {
                alert('Student not found or wrong password');
            }
        }
    }

    handleSignup(role, event) {
        event.preventDefault();
        if (role === 'teacher') {
            const user = document.getElementById('t-signup-user').value;
            const pass = document.getElementById('t-signup-pass').value;
            this.teachers.push({ user, pass });
            localStorage.setItem('teachers', JSON.stringify(this.teachers));
            alert('Teacher Signed Up! Please Login.');
            this.toggleAuthTab('teacher', 'login');
        } else {
            const id = document.getElementById('s-signup-id').value;
            const name = document.getElementById('s-signup-name').value;
            const pass = document.getElementById('s-signup-pass').value;

            // Validation: Letters and single spaces only, no numbers
            const nameRegex = /^[a-zA-Z]+(?: [a-zA-Z]+)*$/;
            if (!nameRegex.test(name)) {
                alert('Invalid Name: Please use only letters and single spaces between words (no numbers or special characters).');
                return;
            }

            if (this.students.find(s => s.id === id)) {
                alert('Student ID already exists');
                return;
            }

            // New student with empty marks
            this.students.push({ id, name, pass, branch: '', marks: [], cgpa: 0 });
            localStorage.setItem('students', JSON.stringify(this.students));
            alert('Student Registered! Please Login to check grades (once added by teacher).');
            this.toggleAuthTab('student', 'login');
        }
    }

    logout() {
        this.currentUser = null;
        this.navigateTo('intro');
    }

    /* --- Teacher: Add Student --- */
    generateSubjectInputs() {
        const count = parseInt(document.getElementById('as-subjects-count').value);
        const container = document.getElementById('subject-inputs-container');
        container.innerHTML = '';

        if (!count || count < 0) return;

        for (let i = 0; i < count; i++) {
            const div = document.createElement('div');
            div.className = 'input-group';
            div.innerHTML = `<input type="number" placeholder="Sub ${i + 1} Marks" class="sub-mark" max="100" required>`;
            container.appendChild(div);
        }

        document.getElementById('btn-add-student-final').classList.remove('hidden');
    }

    addStudent(event) {
        event.preventDefault();

        const id = document.getElementById('as-id').value;
        const name = document.getElementById('as-name').value;
        const branch = document.getElementById('as-branch').value;
        const year = document.getElementById('as-year').value;
        const section = document.getElementById('as-section').value;

        // Validation: Letters and single spaces only, no numbers
        const nameRegex = /^[a-zA-Z]+(?: [a-zA-Z]+)*$/;
        if (!nameRegex.test(name)) {
            alert('Invalid Name: Please use only letters and single spaces between words (no numbers or special characters).');
            return;
        }

        // Collect Marks
        const markInputs = document.querySelectorAll('.sub-mark');
        let total = 0;
        let marks = [];
        let hasFail = false;

        markInputs.forEach((input, index) => {
            const m = parseFloat(input.value) || 0;
            marks.push({ subject: `Subject ${index + 1}`, mark: m });
            total += m;
            if (m < 35) hasFail = true;
        });

        // Calculate Logic (Simple avg for CGPA demo: Max 100 * count)
        const maxTotal = marks.length * 100;
        const percentage = (total / maxTotal) * 100;
        const cgpa = (percentage / 9.5).toFixed(2); // Standard approximation

        let grade = 'F';
        if (!hasFail) {
            if (percentage >= 80) grade = 'A';
            else if (percentage >= 60) grade = 'B';
            else if (percentage >= 50) grade = 'C';
            else grade = 'D'; // Pass but low
        } else {
            grade = 'Fail';
        }

        const newStudent = {
            id, name, branch, year, section, marks, total, cgpa, grade,
            pass: id // Default pass is ID for simplicity if they haven't signed up yet, or merge logic
        };

        // Check if exists (update) or push
        const idx = this.students.findIndex(s => s.id === id);
        if (idx >= 0) {
            // retain password if they signed up
            newStudent.pass = this.students[idx].pass;
            this.students[idx] = newStudent;
        } else {
            this.students.push(newStudent);
        }

        localStorage.setItem('students', JSON.stringify(this.students));

        alert('Student Added Successfully!');
        document.getElementById('add-student-form').reset();
        document.getElementById('subject-inputs-container').innerHTML = '';
        document.getElementById('btn-add-student-final').classList.add('hidden');

        this.navigateTo('view-grades');
        this.renderGradesTable('all');
    }

    /* --- View Grades --- */
    renderGradesTable(filter) {
        const tbody = document.getElementById('grades-table-body');
        tbody.innerHTML = '';

        let displayData = [...this.students];

        if (filter === 'rank-high') {
            displayData.sort((a, b) => b.cgpa - a.cgpa);
        } else if (filter === 'failed') {
            displayData = displayData.filter(s => s.grade === 'Fail');
        }

        // Filter by class/branch if needed? Requirement says "According to class and branch".
        // For now, global list sorted.

        if (displayData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">No students found</td></tr>';
            return;
        }

        displayData.forEach((s, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${s.id}</td>
                <td class="prevent-select student-name-cell" data-id="${s.id}" data-name="${s.name}">${s.name}</td>
                <td>${s.branch}</td>
                <td>${s.year} / ${s.section}</td>
                <td>${s.total}</td>
                <td>${s.cgpa}</td>
                <td style="color: ${s.grade === 'Fail' ? '#ef4444' : '#2dd4bf'}">${s.grade}</td>
            `;
            tbody.appendChild(tr);

            // Add Long Press Event if Teacher
            if (this.currentUser?.role === 'teacher') {
                const nameCell = tr.querySelector('.student-name-cell');
                let pressTimer;

                const startPress = () => {
                    pressTimer = setTimeout(() => {
                        this.showRemoveModal(s.id, s.name);
                    }, 800); // 800ms long press
                };

                const endPress = () => {
                    clearTimeout(pressTimer);
                };

                // Mouse
                nameCell.addEventListener('mousedown', startPress);
                nameCell.addEventListener('mouseup', endPress);
                nameCell.addEventListener('mouseleave', endPress);

                // Touch
                nameCell.addEventListener('touchstart', startPress);
                nameCell.addEventListener('touchend', endPress);
            }
        });
    }

    filterStudents(type) {
        this.renderGradesTable(type);
    }

    /* --- Remove Student --- */
    showRemoveModal(id, name) {
        document.getElementById('delete-student-name').innerText = name;
        document.getElementById('delete-modal').classList.remove('hidden');

        // Bind confirm button
        const btn = document.getElementById('confirm-delete-btn');
        btn.onclick = () => this.deleteStudent(id);
    }

    closeModal() {
        document.getElementById('delete-modal').classList.add('hidden');
    }

    deleteStudent(id) {
        this.students = this.students.filter(s => s.id !== id);
        localStorage.setItem('students', JSON.stringify(this.students));
        this.closeModal();
        this.renderGradesTable('all'); // Refresh table
    }

    /* --- Student Dashboard --- */
    loadStudentDash() {
        document.getElementById('student-welcome-name').innerText = `Hello, ${this.currentUser.name}`;

        const tbody = document.getElementById('my-marks-body');
        tbody.innerHTML = '';

        if (!this.currentUser.marks || this.currentUser.marks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No marks added yet by teacher.</td></tr>';
            document.getElementById('my-summary-footer').innerText = '';
            return;
        }

        this.currentUser.marks.forEach(m => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${m.subject}</td>
                <td>${m.mark}</td>
                <td>${m.mark >= 35 ? 'Pass' : 'Fail'}</td>
             `;
            tbody.appendChild(tr);
        });

        document.getElementById('my-summary-footer').innerHTML = `
            Total: ${this.currentUser.total} | CGPA: ${this.currentUser.cgpa} | Grade: ${this.currentUser.grade}
        `;
    }

    /* --- Helpers --- */
    clearInput(id) {
        const input = document.getElementById(id);
        if (input) input.value = '';
    }

    attachEventListeners() {
        // Global clicks for dynamic UI
        document.getElementById('logout-btn').addEventListener('click', () => this.logout());

        // Forms
        document.getElementById('teacher-login-form').addEventListener('submit', (e) => this.handleLogin('teacher', e));
        document.getElementById('teacher-signup-form').addEventListener('submit', (e) => this.handleSignup('teacher', e));

        document.getElementById('student-login-form').addEventListener('submit', (e) => this.handleLogin('student', e));
        document.getElementById('student-signup-form').addEventListener('submit', (e) => this.handleSignup('student', e));

        document.getElementById('add-student-form').addEventListener('submit', (e) => this.addStudent(e));

        // Input clear icons visibility (simple toggle on focus/input)
        document.querySelectorAll('input').forEach(inp => {
            inp.addEventListener('input', function () {
                const icon = this.nextElementSibling;
                if (icon && icon.classList.contains('clear-input')) {
                    icon.style.display = this.value ? 'block' : 'none';
                }
            });
        });
    }
}

// Initialize
const app = new GradeApp();

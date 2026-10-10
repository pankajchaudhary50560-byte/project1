document.addEventListener("DOMContentLoaded", function () {

    console.log("SP Chaudhary School Management System Started");

    // Dashboard: update only if elements exist
    const studentsCard = document.getElementById("students");
    const teachersCard = document.getElementById("teachers");
    const attendanceCard = document.getElementById("attendance");
    const feesCard = document.getElementById("fees");

    if (studentsCard) studentsCard.textContent = "0";
    if (teachersCard) teachersCard.textContent = "0";
    if (attendanceCard) attendanceCard.textContent = "0%";
    if (feesCard) feesCard.textContent = "₹0";

    // Student Admission
    const form = document.getElementById("studentForm");

    if (!form) return;

    const table = document.getElementById("studentTable");
    const total = document.getElementById("totalStudents");
    const search = document.getElementById("search");
    const photoInput = document.getElementById("photo");
    const preview = document.getElementById("photoPreview");

    const STORAGE_KEY = "spChaudharyStudentsDemo";

    let students = [];

    try {
        students = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        if (!Array.isArray(students)) students = [];
    } catch (error) {
        students = [];
    }

    let selectedPhoto = "";

    // Student photo preview
    photoInput.addEventListener("change", function () {
        const file = photoInput.files[0];

        selectedPhoto = "";
        preview.removeAttribute("src");
        preview.style.display = "none";

        if (!file) return;

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            alert("JPG, PNG या WebP फोटो चुनें।");
            photoInput.value = "";
            return;
        }

        if (file.size > 500 * 1024) {
            alert("500 KB से छोटी फोटो चुनें।");
            photoInput.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = function (event) {
            selectedPhoto = event.target.result;
            preview.src = selectedPhoto;
            preview.style.display = "block";
        };

        reader.readAsDataURL(file);
    });

    // Save student
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const student = {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            admissionNo: document.getElementById("admissionNo").value.trim(),
            rollNo: document.getElementById("rollNo").value.trim(),
            studentName: document.getElementById("studentName").value.trim(),
            fatherName: document.getElementById("fatherName").value.trim(),
            motherName: document.getElementById("motherName").value.trim(),
            dob: document.getElementById("dob").value,
            className: document.getElementById("className").value,
            section: document.getElementById("section").value,
            gender: document.getElementById("gender").value,
            mobile: document.getElementById("mobile").value.trim(),
            address: document.getElementById("address").value.trim(),
            photo: selectedPhoto
        };

        if (students.some(s =>
            s.admissionNo.toLowerCase() === student.admissionNo.toLowerCase()
        )) {
            alert("यह Admission Number पहले से मौजूद है।");
            return;
        }

        students.push(student);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
        } catch (error) {
            students.pop();
            alert("Storage भर गया है। छोटी फोटो चुनकर दोबारा कोशिश करें।");
            return;
        }

        form.reset();
        selectedPhoto = "";
        preview.removeAttribute("src");
        preview.style.display = "none";

        renderStudents();

        alert("Student successfully saved!");
    });

    // Show student records
    function renderStudents() {
        const query = search.value.toLowerCase().trim();

        const filtered = students.filter(student => {
            const text = [
                student.admissionNo,
                student.rollNo,
                student.studentName,
                student.fatherName,
                student.className
            ].join(" ").toLowerCase();

            return text.includes(query);
        });

        table.replaceChildren();

        filtered.forEach(student => {
            const row = document.createElement("tr");

            function addCell(value) {
                const cell = document.createElement("td");
                cell.textContent = value || "—";
                row.appendChild(cell);
            }

            const photoCell = document.createElement("td");

            if (student.photo) {
                const img = document.createElement("img");
                img.src = student.photo;
                img.alt = "Student";
                img.className = "photo-small";
                photoCell.appendChild(img);
            } else {
                photoCell.textContent = "No Photo";
            }

            row.appendChild(photoCell);

            addCell(student.admissionNo);
            addCell(student.rollNo);
            addCell(student.studentName);
            addCell(student.fatherName);
            addCell(student.className);
            addCell(student.section);

            const actionCell = document.createElement("td");
            actionCell.className = "no-print";

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.className = "delete-btn";

            deleteButton.addEventListener("click", function () {
                if (!confirm("क्या इस विद्यार्थी का रिकॉर्ड हटाना है?")) return;

                const previousStudents = students;
                students = students.filter(s => s.id !== student.id);

                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
                    renderStudents();
                } catch (error) {
                    students = previousStudents;
                    alert("रिकॉर्ड हटाते समय समस्या आई।");
                }
            });

            actionCell.appendChild(deleteButton);
            row.appendChild(actionCell);

            table.appendChild(row);
        });

        total.textContent = students.length;
    }

    search.addEventListener("input", renderStudents);

    renderStudents();

});
// ======================================
// SP CHAUDHARY ATTENDANCE MANAGEMENT
// ======================================

document.addEventListener("DOMContentLoaded", function () {

    const classSelect = document.getElementById("attendanceClass");

    // Attendance code only runs on attendance.html
    if (!classSelect) return;

    const dateInput = document.getElementById("attendanceDate");
    const sectionSelect = document.getElementById("attendanceSection");
    const loadButton = document.getElementById("loadStudents");
    const absentButton = document.getElementById("markAllAbsent");
    const presentButton = document.getElementById("markAllPresent");
    const saveButton = document.getElementById("saveAttendance");
    const printButton = document.getElementById("printAttendance");

    const table = document.getElementById("attendanceTable");
    const message = document.getElementById("message");
    const saveMessage = document.getElementById("saveMessage");

    const STORAGE_KEY = "spChaudharyStudentsDemo";
    const ATTENDANCE_KEY = "spChaudharyAttendanceDemo";

    let students = [];
    let records = {};
    let displayedStudents = [];
    let attendance = {};

    // Use local date rather than UTC date.
    function getLocalDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    dateInput.value = getLocalDate();

    function loadStoredData() {
        try {
            const storedStudents =
                JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

            const storedAttendance =
                JSON.parse(localStorage.getItem(ATTENDANCE_KEY) || "{}");

            students = Array.isArray(storedStudents) ? storedStudents : [];

            records = storedAttendance &&
                      typeof storedAttendance === "object" &&
                      !Array.isArray(storedAttendance)
                ? storedAttendance
                : {};

        } catch (error) {
            students = [];
            records = {};
            message.textContent = "Stored data पढ़ने में समस्या आई।";
        }
    }

    function getRecordKey() {
        return [
            dateInput.value,
            classSelect.value,
            sectionSelect.value
        ].join("_");
    }

    function updateSummary() {
        const total = displayedStudents.length;

        const present = displayedStudents.filter(
            student => attendance[student.id] === "Present"
        ).length;

        const absent = total - present;

        document.getElementById("totalCount").textContent = total;
        document.getElementById("presentCount").textContent = present;
        document.getElementById("absentCount").textContent = absent;

        const percent = total ? Math.round((present / total) * 100) : 0;

        document.getElementById("attendancePercent").textContent =
            percent + "%";
    }

    function renderTable() {
        table.replaceChildren();

        if (!displayedStudents.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 4;
            cell.textContent =
                "इस कक्षा/सेक्शन में विद्यार्थी नहीं मिले। पहले Student Admission में बच्चों का रिकॉर्ड जोड़ें।";

            row.appendChild(cell);
            table.appendChild(row);

            updateSummary();
            return;
        }

        displayedStudents.forEach(student => {
            const row = document.createElement("tr");

            function addCell(value) {
                const cell = document.createElement("td");
                cell.textContent = value || "—";
                row.appendChild(cell);
            }

            addCell(student.rollNo);
            addCell(student.admissionNo);
            addCell(student.studentName);

            const statusCell = document.createElement("td");
            const select = document.createElement("select");

            select.className = "status-select";

            // All students default to Absent.
            select.innerHTML = `
                <option value="Absent">🔴 Absent</option>
                <option value="Present">🟢 Present</option>
            `;

            select.value = attendance[student.id] || "Absent";

            select.addEventListener("change", function () {
                attendance[student.id] = select.value;
                updateSummary();
                saveMessage.textContent =
                    "बदलाव अभी सेव नहीं हुए हैं। Save Attendance दबाएँ।";
            });

            statusCell.appendChild(select);
            row.appendChild(statusCell);
            table.appendChild(row);
        });

        updateSummary();
    }

    function loadClassStudents() {
        message.textContent = "";
        saveMessage.textContent = "";

        if (!classSelect.value) {
            alert("पहले कक्षा चुनें।");
            return;
        }

        if (!dateInput.value) {
            alert("Attendance की तारीख चुनें।");
            return;
        }

        loadStoredData();

        displayedStudents = students.filter(student => {
            const sameClass =
                String(student.className) === classSelect.value;

            const sameSection =
                !sectionSelect.value ||
                String(student.section || "") === sectionSelect.value;

            return sameClass && sameSection;
        });

        const key = getRecordKey();
        const savedRecord = records[key];

        if (savedRecord && Array.isArray(savedRecord.entries)) {
            attendance = {};

            displayedStudents.forEach(student => {
                const savedEntry = savedRecord.entries.find(
                    entry => entry.studentId === student.id
                );

                attendance[student.id] =
                    savedEntry && savedEntry.status === "Present"
                        ? "Present"
                        : "Absent";
            });
        } else {
            attendance = {};

            displayedStudents.forEach(student => {
                attendance[student.id] = "Absent";
            });
        }

        document.getElementById("classHeading").textContent =
            "Class " + classSelect.value +
            (sectionSelect.value ? " - Section " + sectionSelect.value : " - All Sections") +
            " | Attendance: " + dateInput.value;

        renderTable();

        message.textContent =
            displayedStudents.length +
            " विद्यार्थी मिले। सभी डिफॉल्ट रूप से Absent हैं।";

        saveMessage.textContent = "";
    }

    loadButton.addEventListener("click", loadClassStudents);

    // Mark all absent
    absentButton.addEventListener("click", function () {
        displayedStudents.forEach(student => {
            attendance[student.id] = "Absent";
        });

        renderTable();

        saveMessage.textContent =
            "सभी विद्यार्थी Absent किए गए हैं। बदलाव सेव करने के लिए Save Attendance दबाएँ।";
    });

    // Mark all present
    presentButton.addEventListener("click", function () {
        displayedStudents.forEach(student => {
            attendance[student.id] = "Present";
        });

        renderTable();

        saveMessage.textContent =
            "सभी विद्यार्थी Present किए गए हैं। बदलाव सेव करने के लिए Save Attendance दबाएँ।";
    });

    // Save attendance
    saveButton.addEventListener("click", function () {
        if (!classSelect.value || !dateInput.value) {
            alert("कक्षा और तारीख चुनें।");
            return;
        }

        if (!displayedStudents.length) {
            alert("पहले Show Students दबाकर विद्यार्थियों की सूची खोलें।");
            return;
        }

        const key = getRecordKey();

        // Preserve other sections/classes for the same date.
        const previousRecord = records[key];

        const newEntries = displayedStudents.map(student => ({
            studentId: student.id,
            admissionNo: student.admissionNo,
            rollNo: student.rollNo,
            studentName: student.studentName,
            status: attendance[student.id] === "Present"
                ? "Present"
                : "Absent"
        }));

        records[key] = {
            date: dateInput.value,
            className: classSelect.value,
            section: sectionSelect.value,
            entries: newEntries,
            updatedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));

            saveMessage.textContent =
                "✅ Attendance सफलतापूर्वक सेव हो गई!";

            updateSummary();

        } catch (error) {
            if (previousRecord) {
                records[key] = previousRecord;
            } else {
                delete records[key];
            }

            saveMessage.textContent =
                "❌ सेव नहीं हुआ। Browser storage की जगह जाँचें।";
        }
    });

    // Print attendance list
    printButton.addEventListener("click", function () {
        if (!displayedStudents.length) {
            alert("पहले कक्षा की सूची खोलें।");
            return;
        }

        window.print();
    });

    // Reload when class, date or section changes.
    classSelect.addEventListener("change", function () {
        displayedStudents = [];
        attendance = {};
        table.replaceChildren();

        document.getElementById("classHeading").textContent =
            "विद्यार्थियों की सूची";

        document.getElementById("totalCount").textContent = "0";
        document.getElementById("presentCount").textContent = "0";
        document.getElementById("absentCount").textContent = "0";
        document.getElementById("attendancePercent").textContent = "0%";

        message.textContent = "";
        saveMessage.textContent = "";
    });

    sectionSelect.addEventListener("change", function () {
        displayedStudents = [];
        attendance = {};
        table.replaceChildren();

        document.getElementById("classHeading").textContent =
            "विद्यार्थियों की सूची";

        document.getElementById("totalCount").textContent = "0";
        document.getElementById("presentCount").textContent = "0";
        document.getElementById("absentCount").textContent = "0";
        document.getElementById("attendancePercent").textContent = "0%";

        message.textContent = "";
        saveMessage.textContent = "";
    });

    dateInput.addEventListener("change", function () {
        displayedStudents = [];
        attendance = {};
        table.replaceChildren();

        document.getElementById("classHeading").textContent =
            "विद्यार्थियों की सूची";

        document.getElementById("totalCount").textContent = "0";
        document.getElementById("presentCount").textContent = "0";
        document.getElementById("absentCount").textContent = "0";
        document.getElementById("attendancePercent").textContent = "0%";

        message.textContent = "";
        saveMessage.textContent = "";
    });

    loadStoredData();

});
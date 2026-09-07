# DPI Biometric Attendance Radar — System Documentation & Operations Manual

## 📌 Executive Overview
The **DPI Biometric Attendance Radar** is an enterprise-grade workforce management, attendance tracking, and biometric radar web application. It connects directly to **eSSL biometric fingerprint scanners, face-recognition hardware, and RFID card readers** via HTTP Webhooks and Supabase PostgreSQL.

---

## 🌐 Supported Languages (Multi-Language i18n)
The system features native multi-language support:
- 🇬🇧 **English (`en`)** — Primary Default Language
- 🇮🇳 **Tamil (`ta` - தமிழ்)** — Secondary Language
- 🇮🇳 **Hindi (`hi` - हिंदी)** — Secondary Language

Language selection is persisted across browser reloads via `localStorage` (`dpi_language`) and can be toggled instantly from the **Header**, **Desktop Sidebar**, or **Settings Dashboard**.

---

## 🏗️ Architecture & Data Pipeline

```
[ eSSL Biometric Scanner ] ──(HTTP Webhook)──> [ Supabase PostgreSQL DB ]
                                                       │
                                            (Realtime WebSockets)
                                                       │
                                                       ▼
                                            [ DPI Attendance Web App ]
                                                       │
                                           (Fallback / Local Mode)
                                                       ▼
                                            [ Browser LocalStorage ]
```

1. **Supabase Realtime Mode**:
   - Listens to PostgreSQL `postgres_changes` on the `attendance_logs` table.
   - Automatically injects new punches into the UI without page refreshes (0ms optimistic latency).
2. **Local Standalone Mode**:
   - Automatically activates if internet or database connectivity drops.
   - All attendance punches and admin operations are saved to browser `localStorage` and synchronized once connectivity resumes.

---

## 🧮 Attendance Math & Calculation Engine

### Shift & Timing Rules
- **Standard Work Shift**: `09:00 AM` to `06:00 PM` (9.0 Hours).
- **Grace Period**: Punches up to `09:30 AM` are marked as **On Time**.
- **Late Arrival Threshold**: Any first punch recorded after `09:30 AM` is classified as **Late Arrival**.
- **Early Departure Threshold**: Any final OUT punch recorded before `05:30 PM` is flagged as **Early Departure**.

### In/Out Punch Pairing Algorithm
1. **First Punch of the Day**: Classified as `IN`.
2. **Subsequent Punches**: Chronologically paired.
3. **Active Session Detection**: If an employee has an `IN` punch on the current day with no matching `OUT` punch, their status is set to **Active In Office**.
4. **Overtime (OT) Calculation**: Net working duration exceeding 9.0 hours per day is categorized as **Overtime Hours**.

---

## 🛡️ Admin Operations Portal

### 1. Leave Manager
- **Types**: Sick Leave (SL), Casual Leave (CL), Paid Leave (PL), Unpaid Leave (UL).
- **Behavior**: Active leaves excuse absence and update daily roster metrics.

### 2. On Duty (OD) Register
- **Use Case**: Field visits, client meetings, offsite work.
- **Behavior**: Active OD entries automatically override *"Absent"* status without requiring biometric machine swipes.

### 3. Punch Regularization
- **Use Case**: Correct missing IN or OUT punches caused by machine hardware glitches, unreadable fingerprints, or forgotten swipes.

### 4. Holiday Calendar & Shift Schedules
- **Holiday Calendar**: Configure official company holidays.
- **Shift Timings**: Define customized shift start/end times per department.

---

## 📄 Reports & PDF Export Hub
- **Executive PDF Branding**: Customize company title (e.g. *DPI Attendance Systems*) and accent color palettes (*DPI Indigo, Emerald Green, Sapphire Blue, Coral Red, Slate Dark*).
- **Excel Exports**: Raw `.xlsx` export of attendance logs, employee rosters, and monthly timesheets.

---

## 📱 Progressive Web App (PWA) Deployment
- **Desktop Installation**: Can be installed directly onto Windows desktop and macOS as a standalone application.
- **Icon Assets**: Uses custom `dpi.png` / `dpi-transparent.png` branding for Windows taskbar and desktop app launcher.

---

## 💻 Tech Stack
- **Frontend**: React, Vite, TailwindCSS
- **State & Realtime**: Custom Hooks (`useAttendanceData`, `useAdminOperations`, `useExportHub`, `useTranslation`), Supabase JS Client
- **Icons**: Lucide React
- **Export Engines**: SheetJS (XLSX), JSPDF / HTML2Canvas

# Task & Diet Tracker (Groundwork)

Electron + React (Vite) + TypeScript starter focused on:

- Bootstrap-based UI with built-in light/dark modes
- Auburn/orange light theme styling
- Responsive layout for desktop and mobile
- Local JSON persistence through secure Electron IPC
- JSON import/export from Settings
- Shared date input (`MM/DD/YYYY` storage) across trackers and settings
- Weight graph placeholder area (blank groundwork)

## Run

1. Install dependencies:
   - `npm install`
2. Start development mode:
   - `npm run dev`

## Data Storage

User data is stored at:

- Electron user data path + `task-weight-data.json`

You can import/export this JSON from the Settings page.

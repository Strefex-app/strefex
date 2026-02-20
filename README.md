# STREFEX Platform

A modern Industry Management dashboard application built with React and Vite.

## Features

- **Login Page**: Secure authentication interface
- **Dashboard**: Industry Management dashboard with:
  - Interactive world map with location markers
  - Match Indicator widget with gauge visualization
  - Supplier Rating widget with star ratings
  - Progress Indicator widget with gauge and progress bar
  - Bottom navigation bar

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Header.jsx      # Top header with logo
│   ├── BottomNav.jsx   # Bottom navigation bar
│   ├── WorldMap.jsx    # Interactive world map
│   ├── MatchIndicator.jsx
│   ├── SupplierRating.jsx
│   └── ProgressIndicator.jsx
├── pages/              # Page components
│   ├── Login.jsx      # Login page
│   └── Dashboard.jsx  # Main dashboard
├── store/              # State management
│   └── authStore.js   # Authentication state
├── App.jsx             # Main app component with routing
└── main.jsx            # Entry point
```

## Technologies Used

- React 18
- React Router DOM
- Zustand (state management)
- React Simple Maps (world map visualization)
- Vite (build tool)

## Usage

1. Start at the login page
2. Enter any email and password to authenticate
3. Navigate to the dashboard to view industry management data
4. Use the bottom navigation to access different sections

## License

MIT

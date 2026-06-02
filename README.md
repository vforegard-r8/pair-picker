# Pair Picker

A smart pair programming tool inspired by parrit.io. Helps teams create optimal programming pairs and tracks pairing history.

**Multi-team support:** One deployment, multiple isolated teams. Each team creates their own credentials and has private data.

## Features

- **🔐 Google OAuth Authentication**: Secure login restricted to @rise8.us emails and whitelisted addresses
- **🧠 Smart Pairing Algorithm**: Automatically pairs people while avoiding recent pair combinations
- **🎯 Manual Drag & Drop**: Manually arrange pairs using an intuitive drag-and-drop interface
- **📊 Pair History**: Track and view past pairing sessions
- **💾 Persistent Storage**: History saved to JSON file
- **🎨 Beautiful UI**: Modern, responsive interface with gradient background

## Tech Stack

- **Backend**: Node.js + Express
- **Authentication**: Passport.js + Google OAuth 2.0
- **Frontend**: React + Vite with react-beautiful-dnd for drag-and-drop
- **Storage**: JSON file-based persistence
- **Styling**: Custom CSS with responsive design

## 🚀 Deploy It

**One deployment serves all teams!**

1. **Push to GitHub** (already done at `git@github.com:vforegard-r8/pair-picker.git`)

2. **Deploy to Render** (free):
   - Go to [render.com](https://render.com)
   - New Web Service → Connect GitHub repo
   - Build: `npm install && npm run build`
   - Start: `npm start`
   - Click "Create"

3. **Share URL** with all Rise8 teams!

Each team creates their own credentials on first use. Data is isolated.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm
- Google OAuth credentials (for authentication) - see [DEPLOY.md](./DEPLOY.md)

### Installation

1. Install server dependencies:
```bash
npm install
```

2. Install client dependencies:
```bash
cd client
npm install
cd ..
```

Or use the shortcut (installs both):
```bash
npm run install-all
```

### Running the Application

#### Development Mode (Recommended)

```bash
npm run dev
```

Visit `http://localhost:3000`

#### Production Build

```bash
npm run build  # Build client
npm start      # Start production server
```

## Usage

### Adding Team Members

1. Enter a name in the "Team Members" section
2. Click "Add" or press Enter
3. Remove members by clicking the × button

### Creating Pairs

**Smart Pairing (Recommended)**:
1. Click "Smart Pair" button
2. Algorithm creates pairs, avoiding recent combinations
3. People who recently paired are less likely to be paired again

**Manual Pairing**:
1. Drag names from "Unpaired" section
2. Drop onto existing pairs or create new pairs
3. Rearrange as needed

### Saving and Viewing History

1. Click "Save Pairs" to record current pairing session
2. Click "Show History" to view past sessions
3. Each session shows date/time and pair combinations
4. Delete old sessions with the "Delete" button

## Project Structure

```
pair-picker/
├── server/
│   └── index.js          # Express API server
├── client/
│   ├── index.html        # HTML template (Vite root)
│   ├── vite.config.js    # Vite configuration
│   └── src/
│       ├── App.js        # Main React component
│       ├── App.css       # Application styles
│       ├── main.jsx      # React entry point
│       └── index.css     # Global styles
├── data/
│   └── pairs-history.json # Persistent storage (auto-created)
├── package.json          # Server dependencies
└── README.md
```

## API Endpoints

- `GET /api/people` - Get list of team members
- `POST /api/people` - Update team members list
- `GET /api/history` - Get pairing history
- `POST /api/pairs/smart` - Generate smart pairs
- `POST /api/pairs/save` - Save current pairs to history
- `DELETE /api/history/:id` - Delete a history session

## Smart Pairing Algorithm

The smart pairing algorithm:
1. Tracks how many times each pair of people has worked together
2. Shuffles the team for randomness
3. Pairs people who have worked together the least
4. Handles odd numbers by creating a solo or trio

This ensures variety and prevents the same pairs from forming repeatedly.

## Data Storage

Pairing data is stored in `data/pairs-history.json`:
```json
{
  "people": ["Alice", "Bob", "Charlie"],
  "history": [
    {
      "id": 1234567890,
      "date": "2026-06-02T...",
      "pairs": [["Alice", "Bob"], ["Charlie"]]
    }
  ]
}
```

## Future Enhancements

- User authentication
- Multiple teams/projects
- Statistics and analytics
- Export history to CSV
- Configurable pairing rules
- Team member availability status

## License

ISC

# Pair Picker

A smart pair programming tool inspired by parrit.io. Helps teams create optimal programming pairs and tracks pairing history.

**Multi-team support:** One deployment, multiple isolated teams. Each team creates their own credentials and has private data.

## Features

- **🔐 Multi-Team Authentication**: Secure team-based login with password protection
- **🧠 Smart Pairing Algorithm**: Automatically pairs people while avoiding recent pair combinations
- **🎯 Manual Drag & Drop**: Manually arrange pairs using an intuitive drag-and-drop interface
- **📊 Pair History**: Track and view past pairing sessions with persistent storage
- **💾 MongoDB Storage**: Persistent storage that survives container restarts (no data loss!)
- **🔄 Session Persistence**: Stay logged in across server restarts
- **🎨 Beautiful UI**: Modern, responsive interface with gradient background

## Tech Stack

- **Backend**: Node.js + Express
- **Authentication**: Passport.js with multi-team password-based authentication
- **Frontend**: React + Vite with react-beautiful-dnd for drag-and-drop
- **Storage**: MongoDB Atlas (persistent cloud database)
- **Sessions**: MongoDB-backed sessions via connect-mongo
- **Styling**: Custom CSS with responsive design

## Prerequisites

- Node.js (v14 or higher)
- npm
- MongoDB Atlas account (free) - see [MONGODB_SETUP.md](./MONGODB_SETUP.md)

## Getting Started

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

### MongoDB Setup

Before running the application, you need to set up MongoDB:

1. Follow the detailed guide in [MONGODB_SETUP.md](./MONGODB_SETUP.md) to:
   - Create a free MongoDB Atlas account
   - Set up a database cluster
   - Get your connection string

2. Set the environment variable:
   ```bash
   export MONGODB_URI="mongodb+srv://username:password@cluster.xxxxx.mongodb.net/pair-picker?retryWrites=true&w=majority"
   ```

   Or create a `.env` file:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/pair-picker?retryWrites=true&w=majority
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

**Note**: Make sure `MONGODB_URI` is set before running the server.

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

Data is stored in MongoDB Atlas with the following structure:

**Teams Collection:**
```json
{
  "team": "team-name",
  "name": "Team Name",
  "passwordHash": "hashed_password",
  "createdAt": "2026-06-02T..."
}
```

**Team Data Collections** (one per team):
```json
{
  "_id": "team_data",
  "people": ["Alice", "Bob", "Charlie"],
  "history": [
    {
      "id": 1234567890,
      "date": "2026-06-02T...",
      "pairs": [["Alice", "Bob"], ["Charlie"]]
    }
  ],
  "updatedAt": "2026-06-02T..."
}
```

**Sessions Collection** (managed by connect-mongo):
- Stores user login sessions
- Persists across server restarts

## Deployment

For production deployment (e.g., Render, Heroku, Railway):

1. **Set up MongoDB Atlas** following [MONGODB_SETUP.md](./MONGODB_SETUP.md)

2. **Set environment variables** in your hosting platform:
   - `MONGODB_URI`: Your MongoDB connection string
   - `NODE_ENV`: `production`

3. **Deploy** using your platform's standard process

The app will automatically:
- Connect to MongoDB on startup
- Use MongoDB for session storage (persistent logins)
- Store all team data in MongoDB (survives restarts)

## Future Enhancements

- ✅ ~~User authentication~~ (Implemented: Multi-team authentication)
- ✅ ~~Multiple teams/projects~~ (Implemented: Multi-team support)
- ✅ ~~Persistent storage~~ (Implemented: MongoDB Atlas)
- Statistics and analytics dashboard
- Export history to CSV/JSON
- Configurable pairing rules and constraints
- Team member availability status
- Slack/Discord integration for notifications
- API endpoints for external integrations

## License

ISC

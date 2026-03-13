# NeoConnect - Staff Feedback & Complaint Management Platform

NeoConnect is a transparency-focused platform designed to bridge the gap between staff feedback and organizational action.

## Project Structure

The project is divided into two main folders:
- `backend/`: Contains the Express server logic.
- `frontend/`: Contains the React application (Vite).

## Local Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
1. Clone the repository.
2. Install dependencies in the root directory:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory based on `.env.example` and fill in your credentials.

### Running the Application
To start the development server (both backend and frontend):
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

### Building for Production
To build the frontend for production:
```bash
npm run build
```
The server will serve the built files from `frontend/dist`.

## Technologies Used
- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui, Lucide React, Framer Motion, Recharts.
- **Backend**: Node.js, Express.
- **Database/Auth**: Firebase (Firestore & Firebase Auth).
- **AI**: Google Gemini API (for case summarization and analysis).

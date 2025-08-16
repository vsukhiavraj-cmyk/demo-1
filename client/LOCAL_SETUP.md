# 🚀 Local Setup Guide for Infinite Learning Platform

## Prerequisites

Make sure you have the following installed on your system:

- **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** (optional, for version control)

## 📁 Project Structure

After exporting, your project should have this structure:

```
infinite-learning-platform/
├── src/
├── server/
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🛠️ Installation Steps

### 1. Navigate to Project Directory

```bash
cd infinite-learning-platform
```

### 2. Install Dependencies

```bash
# Install all dependencies (frontend + backend)
npm install

# Or if you prefer yarn
yarn install
```

### 3. Environment Setup

The `.env` file should already be included with default values:

```env
PORT=5000
NODE_ENV=development
VITE_API_URL=http://localhost:5000/api
```

## 🚀 Running the Application

### Option 1: Run Both Frontend & Backend Together (Recommended)

```bash
# This runs both the React frontend and Express backend
npm run dev
```

### Option 2: Run Frontend and Backend Separately

**Terminal 1 - Backend Server:**

```bash
npm run server
```

**Terminal 2 - Frontend Client:**

```bash
npm run client
```

## 🌐 Access Your Application

After running the commands above, your application will be available at:

- **Frontend (React):** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Health Check:** http://localhost:5000/api/health

## 📱 Available Scripts

```bash
# Development (runs both frontend & backend)
npm run dev

# Frontend only
npm run client

# Backend only
npm run server

# Build for production
npm run build

# Start production server
npm start
```

## 🔧 Troubleshooting

### Port Already in Use

If you get a port error, you can:

1. Change the port in `.env` file
2. Kill the process using the port:

   ```bash
   # On Windows
   netstat -ano | findstr :5173
   taskkill /PID <PID_NUMBER> /F

   # On Mac/Linux
   lsof -ti:5173 | xargs kill -9
   ```

### Dependencies Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Issues

```bash
# Clear build cache
rm -rf dist
npm run build
```

## 🎯 Features Available Locally

✅ **Frontend Features:**

- Interactive landing page
- AI Chat interface
- Goal selection system
- Success stories carousel
- Responsive design
- Dashboard with charts and task management

✅ **Backend Features:**

- REST API endpoints
- Testimonials data
- Achievers information
- Goal creation
- Chat responses
- Health monitoring

## 🔄 Development Workflow

1. **Make Changes:** Edit files in `src/` for frontend or `server/` for backend
2. **Hot Reload:** Changes automatically refresh in browser
3. **Test API:** Use http://localhost:5000/api/health to test backend
4. **Build:** Run `npm run build` when ready for production

## 📦 Production Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

The production build will be created in the `dist/` folder and served by the Express server.

## 🆘 Need Help?

If you encounter any issues:

1. **Check Node.js version:** `node --version` (should be 16+)
2. **Check npm version:** `npm --version`
3. **Verify all files are present:** Ensure package.json exists
4. **Check console for errors:** Open browser dev tools (F12)
5. **Restart the development server:** Stop (Ctrl+C) and run `npm run dev` again

## 🎉 You're Ready!

Your Infinite Learning Platform should now be running locally with all features working:

- Beautiful responsive UI
- Interactive dashboard
- Task management system
- AI chat functionality
- Success stories
- Goal selection

Happy coding! 🚀

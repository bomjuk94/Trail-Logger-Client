# Trail Logger Client

A mobile hiking tracker built with React Native and Expo, designed to log hikes, track trails, and record progress.

## Tech Stack

- React Native + TypeScript  
- Expo (runtime & build tool)  
- Expo Router (navigation)  
- Expo Location API (GPS tracking)  
- AsyncStorage (local persistence)  

## Getting Started

### 1. Clone the repo

git clone https://github.com/bomjuk94/Trail-Logger-Client  

cd Trail-Logger-Client-main  

### 2. Install dependencies  

npm install  

### 3. Setup environment variables  

Create a .env file in the client/ directory:  

VITE_API_BASE_URL=http://localhost:5000  

### 4. Start the development server  

npm run start  

### 5. Build for production  

eas build --platform android  
eas build --platform ios  
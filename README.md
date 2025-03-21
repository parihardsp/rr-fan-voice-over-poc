# RR Voice Over App - Proof of Concept

This project is a Proof of Concept (PoC) web application that allows users to add their own voice-over commentary to Rajasthan Royals cricket match clips and share them on social media. The app mimics the design of the official Rajasthan Royals website.

## Features

- **Video Clip Selection**: Users can browse and select match highlight clips
- **Voice-Over Recording**: Users can record their own commentary over selected clips
- **Playback & Preview**: Users can preview their commentary before saving
- **Social Media Sharing**: Users can share their voice-over videos directly to social media platforms
- **Responsive Design**: The app works on both desktop and mobile devices

## Tech Stack

### Frontend

- HTML, CSS, JavaScript
- Bootstrap 5 for responsive UI
- React.js for interactive components

### Backend

- FastAPI (Python) - Handles video/audio processing & API integration
- FFmpeg - Used for merging audio and video files

## Project Structure

```
RR-VoiceOver-App/
│── backend/
│   ├── main.py  # FastAPI backend
│
│── frontend/
│   ├── index.html  # Main UI
│   ├── styles.css  # CSS for styling
│   ├── script.js  # JavaScript for handling UI interactions
│   ├── VoiceOverApp.jsx  # React component
│
│── content/
│   ├── clips/  # Store local match clips
│   ├── merged-audio-video/  # Store merged videos
│   ├── recordings/  # Stores user voice-over files
│
│── README.md  # Project documentation
│── requirements.txt  # Python dependencies
│── app.py  # Entry point for running the FastAPI app
```

## Setup and Installation

### Prerequisites

- Python 3.8+
- Node.js 14+ (if using React)
- FFmpeg installed on the server

### Backend Setup

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/RR-VoiceOver-App.git
   cd RR-VoiceOver-App
   ```

2. Create a virtual environment and install dependencies:

   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Add video clips to the content/clips directory (format: .mp4)

4. Start the backend server:
   ```
   python app.py
   ```
   The server will run on http://localhost:8000

### Frontend Setup

For the basic HTML/CSS/JS version:

1. Open the `frontend/index.html` file in a web browser

For the React version:

1. Install Node.js dependencies:

   ```
   cd frontend
   npm install
   ```

2. Start the development server:
   ```
   npm start
   ```

## Usage

1. Browse and select a cricket match clip
2. Click "Do Voice Over" on the clip you want to add commentary to
3. When the clip starts playing, record your commentary
4. Preview your recording and re-record if needed
5. Save your voice-over and share it on social media

## File Structure Details

### Backend Files

- `main.py`: Contains the FastAPI application with routes for handling clip listing, audio recording, and merging
- `app.py`: Entry point for the application

### Frontend Files

- `index.html`: Main HTML structure
- `styles.css`: Styling to match the Rajasthan Royals website
- `script.js`: JavaScript for handling user interactions and API calls
- `VoiceOverApp.jsx`: React component for an alternative, more interactive frontend

## Development Notes

- This is a Proof of Concept application designed to demonstrate the functionality
- For production use, additional security measures should be implemented
- The social media sharing functionality requires proper API integration with respective platforms
- Additional error handling and user feedback should be added for production use

## License

This project is created as a proof of concept and is not for commercial use without proper authorization from Rajasthan Royals.

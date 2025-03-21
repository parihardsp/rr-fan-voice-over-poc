from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import os
import uuid
import shutil
from pathlib import Path
import logging
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="RR Voice Over App")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories if they don't exist
for directory in ["content/clips", "content/recordings"]:
    os.makedirs(directory, exist_ok=True)

# Mount static files
app.mount("/content", StaticFiles(directory="content"), name="content")
# Mount static files and assets
app.mount("/content", StaticFiles(directory="content"), name="content")

@app.get("/")
def read_root():
    return {"message": "RR Voice Over App API"}

@app.get("/clips")
def get_clips():
    """Return a list of available clips"""
    clips_dir = Path("content/clips")
    clips = []
    
    if clips_dir.exists():
        for file in clips_dir.glob("*.mp4"):
            clips.append({
                "id": file.stem,
                "name": file.stem.replace("_", " ").title(),
                "path": f"/content/clips/{file.name}"
            })
    
    return {"clips": clips}

@app.post("/record-voice")
async def record_voice(clip_id: str = Form(...), audio_data: UploadFile = File(...)):
    """Save recorded voice over"""
    try:
        # Generate unique filename for the recording
        recording_id = f"{clip_id}_{uuid.uuid4()}"
        recording_path = f"content/recordings/{recording_id}.webm"
        
        # Save the uploaded audio file
        with open(recording_path, "wb") as buffer:
            shutil.copyfileobj(audio_data.file, buffer)
        
        logger.info(f"Saved recording to {recording_path}")
        
        # Since we're not merging, we return both paths for client-side handling
        return {
            "recording_id": recording_id,
            "audio_path": f"/content/recordings/{recording_id}.webm",
            "video_path": f"/content/clips/{clip_id}.mp4"
        }
    except Exception as e:
        logger.error(f"Error saving recording: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recordings/{recording_id}")
def get_recording(recording_id: str):
    """Return a recording file"""
    file_path = f"content/recordings/{recording_id}.webm"
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Recording not found")
    
    return FileResponse(file_path)

    """Generate a simple colored thumbnail based on clip_id"""
    try:
        # Check if the video exists
        video_path = f"content/clips/{clip_id}.mp4"
        if not os.path.exists(video_path):
            raise HTTPException(status_code=404, detail="Clip not found")
        
        # Generate a deterministic color from the clip_id
        hash_object = hashlib.md5(clip_id.encode())
        hash_hex = hash_object.hexdigest()
        color = f"#{hash_hex[:6]}"
        
        # Create an SVG with the clip name
        clip_name = clip_id.replace("_", " ").title()
        svg = f"""
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
            <rect width="400" height="225" fill="{color}" />
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" fill="white">{clip_name}</text>
            <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="18" fill="white">Click to add voice-over</text>
        </svg>
        """
        
        return HTMLResponse(content=svg, media_type="image/svg+xml")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating thumbnail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/proxy-recording/{recording_id}")
async def proxy_recording(recording_id: str):
    """Proxy to access recordings from frontend"""
    try:
        recording_path = f"content/recordings/{recording_id}.webm"
        if not os.path.exists(recording_path):
            raise HTTPException(status_code=404, detail=f"Recording not found: {recording_id}")
        
        # Return the file
        return FileResponse(recording_path, media_type="audio/webm")
    except Exception as e:
        logger.error(f"Error accessing recording: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/thumbnail/{clip_id}")
async def get_thumbnail(clip_id: str):
    """Return a custom thumbnail or generate one"""
    try:
        # First, try the root content directory
        custom_thumbnail_path = f"content/thumbnails/{clip_id}.jpg"
        logger.info(f"Looking for thumbnail at: {os.path.abspath(custom_thumbnail_path)}")
        
        if os.path.exists(custom_thumbnail_path):
            logger.info(f"Serving custom JPG thumbnail: {custom_thumbnail_path}")
            return FileResponse(custom_thumbnail_path)
        
        # Then try the backend content directory
        backend_thumbnail_path = f"backend/content/thumbnails/{clip_id}.jpg"
        logger.info(f"Looking for thumbnail at: {os.path.abspath(backend_thumbnail_path)}")
        
        if os.path.exists(backend_thumbnail_path):
            logger.info(f"Serving custom JPG thumbnail: {backend_thumbnail_path}")
            return FileResponse(backend_thumbnail_path)
        
        # Check for PNG versions
        png_thumbnail_path = f"content/thumbnails/{clip_id}.png"
        if os.path.exists(png_thumbnail_path):
            logger.info(f"Serving custom PNG thumbnail: {png_thumbnail_path}")
            return FileResponse(png_thumbnail_path)
        
        backend_png_path = f"backend/content/thumbnails/{clip_id}.png"
        if os.path.exists(backend_png_path):
            logger.info(f"Serving custom PNG thumbnail: {backend_png_path}")
            return FileResponse(backend_png_path)
        
        # If no custom thumbnail found, generate SVG
        video_path = f"content/clips/{clip_id}.mp4"
        if not os.path.exists(video_path):
            raise HTTPException(status_code=404, detail="Clip not found")
        
        # Generate a deterministic color from the clip_id
        hash_object = hashlib.md5(clip_id.encode())
        hash_hex = hash_object.hexdigest()
        color = f"#{hash_hex[:6]}"
        
        # Create an SVG with the clip name
        clip_name = clip_id.replace("_", " ").title()
        svg = f"""
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
            <rect width="400" height="225" fill="{color}" />
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" fill="white">{clip_name}</text>
            <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="18" fill="white">Click to add voice-over</text>
        </svg>
        """
        
        return HTMLResponse(content=svg, media_type="image/svg+xml")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating thumbnail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/list-thumbnails")
async def list_thumbnails():
    thumbnails_dir = "content/thumbnails"
    if not os.path.exists(thumbnails_dir):
        return {"error": "Directory does not exist", "checked_path": os.path.abspath(thumbnails_dir)}
    
    files = os.listdir(thumbnails_dir)
    return {
        "thumbnails_directory": os.path.abspath(thumbnails_dir),
        "files": files
    }


# Make sure you have these directories mounted
app.mount("/content", StaticFiles(directory="content"), name="content")
app.mount("/assets", StaticFiles(directory="content/assets"), name="assets")
# Add this to your imports
import mimetypes

# Add this to your app initialization
# Create directories if they don't exist
for directory in ["content/clips", "content/recordings", "content/processed-audio"]:
    os.makedirs(directory, exist_ok=True)

# Mount processed audio directory
app.mount("/content", StaticFiles(directory="content"), name="content")

# Add a new endpoint to check if a processed version exists
@app.get("/processed-audio/{clip_id}")
async def get_processed_audio(clip_id: str):
    """Return processed audio without commentary if available"""
    processed_path = f"content/processed-audio/{clip_id}.wav"
    
    if os.path.exists(processed_path):
        return FileResponse(processed_path, media_type="audio/wav")
    else:
        # Fall back to original audio
        logger.info(f"No processed audio found for {clip_id}, using original")
        raise HTTPException(status_code=404, detail="Processed audio not found")
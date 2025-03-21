from fastapi import APIRouter, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse, FileResponse
import shutil
import os
import uuid
import subprocess
from pathlib import Path

router = APIRouter()

@router.get("/api/clips")
async def list_clips():
    """Get a list of all available video clips"""
    clips_dir = Path("content/clips")
    clips = []
    
    for file in clips_dir.glob("*.mp4"):
        clips.append({
            "id": file.stem,
            "name": file.stem.replace("_", " ").title(),
            "url": f"/content/clips/{file.name}"
        })
    
    return {"clips": clips}

@router.post("/api/save-recording")
async def save_recording(clip_id: str = Form(...), audio_data: UploadFile = File(...)):
    """Save user's voice-over recording"""
    recording_id = f"{clip_id}_{uuid.uuid4()}"
    recording_path = f"content/recordings/{recording_id}.webm"
    
    # Save the audio file
    with open(recording_path, "wb") as buffer:
        shutil.copyfileobj(audio_data.file, buffer)
    
    return {"recording_id": recording_id, "recording_path": recording_path}

@router.post("/api/merge-audio-video")
async def merge_audio_video(clip_id: str = Form(...), recording_id: str = Form(...)):
    """Merge the original video with the voice-over audio"""
    # Paths for input files
    video_path = f"content/clips/{clip_id}.mp4"
    audio_path = f"content/recordings/{recording_id}.webm"
    output_path = f"content/merged/{recording_id}_merged.mp4"
    
    # Use FFmpeg to merge audio and video
    try:
        cmd = [
            'ffmpeg',
            '-i', video_path,
            '-i', audio_path,
            '-c:v', 'copy',
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-shortest',
            output_path
        ]
        
        subprocess.run(cmd, check=True)
        
        return {
            "success": True,
            "merged_video_id": recording_id,
            "merged_video_url": f"/content/merged/{recording_id}_merged.mp4"
        }
    except subprocess.CalledProcessError as e:
        return JSONResponse(
            status_code=500, 
            content={"success": False, "error": f"Failed to merge: {str(e)}"}
        )

@router.get("/api/merged-video/{merged_id}")
async def get_merged_video(merged_id: str):
    """Get information about a merged video"""
    video_path = f"content/merged/{merged_id}_merged.mp4"
    
    if os.path.exists(video_path):
        return {
            "success": True,
            "merged_video_id": merged_id,
            "merged_video_url": f"/content/merged/{merged_id}_merged.mp4"
        }
    else:
        return JSONResponse(
            status_code=404,
            content={"success": False, "error": "Merged video not found"}
        )
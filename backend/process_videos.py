import os
import subprocess
import torch
import tempfile
from demucs.pretrained import get_model
from demucs.audio import AudioFile
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_audio_from_video(video_path, audio_path):
    """Extract audio from video file using FFmpeg"""
    try:
        subprocess.run([
            "ffmpeg", "-i", video_path, 
            "-vn", "-acodec", "pcm_s16le", 
            "-ar", "44100", "-ac", "2", 
            audio_path
        ], check=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Error extracting audio: {e}")
        return False

def remove_commentary(audio_path, output_dir):
    """Remove commentary voice from audio using Demucs"""
    try:
        # Load Demucs model (htdemucs is optimized for voice/instrument separation)
        model = get_model("htdemucs")
        model.eval()
        
        if torch.cuda.is_available():
            model.cuda()
        
        # Process audio
        audio_file = AudioFile(audio_path)
        wav = audio_file.read(streams=0, samplerate=model.samplerate, channels=model.audio_channels)
        ref = wav.mean(0)
        wav = (wav - ref.mean()) / ref.std()
        
        # Apply source separation
        with torch.no_grad():
            if torch.cuda.is_available():
                sources = model(wav[None].cuda())[0].cpu()
            else:
                sources = model(wav[None])[0]
        
        # Extract sources (drums=0, bass=1, other=2, vocals=3)
        sources = sources * ref.std() + ref.mean()
        
        # Save non-vocal audio (drums + bass + other)
        os.makedirs(output_dir, exist_ok=True)
        non_vocal_path = os.path.join(output_dir, "no_commentary.wav")
        
        # Combine all stems except vocals (index 3)
        non_vocal = sum(sources[i] for i in range(3))  # Combine drums, bass, other
        
        # Save to file
        AudioFile(non_vocal_path).write(non_vocal, model.samplerate)
        
        logger.info(f"Successfully processed audio and saved to {non_vocal_path}")
        return non_vocal_path
    
    except Exception as e:
        logger.error(f"Error in Demucs processing: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None

def process_video(video_path, output_dir):
    """Process a video to remove commentary voice while keeping other sounds"""
    video_name = os.path.basename(video_path)
    video_id = os.path.splitext(video_name)[0]
    
    # Create temp directory
    temp_dir = tempfile.mkdtemp()
    audio_path = os.path.join(temp_dir, f"{video_id}.wav")
    
    # Extract audio
    logger.info(f"Extracting audio from {video_path}")
    if not extract_audio_from_video(video_path, audio_path):
        return False
    
    # Process with Demucs
    logger.info(f"Processing audio with Demucs")
    processed_audio = remove_commentary(audio_path, output_dir)
    
    if not processed_audio:
        return False
    
    # Clean up temp files
    os.remove(audio_path)
    os.rmdir(temp_dir)
    
    logger.info(f"Successfully processed {video_path}")
    return True

def process_all_videos(clips_dir, output_dir):
    """Process all video files in a directory"""
    if not os.path.exists(clips_dir):
        logger.error(f"Clips directory does not exist: {clips_dir}")
        return
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Get all video files
    video_files = [f for f in os.listdir(clips_dir) if f.endswith('.mp4')]
    
    for video_file in video_files:
        video_path = os.path.join(clips_dir, video_file)
        video_id = os.path.splitext(video_file)[0]
        
        # Process the video
        logger.info(f"Processing video: {video_file}")
        process_video(video_path, output_dir)
        
        logger.info(f"Finished processing {video_file}")

if __name__ == "__main__":
    # Set your directories here
    clips_dir = "content/clips"
    output_dir = "content/processed-audio"
    
    process_all_videos(clips_dir, output_dir)
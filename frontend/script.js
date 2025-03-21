// API Endpoint (adjust as needed for production)
const API_BASE_URL = 'http://localhost:8000';

// Global variables
let mediaRecorder;
let recordedChunks = [];
let audioBlob;
let selectedClip = null;
let recordingTimer;
let recordingSeconds = 0;
let isRecording = false;
let currentMergedVideoId = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check URL parameters for shared content
    const urlParams = new URLSearchParams(window.location.search);
    const clipId = urlParams.get('clip');
    const recordingId = urlParams.get('recording');
    
    if (clipId && recordingId) {
        // User arrived via a shared link, load the shared content
        loadSharedContent(clipId, recordingId);
    } else {
        // Normal initialization
        fetchClips();
    }
    
    // Set up other event listeners
    setupEventListeners();
});

// DOM Elements
const clipsContainer = document.getElementById('clips-container');
const clipPlayer = document.getElementById('clip-player');
const finalVideo = document.getElementById('final-video');
const startRecordingBtn = document.getElementById('start-recording');
const stopRecordingBtn = document.getElementById('stop-recording');
const previewRecordingBtn = document.getElementById('preview-recording');
const retryRecordingBtn = document.getElementById('retry-recording');
const saveRecordingBtn = document.getElementById('save-recording');
const voiceOverModal = new bootstrap.Modal(document.getElementById('voiceOverModal'));
const shareModal = new bootstrap.Modal(document.getElementById('shareModal'));
const shareLinkInput = document.getElementById('share-link');
const copyLinkBtn = document.getElementById('copy-link');

// Social media share buttons
const shareTwitterBtn = document.getElementById('share-twitter');
const shareFacebookBtn = document.getElementById('share-facebook');
const shareInstagramBtn = document.getElementById('share-instagram');
const shareWhatsappBtn = document.getElementById('share-whatsapp');

// // Initialize the app
// document.addEventListener('DOMContentLoaded', () => {
//     // Fetch and display clips
//     fetchClips();
    
//     // Set up event listeners
//     setupEventListeners();
// });

// Fetch clips from API
async function fetchClips() {
    try {
        const response = await fetch(`${API_BASE_URL}/clips`);
        const data = await response.json();
        
        if (data.clips && data.clips.length > 0) {
            // Remove skeleton loaders
            document.querySelectorAll('.clip-skeleton').forEach(skeleton => {
                skeleton.remove();
            });
            
            // Add clips to container
            data.clips.forEach(clip => {
                addClipToUI(clip);
            });
        } else {
            clipsContainer.innerHTML = '<div class="col-12 text-center"><p>No clips available. Please check back later.</p></div>';
        }
    } catch (error) {
        console.error('Error fetching clips:', error);
        clipsContainer.innerHTML = '<div class="col-12 text-center"><p>Error loading clips. Please refresh the page.</p></div>';
    }
}

// Add a clip to the UI
function addClipToUI(clip) {
  const clipCard = document.createElement('div');
  clipCard.className = 'col-md-6 col-lg-4 mb-4';
  clipCard.innerHTML = `
      <div class="card clip-card">
          <div class="clip-thumbnail">
              <img src="${API_BASE_URL}/thumbnail/${clip.id}" alt="${clip.name}">
              <div class="play-icon"><i class="fas fa-play-circle"></i></div>
          </div>
          <div class="card-body">
              <h5 class="card-title">${clip.name}</h5>
              <p class="card-text">Add your voice to this iconic RR moment!</p>
              <button class="btn btn-voice-over w-100" data-clip-id="${clip.id}" data-clip-path="${API_BASE_URL}${clip.path}">
                  <i class="fas fa-microphone me-2"></i>Do Voice Over
              </button>
          </div>
      </div>
  `;
  
  clipsContainer.appendChild(clipCard);
}

// Create a thumbnail from video path (using a placeholder for now)
function createThumbnailFromVideo(videoPath) {
    // In a real implementation, you might generate thumbnails server-side
    // For now, use a placeholder based on the path
    return `https://picsum.photos/seed/${videoPath.split('/').pop()}/400/225`;
}

// Set up event listeners
function setupEventListeners() {
    // Delegate event listener for voice over buttons
    clipsContainer.addEventListener('click', event => {
        const voiceOverBtn = event.target.closest('.btn-voice-over');
        if (voiceOverBtn) {
            selectedClip = {
                id: voiceOverBtn.dataset.clipId,
                path: voiceOverBtn.dataset.clipPath
            };
            prepareVoiceOverModal();
        }
    });
    
    // Recording controls
    startRecordingBtn.addEventListener('click', startRecording);
    stopRecordingBtn.addEventListener('click', stopRecording);
    previewRecordingBtn.addEventListener('click', previewRecording);
    retryRecordingBtn.addEventListener('click', resetRecording);
    saveRecordingBtn.addEventListener('click', saveRecording);
    
    // Share controls
    copyLinkBtn.addEventListener('click', copyShareLink);
    
    // Social media share buttons
    shareTwitterBtn.addEventListener('click', () => shareOnSocial('twitter'));
    shareFacebookBtn.addEventListener('click', () => shareOnSocial('facebook'));
    shareInstagramBtn.addEventListener('click', () => shareOnSocial('instagram'));
    shareWhatsappBtn.addEventListener('click', () => shareOnSocial('whatsapp'));
    
    // Reset recording when modal is hidden
    document.getElementById('voiceOverModal').addEventListener('hidden.bs.modal', () => {
        resetRecording();
        clipPlayer.pause();
    });
    
    // Reset share modal when closed
    document.getElementById('shareModal').addEventListener('hidden.bs.modal', () => {
        finalVideo.pause();
    });
}

// Prepare the voice over modal
function prepareVoiceOverModal() {
  // The clip.path should already include the API_BASE_URL from the addClipToUI function
  clipPlayer.src = selectedClip.path;
  clipPlayer.load();
  
  // Reset UI states
  document.getElementById('step-1').classList.remove('d-none');
  document.getElementById('step-1').classList.add('active-step');
  document.getElementById('step-2').classList.add('d-none');
  document.getElementById('step-3').classList.add('d-none');
  
  // Show modal
  voiceOverModal.show();
}
// Start recording
async function startRecording() {
  try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      mediaRecorder = new MediaRecorder(stream);
      recordedChunks = [];
      
      // Event handlers
      mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
              recordedChunks.push(e.data);
          }
      };
      
      mediaRecorder.onstop = () => {
          // Create audio blob
          audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
          
          // Show step 3 (preview controls)
          document.getElementById('step-2').classList.add('d-none');
          document.getElementById('step-3').classList.remove('d-none');
          
          // Stop stadium noise
          const stadiumNoise = document.getElementById('recording-stadium-noise');
          if (stadiumNoise) {
              stadiumNoise.pause();
          }
      };
      
      // Start recording
      mediaRecorder.start();
      isRecording = true;
      
      // Start video playback
      clipPlayer.currentTime = 0;
      
      // Important: Mute the original video audio
      clipPlayer.muted = true;
      
      // Play stadium noise
      let stadiumNoise = document.getElementById('recording-stadium-noise');
      if (!stadiumNoise) {
          stadiumNoise = document.createElement('audio');
          stadiumNoise.src = `${API_BASE_URL}/content/assets/stadium-noise.mp3`;
          stadiumNoise.id = 'recording-stadium-noise';
          stadiumNoise.loop = true;
          stadiumNoise.volume = 0.4; // 30% volume
          document.body.appendChild(stadiumNoise);
      }
      stadiumNoise.play();
      
      clipPlayer.play();
      
      // Start timer
      startTimer();
      
      // Update UI
      document.getElementById('step-1').classList.add('d-none');
      document.getElementById('step-2').classList.remove('d-none');
      
      // Set up auto-stop when video ends
      clipPlayer.onended = () => {
          if (isRecording) {
              stopRecording();
          }
      };
  } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please ensure you have a microphone connected and have granted permission.');
  }
}

// Stop recording
function stopRecording() {
  if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
      
      // Stop all tracks in the stream
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      // Stop timer
      stopTimer();
      
      // Pause video
      clipPlayer.pause();
      
      // Pause stadium noise
      const stadiumNoise = document.getElementById('recording-stadium-noise');
      if (stadiumNoise) {
          stadiumNoise.pause();
      }
  }
}

// Start timer for recording
function startTimer() {
    recordingSeconds = 0;
    updateTimerDisplay();
    
    recordingTimer = setInterval(() => {
        recordingSeconds++;
        updateTimerDisplay();
    }, 1000);
}

// Stop timer
function stopTimer() {
    clearInterval(recordingTimer);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(recordingSeconds / 60);
    const seconds = recordingSeconds % 60;
    
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.querySelector('.timer').textContent = formattedTime;
}

// Preview recording
function previewRecording() {
  // Create object URL from the audio blob
  const audioUrl = URL.createObjectURL(audioBlob);
  
  // Create an audio element for playback
  const audio = new Audio(audioUrl);
  
  // Make sure video is muted
  clipPlayer.muted = true;
  
  // Play stadium noise
  let stadiumNoise = document.getElementById('preview-stadium-noise');
  if (!stadiumNoise) {
      stadiumNoise = document.createElement('audio');
      stadiumNoise.src = `${API_BASE_URL}/content/assets/stadium-noise.mp3`;
      stadiumNoise.id = 'preview-stadium-noise';
      stadiumNoise.loop = true;
      stadiumNoise.volume = 0.4; // 30% volume
      document.body.appendChild(stadiumNoise);
  }
  stadiumNoise.play();
  
  // Start video and audio together
  clipPlayer.currentTime = 0;
  clipPlayer.play();
  audio.play();
  
  // Clean up when finished
  clipPlayer.onended = () => {
      audio.pause();
      stadiumNoise.pause();
  };
}

// Reset recording
function resetRecording() {
  // Reset variables
  mediaRecorder = null;
  recordedChunks = [];
  audioBlob = null;
  
  // Reset UI
  document.getElementById('step-3').classList.add('d-none');
  document.getElementById('step-1').classList.remove('d-none');
  
  // Reset timer
  recordingSeconds = 0;
  updateTimerDisplay();
  
  // Reset video player
  clipPlayer.pause();
  
  // Stop and remove stadium noise
  const stadiumNoise = document.getElementById('recording-stadium-noise');
  if (stadiumNoise) {
      stadiumNoise.pause();
      stadiumNoise.remove();
  }
}


// Save recording
async function saveRecording() {
  try {
      // Create form data
      const formData = new FormData();
      formData.append('clip_id', selectedClip.id);
      formData.append('audio_data', audioBlob, 'recording.webm');
      
      // Show loading state
      saveRecordingBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
      saveRecordingBtn.disabled = true;
      
      // Upload recording
      const response = await fetch(`${API_BASE_URL}/record-voice`, {
          method: 'POST',
          body: formData
      });
      
      const data = await response.json();
      
      if (data.recording_id) {
          // Store paths for client-side playback - use absolute URLs
          const videoPath = `${API_BASE_URL}${data.video_path}`;
          const audioPath = `${API_BASE_URL}${data.audio_path}`;
          
          // Hide voice over modal and show share modal
          voiceOverModal.hide();
          
          // Set up the final video player with synchronized audio
          setupSynchronizedPlayback(videoPath, audioPath);
          
          // Generate share link with proper parameters
          const shareUrl = generateShareUrl(selectedClip.id, data.recording_id);
          shareLinkInput.value = shareUrl;
          
          // Show share modal
          setTimeout(() => {
              shareModal.show();
          }, 500);
      } else {
          throw new Error('Failed to save recording');
      }
  } catch (error) {
      console.error('Error saving recording:', error);
      alert('Error saving your recording. Please try again.');
  } finally {
      // Reset button state
      saveRecordingBtn.innerHTML = '<i class="fas fa-save me-2"></i>Save';
      saveRecordingBtn.disabled = false;
  }
}

// Generate share URL
function generateShareUrl(mergedId) {
    // In production, this would be your actual domain
    return `${window.location.origin}/share/${mergedId}`;
}

// Copy share link
function copyShareLink() {
    shareLinkInput.select();
    document.execCommand('copy');
    
    // Show success message
    const originalText = copyLinkBtn.innerHTML;
    copyLinkBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
    
    setTimeout(() => {
        copyLinkBtn.innerHTML = originalText;
    }, 2000);
}

// Share on social media
// Share on social media
function shareOnSocial(platform) {
    const shareUrl = shareLinkInput.value;
    
    // Create a more concise share text with hashtags separated
    const shareText = 'Check out my voice-over commentary on this Rajasthan Royals moment!';
    const hashtags = 'RajasthanRoyals,HallaBol,RRVoiceOver';
    const callToAction = 'Try yours at ' + window.location.origin;
    
    let shareWindowUrl;
    
    switch (platform) {
        case 'twitter':
            // Twitter/X sharing with proper formatting
            // Use separate parameters for text, url, hashtags, and via
            shareWindowUrl = 'https://twitter.com/intent/tweet?' + 
                'text=' + encodeURIComponent(shareText) + 
                '&url=' + encodeURIComponent(shareUrl) +
                '&hashtags=' + encodeURIComponent(hashtags) +
                '&via=rajasthanroyals';  // Optional: add the official account
            break;
        case 'facebook':
            // Facebook sharing via Share Dialog
            shareWindowUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText + ' ' + callToAction)}`;
            break;
        case 'whatsapp':
            shareWindowUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + callToAction + ' ' + shareUrl)}`;
            break;
        case 'instagram':
            // Instagram doesn't have a direct share URL, so we just copy to clipboard
            alert('To share on Instagram, download the video and upload it to your Instagram account with the hashtags #RajasthanRoyals #HallaBol');
            navigator.clipboard.writeText(shareText + ' ' + callToAction + ' ' + shareUrl + ' #RajasthanRoyals #HallaBol #RRVoiceOver');
            return;
    }
    
    // Open share window
    window.open(shareWindowUrl, '_blank', 'width=800,height=800');
}

// Function to set up synchronized playback
function setupSynchronizedPlayback(videoPath, audioPath) {
  // Set the source for the final video
  finalVideo.src = videoPath;
  
  // Important: Mute the original video audio
  finalVideo.muted = true;
  
  finalVideo.load();
  
  // Create audio element for the recording
  const voiceOverAudio = document.createElement('audio');
  voiceOverAudio.src = audioPath;
  voiceOverAudio.id = 'final-audio';
  document.body.appendChild(voiceOverAudio);
  
  // Create stadium noise audio element
  const stadiumNoise = document.createElement('audio');
  stadiumNoise.src = `${API_BASE_URL}/content/assets/stadium-noise.mp3`;
  stadiumNoise.id = 'stadium-noise';
  stadiumNoise.loop = true; // Make it loop continuously
  stadiumNoise.volume = 0.4; // Set to 30% volume so it doesn't overpower the commentary
  document.body.appendChild(stadiumNoise);
  
  // Synchronize video and audio playback
  finalVideo.onplay = () => {
      voiceOverAudio.currentTime = finalVideo.currentTime;
      voiceOverAudio.play();
      stadiumNoise.play(); // Play stadium noise
  };
  
  finalVideo.onpause = () => {
      voiceOverAudio.pause();
      stadiumNoise.pause(); // Pause stadium noise
  };
  
  finalVideo.onseeked = () => {
      voiceOverAudio.currentTime = finalVideo.currentTime;
  };
  
  // Clean up when modal is closed
  document.getElementById('shareModal').addEventListener('hidden.bs.modal', () => {
      finalVideo.pause();
      voiceOverAudio.pause();
      stadiumNoise.pause();
      
      if (document.getElementById('final-audio')) {
          document.getElementById('final-audio').remove();
      }
      if (document.getElementById('stadium-noise')) {
          document.getElementById('stadium-noise').remove();
      }
  });
}

// Generate share URL
function generateShareUrl(clipId, recordingId) {
  // In production, this would be your actual domain with parameters to load this combo
  return `${window.location.origin}?clip=${clipId}&recording=${recordingId}`;
}

// Function to load shared content
async function loadSharedContent(clipId, recordingId) {
  try {
      // Fetch clip info
      const response = await fetch(`${API_BASE_URL}/clips`);
      const data = await response.json();
      
      const clip = data.clips.find(c => c.id === clipId);
      if (!clip) {
          throw new Error('Clip not found');
      }
      
      // Set up playback with the video and recording - use absolute URLs
      const videoPath = `${API_BASE_URL}${clip.path}`;
      const audioPath = `${API_BASE_URL}/content/recordings/${recordingId}.webm`;
      
      // Store for sharing
      selectedClip = clip;
      
      // Set up the share modal with synchronized playback
      setupSynchronizedPlayback(videoPath, audioPath);
      
      // Generate share link
      const shareUrl = generateShareUrl(clipId, recordingId);
      shareLinkInput.value = shareUrl;
      
      // Show the share modal automatically
      shareModal.show();
  } catch (error) {
      console.error('Error loading shared content:', error);
      // Just load the normal app if there's an error
      fetchClips();
  }
}



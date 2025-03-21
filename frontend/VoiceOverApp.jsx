import React, { useState, useEffect, useRef } from 'react';

// API Endpoint (adjust for production)
const API_BASE_URL = 'http://localhost:8000';

const VoiceOverApp = () => {
  // State variables
  const [clips, setClips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [mergedVideoUrl, setMergedVideoUrl] = useState('');
  const [showVoiceOverModal, setShowVoiceOverModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [shareLink, setShareLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const finalVideoRef = useRef(null);

  // Fetch clips on component mount
  useEffect(() => {
    fetchClips();
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Fetch clips from API
  const fetchClips = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/clips`);
      const data = await response.json();
      
      if (data.clips && Array.isArray(data.clips)) {
        setClips(data.clips);
      }
    } catch (error) {
      console.error('Error fetching clips:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format time for display (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Handle clip selection
  const handleSelectClip = (clip) => {
    setSelectedClip(clip);
    setShowVoiceOverModal(true);
    setCurrentStep(1);
    setRecordingTime(0);
    setRecordedAudio(null);
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Reset recorded chunks
      recordedChunksRef.current = [];
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      // Event handlers
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudio({ blob: audioBlob, url: audioUrl });
        setCurrentStep(3);
      };
      
      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start video playback
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Move to step 2
      setCurrentStep(2);
      
      // Setup auto-stop when video ends
      if (videoRef.current) {
        videoRef.current.onended = () => {
          if (isRecording) {
            stopRecording();
          }
        };
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please ensure you have a microphone connected and have granted permission.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks in the stream
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Pause video
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  };

  // Preview recording
  const previewRecording = () => {
    if (videoRef.current && audioRef.current) {
      videoRef.current.currentTime = 0;
      audioRef.current.currentTime = 0;
      
      videoRef.current.play();
      audioRef.current.play();
    }
  };

  // Reset recording
  const resetRecording = () => {
    setCurrentStep(1);
    setRecordingTime(0);
    setRecordedAudio(null);
  };

  // Save recording
  const saveRecording = async () => {
    if (!recordedAudio || !selectedClip) return;
    
    try {
      setIsSaving(true);
      
      // Create form data
      const formData = new FormData();
      formData.append('clip_id', selectedClip.id);
      formData.append('audio_data', recordedAudio.blob, 'recording.webm');
      
      // Upload recording
      const recordResponse = await fetch(`${API_BASE_URL}/record-voice`, {
        method: 'POST',
        body: formData
      });
      
      const recordData = await recordResponse.json();
      
      if (recordData.recording_id) {
        // Merge audio and video
        const mergeFormData = new FormData();
        mergeFormData.append('clip_id', selectedClip.id);
        mergeFormData.append('recording_id', recordData.recording_id);
        
        const mergeResponse = await fetch(`${API_BASE_URL}/merge-audio-video`, {
          method: 'POST',
          body: mergeFormData
        });
        
        const mergeData = await mergeResponse.json();
        
        if (mergeData.merged_id) {
          // Set merged video URL
          setMergedVideoUrl(mergeData.path);
          
          // Generate share link
          const shareUrl = `${window.location.origin}/share/${mergeData.merged_id}`;
          setShareLink(shareUrl);
          
          // Show share modal
          setShowVoiceOverModal(false);
          setShowShareModal(true);
        } else {
          throw new Error('Failed to merge audio and video');
        }
      } else {
        throw new Error('Failed to save recording');
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Error saving your recording. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy share link
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Share on social media
  const shareOnSocial = (platform) => {
    if (!shareLink) return;
    
    const shareText = 'Check out my voice-over commentary on this Rajasthan Royals moment! #RoyalsFamily';
    let shareUrl;
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareLink)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareLink)}`;
        break;
      case 'instagram':
        alert('To share on Instagram, download the video and upload it to your Instagram account.');
        return;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  // Create a thumbnail from video path
  const createThumbnail = (path) => {
    // In a real app, you'd generate thumbnails server-side
    // For now, use placeholders
    return `https://picsum.photos/seed/${path.split('/').pop()}/400/225`;
  };

  // Close modals and reset state
  const closeVoiceOverModal = () => {
    setShowVoiceOverModal(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    resetRecording();
  };
  
  const closeShareModal = () => {
    setShowShareModal(false);
    if (finalVideoRef.current) {
      finalVideoRef.current.pause();
    }
  };

  return (
    <div className="voiceover-app">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <h1>CREATE YOUR OWN COMMENTARY</h1>
              <p>Add your voice to iconic Rajasthan Royals moments and share with friends!</p>
              <a href="#clips-section" className="btn btn-primary">TRY NOW</a>
            </div>
            <div className="col-lg-6">
              <img src="https://www.rajasthanroyals.com/static-assets/images/home/rr-royal-reimagine.png" 
                   alt="RR Heroes" className="img-fluid" />
            </div>
          </div>
        </div>
      </section>

      {/* Clips Section */}
      <section id="clips-section" className="py-5">
        <div className="container">
          <div className="section-header text-center mb-5">
            <h2>SELECT A CLIP</h2>
            <p>Choose an iconic moment and add your voice!</p>
          </div>
          
          <div className="row g-4">
            {loading ? (
              // Loading skeletons
              Array(3).fill().map((_, i) => (
                <div key={`skeleton-${i}`} className="col-md-6 col-lg-4">
                  <div className="card h-100">
                    <div className="card-img-top skeleton-loader"></div>
                    <div className="card-body">
                      <h5 className="card-title skeleton-loader"></h5>
                      <p className="card-text skeleton-loader"></p>
                    </div>
                  </div>
                </div>
              ))
            ) : clips.length === 0 ? (
              <div className="col-12 text-center">
                <p>No clips available. Please check back later.</p>
              </div>
            ) : (
              // Clip cards
              clips.map(clip => (
                <div key={clip.id} className="col-md-6 col-lg-4 mb-4">
                  <div className="card clip-card">
                    <div className="clip-thumbnail">
                      <img src={createThumbnail(clip.path)} alt={clip.name} />
                      <div className="play-icon"><i className="fas fa-play-circle"></i></div>
                    </div>
                    <div className="card-body">
                      <h5 className="card-title">{clip.name}</h5>
                      <p className="card-text">Add your voice to this iconic RR moment!</p>
                      <button 
                        className="btn btn-voice-over w-100"
                        onClick={() => handleSelectClip(clip)}
                      >
                        <i className="fas fa-microphone me-2"></i>Do Voice Over
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Voice Over Modal */}
      {showVoiceOverModal && (
        <div className="modal-backdrop show"></div>
      )}
      <div className={`modal fade ${showVoiceOverModal ? 'show d-block' : ''}`} tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add Your Voice Over</h5>
              <button type="button" className="btn-close" onClick={closeVoiceOverModal}></button>
            </div>
            <div className="modal-body">
              <div className="recording-container mb-4">
                <video 
                  ref={videoRef}
                  className="w-100" 
                  controls 
                  src={selectedClip?.path}
                ></video>
                
                {recordedAudio && (
                  <audio 
                    ref={audioRef} 
                    src={recordedAudio.url} 
                    style={{ display: 'none' }}
                  ></audio>
                )}
                
                <div className="mt-3 text-center">
                  <div className="recording-steps">
                    {/* Step 1: Start Recording */}
                    {currentStep === 1 && (
                      <div>
                        <button 
                          className="btn btn-primary"
                          onClick={startRecording}
                        >
                          <i className="fas fa-microphone me-2"></i>Start Recording
                        </button>
                        <p className="text-muted mt-2">Press to start recording your commentary</p>
                      </div>
                    )}
                    
                    {/* Step 2: Recording in Progress */}
                    {currentStep === 2 && (
                      <div>
                        <div className="recording-status">
                          <div className="recording-indicator">
                            <div className="recording-pulse"></div>
                            <span>Recording...</span>
                          </div>
                          <div className="timer">{formatTime(recordingTime)}</div>
                        </div>
                        <button 
                          className="btn btn-danger mt-2"
                          onClick={stopRecording}
                        >
                          <i className="fas fa-stop-circle me-2"></i>Stop Recording
                        </button>
                      </div>
                    )}
                    
                    {/* Step 3: Preview Recording */}
                    {currentStep === 3 && (
                      <div>
                        <div className="preview-controls">
                          <button 
                            className="btn btn-secondary"
                            onClick={previewRecording}
                          >
                            <i className="fas fa-play me-2"></i>Preview
                          </button>
                          <button 
                            className="btn btn-outline-primary ms-2"
                            onClick={resetRecording}
                          >
                            <i className="fas fa-redo me-2"></i>Try Again
                          </button>
                          <button 
                            className="btn btn-success ms-2"
                            onClick={saveRecording}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <i className="fas fa-spinner fa-spin me-2"></i>Saving...
                              </>
                            ) : (
                              <>
                                <i className="fas fa-save me-2"></i>Save
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-backdrop show"></div>
      )}
      <div className={`modal fade ${showShareModal ? 'show d-block' : ''}`} tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Share Your Commentary</h5>
              <button type="button" className="btn-close" onClick={closeShareModal}></button>
            </div>
            <div className="modal-body">
              <div className="text-center mb-4">
                <h4>Your commentary is ready!</h4>
                <p>Preview your masterpiece and share it with the world.</p>
              </div>
              
              <div className="final-video-container mb-4">
                <video 
                  ref={finalVideoRef}
                  className="w-100" 
                  controls 
                  autoPlay
                  src={mergedVideoUrl}
                ></video>
              </div>
              
              <div className="share-options">
                <h5>Share on social media:</h5>
                <div className="social-buttons mt-3">
                  <button 
                    className="btn btn-twitter"
                    onClick={() => shareOnSocial('twitter')}
                  >
                    <i className="fab fa-twitter"></i> Twitter
                  </button>
                  <button 
                    className="btn btn-facebook"
                    onClick={() => shareOnSocial('facebook')}
                  >
                    <i className="fab fa-facebook-f"></i> Facebook
                  </button>
                  <button 
                    className="btn btn-instagram"
                    onClick={() => shareOnSocial('instagram')}
                  >
                    <i className="fab fa-instagram"></i> Instagram
                  </button>
                  <button 
                    className="btn btn-whatsapp"
                    onClick={() => shareOnSocial('whatsapp')}
                  >
                    <i className="fab fa-whatsapp"></i> WhatsApp
                  </button>
                </div>
                
                <div className="mt-4">
                  <div className="input-group">
                    <input 
                      type="text" 
                      className="form-control" 
                      value={shareLink} 
                      readOnly
                    />
                    <button 
                      className="btn btn-outline-primary" 
                      onClick={copyToClipboard}
                    >
                      <i className={`fas ${copySuccess ? 'fa-check' : 'fa-copy'}`}></i> 
                      {copySuccess ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="form-text">Or copy this link to share directly</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setShowShareModal(false);
                  resetRecording();
                }}
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceOverApp;
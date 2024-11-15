import React, { useState, useRef, useEffect } from "react";
import ReactPlayer from "react-player";
import screenfull from "screenfull";
import "./App.scss";
import { format } from "date-fns";
import StarEffect from "./components/StarEffect";

const App = () => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [boostVolume, setBoostVolume] = useState(1);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [fullScreen, setFullScreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [folderFiles, setFolderFiles] = useState([]);
  const [controlVisible, setControlVisible] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [hamburgerVisible, setHamburgerVisible] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showFolderPopup, setShowFolderPopup] = useState(false);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSlider, setShowSlider] = useState(false);
  const [isAudioFile, setIsAudioFile] = useState(false);
  const [audioPoster, setAudioPoster] = useState(null);

  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const controlTimeout = useRef(null);
  const hamburgerTimeout = useRef(null);

  const extractAudioPoster = (file) => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);

      audio.addEventListener("loadedmetadata", () => {
        if ("mediaSession" in navigator && navigator.mediaSession.metadata) {
          const artwork = navigator.mediaSession.metadata.artwork;
          if (artwork && artwork.length > 0) {
            resolve(artwork[0].src);
          } else {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });

      // Handle case where no metadata is available
      audio.addEventListener("error", () => {
        resolve(null);
      });
    });
  };

  useEffect(() => {
    // Initialize Web Audio API
    audioContextRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.gain.value = 1; // Default to 1x volume

    // Auto-hide controls after 5 seconds of inactivity
    const resetControlTimeout = () => {
      clearTimeout(controlTimeout.current);
      setControlVisible(true);
      controlTimeout.current = setTimeout(() => {
        setControlVisible(false);
        setShowSidebar(false);
      }, 5000);
    };
    document.addEventListener("mousemove", resetControlTimeout);
    document.addEventListener("keydown", resetControlTimeout);

    // Hide hamburger after 5 seconds of inactivity
    const resetHamburgerTimeout = () => {
      clearTimeout(hamburgerTimeout.current);
      setHamburgerVisible(true);
      hamburgerTimeout.current = setTimeout(() => setHamburgerVisible(false), 5000);
    };

    document.addEventListener("mousemove", resetHamburgerTimeout);
    document.addEventListener("keydown", resetHamburgerTimeout);

    return () => {
      document.removeEventListener("mousemove", resetControlTimeout);
      document.removeEventListener("keydown", resetControlTimeout);
      document.removeEventListener("mousemove", resetHamburgerTimeout);
      document.removeEventListener("keydown", resetHamburgerTimeout);
    };
  }, []);

  // Mute toggle
  const handleMute = () => {
    setMuted(!muted);
  };
  useEffect(() => {
    if (muted == true) {
      setVolume(0);
    }
  }, [muted]);

  const increaseVolume = () => {
    setVolume((prevVolume) => Math.min(prevVolume + 0.1, 1));
  };

  const decreaseVolume = () => {
    setVolume((prevVolume) => Math.max(prevVolume - 0.1, 0));
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.code) {
        case "Space": // Spacebar for Play/Pause
          handlePlayPause();
          event.preventDefault(); // Prevent default behavior (like page scrolling)
          break;
        case "KeyM":
          handleMute();
          break;
        case "ArrowRight": // Right arrow for forward 10 seconds
          handleSeekwithbtn(10);
          break;
        case "ArrowLeft": // Left arrow for backward 10 seconds
          handleSeekwithbtn(-10);
          break;
        case "ArrowUp": // Up arrow to increase volume
          increaseVolume();
          break;
        case "ArrowDown": // Down arrow to decrease volume
          decreaseVolume();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [playing, volume, progress]);

  // const connectAudioNode = () => {
  //   if (playerRef.current && playerRef.current.getInternalPlayer()) {
  //     const audioSource = audioContextRef.current.createMediaElementSource(
  //       playerRef.current.getInternalPlayer()
  //     );
  //     audioSource
  //       .connect(gainNodeRef.current)
  //       .connect(audioContextRef.current.destination);
  //   }
  // };

  const handlePlayPause = () => {
    setPlaying(!playing);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    gainNodeRef.current.gain.value = newVolume * boostVolume;
  };

  const handleBoostVolume = () => {
    const newBoost = boostVolume >= 2 ? 1 : boostVolume + 0.5;
    setBoostVolume(newBoost);
    gainNodeRef.current.gain.value = volume * newBoost;
  };

  const handleAspectRatio = (ratio) => {
    setAspectRatio(ratio);
  };

  const handleFullScreen = () => {
    if (screenfull.isEnabled) {
      screenfull.toggle(containerRef.current);
    }
    setFullScreen(!fullScreen);
  };

  const handleFileChange = async (e) => {
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl); // Revoke the old URL
    }
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      const isAudio =
        file.type.includes("audio") || file.name.toLowerCase().endsWith(".mp3");

      setIsAudioFile(isAudio);
      setPlaying(true); // Start playing immediately after loading the file
      // Close the file popup

      if (isAudio) {
        const poster = await extractAudioPoster(file);
        setAudioPoster(poster);
      } else {
        setAudioPoster(null);
      }
      extractSubtitles(file);
    }
  };

  const handleFolderChange = async (e) => {
    const files = Array.from(e.target.files);
    const videoFiles = files;
    setFolderFiles(videoFiles);
    setSelectedFolderPath(e.target.files[0].webkitRelativePath.split("/")[0]);
    setShowFolderPopup(true); // Show the folder popup
  };
  const handleDuration = (duration) => {
    setDuration(duration);
  };

  const handleFileSelect = async (file) => {
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setPlaying(true);
    const isAudio =
      file.type.includes("audio") || file.name.toLowerCase().endsWith(".mp3");

    setIsAudioFile(isAudio);
    if (isAudio) {
      const poster = await extractAudioPoster(file);
      setAudioPoster(poster);
    } else {
      setAudioPoster(null);
    }
    setShowFolderPopup(false); // Close the folder popup on selection
  };
  const handleProgressChange = (played) => {
    setProgress(played.played * 100);
    setCurrentTime(playerRef.current.getCurrentTime());
  };
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSeekwithbtn = (amount) => {
    const currentTime = playerRef.current.getCurrentTime();
    playerRef.current.seekTo(currentTime + amount, "seconds");
  };

  const handleSeek = (e) => {
    const seekTo = (e.target.value / 100) * playerRef.current.getDuration();
    playerRef.current.seekTo(seekTo, "seconds");
    setProgress(e.target.value);
  };

  const handlePlaybackRate = (rate) => {
    setPlaybackRate(rate);
    if (playerRef.current) {
      playerRef.current.getInternalPlayer().playbackRate = rate;
    }
  };

  const extractSubtitles = (file) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const tracks = [];
      for (let i = 0; i < video.textTracks.length; i++) {
        tracks.push({
          label: video.textTracks[i].label || `Subtitle ${i + 1}`,
          index: i,
        });
      }
      // setSubtitleTracks(tracks);
      // setSelectedSubtitle(tracks[0].index); // Default to the first subtitle
      // if (tracks.length > 0) {
      //   video.textTracks[0].mode = 'showing'; // Show first subtitle
      // }
    };
  };

  const handleSubtitleChange = (e) => {
    const selectedTrackIndex = parseInt(e.target.value, 10);
    // setSelectedSubtitle(selectedTrackIndex);

    // Show selected subtitle and hide others
    const video = playerRef.current.getInternalPlayer();
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode =
        i === selectedTrackIndex ? "showing" : "disabled";
    }
  };

  return (
    <div>
      <StarEffect />
      <div
        ref={containerRef}
        className="video-player-container"
        onMouseMove={() => setControlVisible(true)}
      >
        {/* Hamburger Menu */}
        {hamburgerVisible && (
          <div
            className="hamburger-menu"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            ☰
          </div>
        )}

        {showSidebar && (
          <div className="sidebar">
            <button
              className="btn"
              onClick={() => document.getElementById("singleFileInput").click()}
            >
              Open File
            </button>
            <button
              className="btn"
              onClick={() => document.getElementById("folderInput").click()}
            >
              Open Folder
            </button>
            <button className="btn" onClick={() => setShowSettingsPopup(true)}>
              Settings
            </button>
            {selectedFolderPath && (
              <p style={{ color: "white" }}>
                Selected Folder:{" "}
                <span
                  className="redpill btn"
                  onClick={() => {
                    setShowFolderPopup(true);
                  }}
                >
                  {selectedFolderPath}
                </span>
              </p>
            )}
          </div>
        )}

        {/* File Picker */}
        <input
          id="singleFileInput"
          style={{ display: "none" }}
          type="file"
          accept="video/*,mp3/*,audio/*"
          onChange={handleFileChange}
        />

        {/* Folder Picker */}
        <input
          type="file"
          id="folderInput"
          directory=""
          webkitdirectory=""
          style={{ display: "none" }}
          onChange={handleFolderChange}
        />
        {showFolderPopup && (
          <div className="folder-popup">
            <div
              onClick={() => {
                setShowFolderPopup(false);
              }}
            >
              X
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Date Modified</th>
                </tr>
              </thead>
              <tbody>
                {folderFiles
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((file, index) => (
                    <tr
                      key={index}
                      onDoubleClick={() => handleFileSelect(file)}
                    >
                      <td>{file.name}</td>
                      <td>{file.type}</td>
                      <td>{(file.size / (1024 * 1024)).toFixed(2)} MB</td>
                      <td>
                        {format(new Date(file.lastModified), "dd/MM/yyyy")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
        {showSettingsPopup && (
          <div className="settings-popup">
            <p onClick={() => setShowSettingsPopup(false)}>X</p>
            <h3>Settings</h3>
            <label>Theme Color:</label>
          </div>
        )}
        {fileUrl && (
          <div
            className="player-wrapper"
            style={{ position: "relative", width: "100%", height: "100%" }}
          >
            <ReactPlayer
              id="vifs"
              ref={playerRef}
              url={fileUrl}
              playing={playing}
              controls={false}
              volume={muted ? 0 : volume}
              onProgress={handleProgressChange}
              onDuration={handleDuration}
              height={
                aspectRatio === "16:9"
                  ? "75%"
                  : aspectRatio === "4:3"
                    ? "100%"
                    : "100%"
              }
              playbackRate={playbackRate}
              width="100%"
              style={{ position: "absolute", top: 0, left: 0 }}
            />
            {isAudioFile && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  background: "rgba(0, 0, 0, 0.8)",
                }}
              >
                <div
                  className="audio-poster-container"
                  style={{ position: "relative", display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  <img
                    src={
                      audioPoster ||
                      "https://st5.depositphotos.com/68501920/65006/i/450/depositphotos_650066540-stock-photo-minimal-music-note-melody-icon.jpg"
                    }
                    alt="Music Visualization"
                    style={{
                      maxWidth: "50%",
                      maxHeight: "50%",
                      objectFit: "contain",
                      borderRadius: "10px",
                      animation: "pulse 2s infinite",
                    }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://st5.depositphotos.com/68501920/65006/i/450/depositphotos_650066540-stock-photo-minimal-music-note-melody-icon.jpg";
                    }}
                  />
                  {playing && (
                    <div
                      className="audio-waves"
                      style={{
                        position: "absolute",
                        bottom: "50%",
                        scale: 2,
                        left: "50%",
                        transform: "translateX(-30%)",
                      }}
                    >
                      <div className="wave"></div>
                      <div className="wave"></div>
                      <div className="wave"></div>
                      <div className="wave"></div>
                      <div className="wave"></div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {controlVisible && (
          <div className="controls">
            <div className="pillname cardw">
              <p className="chin">{formatTime(currentTime)}</p>
              <input
                className="range chin"
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleSeek}
              />
              <p className="chin">{formatTime(duration)}</p>
            </div>
            <div className="pillname">
              <button className="btn" onClick={handlePlayPause}>
                {playing ? "⏸" : "⏵"}
              </button>
              <button className="btn" onClick={() => handleAspectRatio("16:9")}>
                16:9
              </button>
              <button className="btn" onClick={() => handleAspectRatio("4:3")}>
                4:3
              </button>

              <button className="btn" onClick={handleBoostVolume}>
                Boost Volume ({boostVolume}x)
              </button>
              <button className="btn" onClick={handleFullScreen}>
                {fullScreen ? "⛶" : "⇱"}
              </button>
              <button className="btn" onClick={() => handlePlaybackRate(1)}>
                1x
              </button>
              <button className="btn" onClick={() => handlePlaybackRate(1.5)}>
                1.5x
              </button>
              <button className="btn" onClick={() => handlePlaybackRate(2)}>
                2x
              </button>
              <div
                className="volume-container"
                onMouseEnter={() => setShowSlider(true)}
                onMouseLeave={() => setShowSlider(false)}
              >
                <button className="btn speaker-icon" onClick={handleMute}>
                  {muted ? "🔇" : "🔊"}
                </button>
                {showSlider && (
                  <div className="volume-slider">
                    <span style={{ fontWeight: "bold" }}>
                      {(volume * 100).toFixed(0)}
                    </span>
                    <input
                      className="extrarange"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

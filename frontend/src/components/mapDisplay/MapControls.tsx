interface MapControlsProps {
  showStops: boolean;
  onToggleStops: () => void;
  onToggleFullscreen: () => void;
  fullscreenIcon: string;
  stopIcon: string;
}

const MapControls = ({
  showStops,
  onToggleStops,
  onToggleFullscreen,
  fullscreenIcon,
  stopIcon,
}: MapControlsProps) => {
  return (
    <div className="map-controls">
      <button
        type="button"
        className="map-control-button"
        onClick={onToggleFullscreen}
      >
        <img src={fullscreenIcon} />
      </button>
      <button
        type="button"
        className="map-control-button"
        aria-pressed={showStops}
        onClick={onToggleStops}
      >
        <img src={stopIcon} />
      </button>
    </div>
  );
};

export default MapControls;

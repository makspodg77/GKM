import React from 'react';

interface BusPopupProps {
  line_name: string;
  direction: string;
  previous_stop: string;
  next_stop: string;
  iconUrl: string;
}

const BusPopup: React.FC<BusPopupProps> = ({
  line_name,
  direction,
  previous_stop,
  next_stop,
  iconUrl,
}) => (
  <div className="stop-popup">
    <div className="bus-popup-name">
      <img
        className="bus-icon"
        src={iconUrl}
        alt="icon"
        style={{ width: '24px', height: '24px', verticalAlign: 'middle' }}
      />
      {line_name} <div className="arrow">&gt;</div> {direction}
    </div>
    <div className="stop-popup-number">
      <div className="stops">
        <div>
          <div className="prevstop"></div>
          {previous_stop}
        </div>
        <div>
          <div className="nextstop"></div>
          {next_stop}
        </div>
        <span>Operator: PKS Kamień Pomorski</span>
      </div>
    </div>
  </div>
);

export default BusPopup;

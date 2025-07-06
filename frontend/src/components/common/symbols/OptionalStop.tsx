import './OptionalStop.css';

interface OptionalStopProps {
  type?: 'stop' | 'first' | 'last';
  height?: number;
}

const OptionalStop = ({ type = 'stop', height = 30 }: OptionalStopProps) => {
  return (
    <div className="OptionalStop">
      <div className="rod" style={{ height: `${height}px` }}>
        <div
          className="dot"
          style={
            type === 'stop'
              ? { top: '50%', transform: 'translate(-50%, -50%)' }
              : type === 'first'
                ? { top: '0px', transform: 'translateX(-50%)' }
                : { top: '100%', transform: 'translate(-50%, -100%)' }
          }
        ></div>
      </div>
    </div>
  );
};

export default OptionalStop;

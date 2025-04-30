import './PageTitle.css';

interface PageTitleProps {
  title: string;
  color?: string;
  type?: string;
}

const PageTitle = ({ title, color, type }: PageTitleProps): JSX.Element => {
  return (
    <div className="PageTitle">
      <h1 style={{ marginBottom: type ? '0' : '1.5rem' }}>{title}</h1>
      <div className="lineType" style={{ marginBottom: type ? '1.5rem' : '0' }}>
        <div className="typeColor" style={{ backgroundColor: color }}></div>
        {type}
      </div>
    </div>
  );
};

export default PageTitle;

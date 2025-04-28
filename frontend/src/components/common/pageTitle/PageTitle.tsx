import './PageTitle.css';

interface PageTitleProps {
  title: string;
  color?: string;
  type?: string;
}

const PageTitle = ({ title, color, type }: PageTitleProps): JSX.Element => {
  return (
    <div className="PageTitle">
      <h1>{title}</h1>
      <div className="lineType">
        <div className="typeColor" style={{ backgroundColor: color }}></div>
        {type}
      </div>
    </div>
  );
};

export default PageTitle;

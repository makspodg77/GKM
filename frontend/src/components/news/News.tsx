import './News.css';
import service, { NewsInterface } from '../../services/db';
import { useEffect, useState } from 'react';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';

const News = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [news, setNews] = useState<NewsInterface[]>([]);
  useEffect(() => {
    setLoading(true);
    service.getNews().then((data) => {
      setNews(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }
  return (
    <div className="News">
      {news.map((_news: NewsInterface) => (
        <div>
          <h2>{_news.title}</h2>
          <span>
            Dodano:{' '}
            {_news.created_at.toISOString().slice(0, 19).replace('T', ' ')}
          </span>
          <div dangerouslySetInnerHTML={{ __html: _news.content }} />
        </div>
      ))}
    </div>
  );
};

export default News;

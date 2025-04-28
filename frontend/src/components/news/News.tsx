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
      console.log(data);
      setNews(data);
      setLoading(false);
    });
  }, []);

  // Function to format dates safely
  const formatDate = (dateString: string) => {
    try {
      // First check if it's already in the correct format
      if (typeof dateString === 'string') {
        // Try to parse as ISO date
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('pl-PL', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      }

      // Fallback - just return the string as is
      return dateString;
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="News">
      <h1>Aktualności</h1>
      {news?.map((_news: NewsInterface, index) => (
        <div key={_news.id || index} className="news-item">
          <h2>{_news.title}</h2>
          <span className="news-date">
            Dodano: {formatDate(_news.created_at)}
          </span>
          <div
            className="news-content"
            dangerouslySetInnerHTML={{ __html: _news.content }}
          />
        </div>
      ))}
    </div>
  );
};

export default News;

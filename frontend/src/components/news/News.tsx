import './News.css';
import service, { Inews } from '../../services/db';
import { useEffect, useState } from 'react';
import LoadingScreen from '../common/loadingScreen/LoadingScreen';
import PageTitle from '../common/pageTitle/PageTitle';

const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

const NewsItem = ({ news }: { news: Inews }) => (
  <article className="news-item">
    <header>
      <h2>{news.title}</h2>
      <time className="news-date" dateTime={news.created_at}>
        Dodano: {formatDate(news.created_at)}
      </time>
    </header>
    <div
      className="news-content"
      dangerouslySetInnerHTML={{ __html: news.content }}
    />
  </article>
);

const News = (): JSX.Element => {
  const [loading, setLoading] = useState<boolean>(false);
  const [news, setNews] = useState<Inews[]>([]);

  useEffect(() => {
    setLoading(true);

    service
      .getNews()
      .then((data: Inews[]) => {
        setNews(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load news:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <section className="News">
      <PageTitle title="Aktualności" />
      {news.length > 0 ? (
        <div className="news-list">
          {news.map((item) => (
            <NewsItem key={item.id} news={item} />
          ))}
        </div>
      ) : (
        <p className="no-news">Brak aktualności</p>
      )}
    </section>
  );
};

export default News;

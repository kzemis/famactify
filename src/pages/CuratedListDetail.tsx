import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function CuratedListDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(slug ? `/activities?list=${encodeURIComponent(slug)}` : '/activities', { replace: true });
  }, [navigate, slug]);

  return null;
}

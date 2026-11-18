import { useEffect, useRef, useState } from 'react';
import { useCommunity } from './context.js';
import { startExperienceReading } from './analytics.js';

export default function ExperienceReader({ publication, source }) {
  const { request, userId } = useCommunity();
  const [open, setOpen] = useState(false);
  return <div><button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? 'Свернуть рассказ' : 'Читать рассказ'}</button>{open && <ReadingText publication={publication} source={source} request={request} track={Number(userId) !== Number(publication.user_id)} />}</div>;
}
function ReadingText({ publication, source, request, track }) {
  const element = useRef(null);
  useEffect(() => {
    if (!track) return;
    let visible = false;
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting); }) : null;
    observer?.observe(element.current);
    const stop = startExperienceReading({ request, experienceId: publication.id, source, isVisible: () => visible });
    return () => { stop(); observer?.disconnect(); };
  }, [request, publication.id, source, track]);
  return <p className="community-text" ref={element}>{publication.text}</p>;
}

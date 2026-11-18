import { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useCommunity } from './context.js';
import { usePlatform } from '../platform/usePlatform.js';
import { useResource } from './useResource.js';
import { interactionSource, httpsContact } from './rules.js';
import { sendInteraction } from './analytics.js';
import PublicationList from './PublicationList.jsx';
import './Community.css';

export default function MemberProfile() {
  const { enabled } = useCommunity();
  const { userId } = useParams();
  if (!enabled) return <p className="community">Профили участников пока недоступны для вашего аккаунта.</p>;
  if (!/^[1-9]\d*$/.test(userId)) return <p className="community">Некорректный адрес профиля.</p>;
  return <LoadedProfile key={userId} profileId={userId} />;
}
function LoadedProfile({ profileId }) {
  const { request, userId, isAdmin } = useCommunity();
  const { search } = useLocation();
  const source = interactionSource(search);
  const { openLink } = usePlatform();
  const load = useCallback(() => request(`/member-profiles/${profileId}`), [request, profileId]);
  const { data: profile, loading, error, reload } = useResource(load);
  const own = Number(profileId) === Number(userId);
  const viewed = useRef(null);
  useEffect(() => {
    if (!profile || own || viewed.current) return;
    viewed.current = crypto.randomUUID();
    void sendInteraction(request, { id: viewed.current, kind: 'profile_view', profile_user_id: Number(profileId), source });
  }, [profile, own, request, profileId, source]);
  return <main className="community"><Link to="/">← К мероприятиям</Link>
    {loading ? <p role="status">Загрузка профиля…</p> : error ? <div role="alert">{error.status === 404 ? 'Профиль не опубликован или недоступен.' : error.message}<button onClick={reload}>Повторить</button></div> : <>
      <section className="community-card">
        {profile.photo_url && <img className="community-avatar" src={profile.photo_url} alt="" referrerPolicy="no-referrer" />}
        <h1>{profile.name}</h1>{own && <Link to="/members/me/edit">Редактировать профиль</Link>}
        {profile.position && <p>{profile.position}</p>}{profile.company && <p>{profile.company}</p>}
        {profile.about && <p className="community-text">{profile.about}</p>}{profile.interests && <p className="community-text">Интересы: {profile.interests}</p>}
        {httpsContact(profile.contact_url) && <a href={profile.contact_url} onClick={e => { e.preventDefault(); if (!own) void sendInteraction(request, { id: crypto.randomUUID(), kind: 'contact_click_intent', profile_user_id: Number(profileId), source }); openLink(profile.contact_url); }}>{profile.contact_label || 'Связаться'}</a>}
        {isAdmin && <p className="community-hint"><Link to="/moderation">Снять профиль через модерацию</Link>: нужен ID записи из очереди, а не user_id {profileId}.</p>}
      </section>
      <PublicationList path={`/member-profiles/${profileId}/recommendations`} kind="recommendation" source={source === 'companions' ? source : 'profile'} profileUserId={profileId} />
      <PublicationList path={`/member-profiles/${profileId}/experiences`} kind="experience" source={source === 'companions' ? source : 'profile'} profileUserId={profileId} />
    </>}
  </main>;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Globe, MessageCircle, Pencil, Send, Shield } from 'lucide-react';
import { useCommunity } from './context.js';
import { usePlatform } from '../platform/usePlatform.js';
import { useResource } from './useResource.js';
import { interactionSource, httpsContact } from './rules.js';
import { describeContact } from './contact.js';
import { Avatar, PageHeader } from './CommunityUI.jsx';
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
  const contact = describeContact(profile?.contact_url);
  const ContactIcon = contact.type === 'telegram' ? Send : contact.type === 'max' ? MessageCircle : Globe;
  return <main className="community"><PageHeader title="Профиль участника">{own && <Link className="community-icon-button" to="/members/me/edit" aria-label="Редактировать профиль"><Pencil size={17} /></Link>}</PageHeader>
    {loading ? <p className="community-loading" role="status">Загрузка профиля…</p> : error ? <div className="community-empty" role="alert"><h2>Профиль недоступен</h2><p>{error.status === 404 ? 'Профиль не опубликован или недоступен.' : error.message}</p><button className="community-button--secondary" onClick={reload}>Повторить</button></div> : <>
      <section className="community-card community-profile-card">
        <div className="community-identity"><Avatar name={profile.name} photoUrl={profile.photo_url} /><div><h2>{profile.name}</h2>{profile.position && <p>{profile.position}</p>}{profile.company && <p>{profile.company}</p>}</div></div>
        {profile.about && <p className="community-text">{profile.about}</p>}
        {profile.interests && <div className="community-interest-chips">{profile.interests.split(',').map((interest, index) => interest.trim() && <span key={index}>{interest.trim()}</span>)}</div>}
        {httpsContact(profile.contact_url) && <div className="community-profile-contact"><a className="community-button community-button--primary" href={profile.contact_url} onClick={e => { e.preventDefault(); if (!own) void sendInteraction(request, { id: crypto.randomUUID(), kind: 'contact_click_intent', profile_user_id: Number(profileId), source }); openLink(profile.contact_url); }}><ContactIcon size={17} aria-hidden="true" />{profile.contact_label || contact.action}</a><span>{contact.display}</span></div>}
      </section>
      <PublicationTabs profileId={profileId} source={source === 'companions' ? source : 'profile'} />
      {isAdmin && <details className="community-admin-tools"><summary><Shield size={14} aria-hidden="true" />Действия администратора</summary><p className="community-hint"><Link to="/moderation">Снять профиль через модерацию</Link>: нужен ID записи из очереди, а не user_id {profileId}.</p></details>}
    </>}
  </main>;
}
function PublicationTabs({ profileId, source }) {
  const [active, setActive] = useState('recommendation');
  const [recommendations, setRecommendations] = useState(null);
  const [experiences, setExperiences] = useState(null);
  return <div className="community-profile-publications">
    <div className="community-tabs" role="tablist" aria-label="Публикации участника">
      <button role="tab" id="member-recommendations-tab" aria-controls="member-recommendations" aria-selected={active === 'recommendation'} onClick={() => setActive('recommendation')}>Рекомендации{recommendations !== null && <span className="community-count">{recommendations}</span>}</button>
      <button role="tab" id="member-experiences-tab" aria-controls="member-experiences" aria-selected={active === 'experience'} onClick={() => setActive('experience')}>Рассказы{experiences !== null && <span className="community-count">{experiences}</span>}</button>
    </div>
    <div role="tabpanel" id="member-recommendations" aria-labelledby="member-recommendations-tab" hidden={active !== 'recommendation'}><PublicationList path={`/member-profiles/${profileId}/recommendations`} kind="recommendation" source={source} profileUserId={profileId} onCount={setRecommendations} compact /></div>
    <div role="tabpanel" id="member-experiences" aria-labelledby="member-experiences-tab" hidden={active !== 'experience'}><PublicationList path={`/member-profiles/${profileId}/experiences`} kind="experience" source={source} profileUserId={profileId} onCount={setExperiences} compact /></div>
  </div>;
}

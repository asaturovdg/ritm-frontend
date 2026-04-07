import { useState } from 'react';
import { Tabbar, List, Section, Cell, Headline } from '@telegram-apps/telegram-ui';
import EventsDigest from './components/eventsDigest/EventsDigest';
export default function App() {
  
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div > 
      
      <EventsDigest/>
      <Tabbar className=''>
        <Tabbar.Item 
          text="Дайджест" 
          selected={activeTab === 'events'} 
          onClick={() => setActiveTab('events')} 
        />
        
      </Tabbar>
      
    </div>
  );
}

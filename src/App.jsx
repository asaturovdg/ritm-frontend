import { useState } from 'react';
import { Tabbar, List, Section, Cell, Headline } from '@telegram-apps/telegram-ui';
import { Routes, Route } from 'react-router-dom';
import EventsDigest from './components/eventsDigest/EventsDigest';
import Event from './pages/eventPage/Event';
export default function App() {
  
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div > 
      <Routes>
        <Route path='/' element={<EventsDigest/>}/>
        <Route path='/events/:id' element={<Event/>}/>
      </Routes>
      
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
